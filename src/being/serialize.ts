/**
 * Serialization and deserialization of Beings.
 *
 * The library doesn't handle persistence — consumers do. This module
 * converts Beings to/from plain JSON-safe objects.
 *
 * What roundtrips faithfully:
 * - Drive levels, targets, weights, tiers, drift kind+params
 * - Practice substrate (artifacts), depth derives from substrate
 * - Pending attempts (full context preserved)
 * - Wear state, chronic trackers, wear config
 * - History (trajectory, recent entries, milestones, choices, transitions)
 *
 * What does NOT roundtrip:
 * - Function-valued fields: matcher predicates, custom drift/decay/depth
 *   functions. After deserialization these are stripped; consumers must
 *   re-apply their original config to restore live behavior.
 *
 * The recommended pattern: persist state, then on load do
 *   `const fresh = createBeing(originalConfig);`
 *   `applyState(fresh, deserializedState);`
 * to restore predicates while keeping the persisted state.
 */

import type {
  Artifact,
  Being,
  Capability,
  ChronicTracker,
  CustomPracticeConfig,
  DepthFunction,
  DriftFunction,
  Drive,
  DriveStack,
  History,
  IntegrationAction,
  IntegrationEvent,
  Practice,
  PracticeAttempt,
  PracticeAttemptContext,
  PracticeProtocol,
  PracticeSubstrate,
  PracticeTrigger,
  SatiationBinding,
  Subscription,
  WearConfig,
  WearState,
} from "../types.js";
import { mergeWearConfig } from "../wear/config.js";

// ---------------------------------------------------------------------------
// Serialized shape
// ---------------------------------------------------------------------------

type SerializedDrift =
  | { kind: "linear"; ratePerHour: number }
  | { kind: "exponential"; halfLifeHours: number }
  | { kind: "custom" };

interface SerializedSatiationBinding {
  matches: { kind: "event" | "action"; type: string };
  amount: number;
}

interface SerializedDrive {
  id: string;
  name: string;
  description: string;
  tier: number;
  weight: number;
  level: number;
  target: number;
  drift: SerializedDrift;
  satiatedBy: SerializedSatiationBinding[];
}

interface SerializedDriveStack {
  drives: SerializedDrive[];
  tierCount: number;
  dominationRules: { threshold: number; attentionDampening: number };
}

interface SerializedTrigger {
  matches: { kind: "event"; type: string } | { kind: "action"; type: string } | { kind: "state" };
  requiresPressure: boolean;
  intent: string;
  maxContribution: number;
}

interface SerializedProtocol {
  triggers: SerializedTrigger[];
  contextWindow: PracticeProtocol["contextWindow"];
  artifactMaxAgeMs?: number;
  /** depthFunction is not serialized; default is restored on deserialize. */
}

interface SerializedPractice {
  id: string;
  name: string;
  description: string;
  intent: string;
  protocol: SerializedProtocol;
  substrate: PracticeSubstrate;
  seed?: unknown;
}

interface SerializedPracticeSet {
  practices: SerializedPractice[];
}

interface SerializedWearState {
  perDrive: Array<{ driveId: string; tracker: ChronicTracker }>;
  chronicLoad: number;
}

export interface SerializedBeing {
  id: string;
  name: string;
  drives: SerializedDriveStack;
  practices: SerializedPracticeSet;
  subscriptions: readonly Subscription[];
  capabilities: readonly Capability[];
  wear: SerializedWearState;
  wearConfig: WearConfig;
  pendingAttempts: PracticeAttempt[];
  history: History;
  elapsedMs: number;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

export function serializeBeing(being: Being): SerializedBeing {
  return {
    id: being.id,
    name: being.name,
    drives: serializeDriveStack(being.drives),
    practices: serializePracticeSet(being.practices),
    subscriptions: being.subscriptions,
    capabilities: being.capabilities,
    wear: serializeWear(being.wear),
    wearConfig: being.wearConfig,
    pendingAttempts: stripAttemptFunctions(being.pendingAttempts),
    history: cloneJson(being.history) as History,
    elapsedMs: being.elapsedMs,
    metadata: being.metadata as Record<string, unknown>,
  };
}

function serializeDriveStack(stack: DriveStack): SerializedDriveStack {
  const drives: SerializedDrive[] = [];
  for (const d of stack.drives.values()) {
    drives.push({
      id: d.id,
      name: d.name,
      description: d.description,
      tier: d.tier,
      weight: d.weight,
      level: d.level,
      target: d.target,
      drift: serializeDrift(d.drift),
      satiatedBy: d.satiatedBy.map(serializeSatiationBinding),
    });
  }
  return {
    drives,
    tierCount: stack.tierCount,
    dominationRules: stack.dominationRules,
  };
}

function serializeDrift(drift: DriftFunction): SerializedDrift {
  switch (drift.kind) {
    case "linear":
      return { kind: "linear", ratePerHour: drift.ratePerHour };
    case "exponential":
      return { kind: "exponential", halfLifeHours: drift.halfLifeHours };
    case "custom":
      return { kind: "custom" };
  }
}

function serializeSatiationBinding(b: SatiationBinding): SerializedSatiationBinding {
  return {
    matches: { kind: b.matches.kind, type: b.matches.type },
    amount: b.amount,
  };
}

function serializePracticeSet(set: { practices: Map<string, Practice> }): SerializedPracticeSet {
  const practices: SerializedPractice[] = [];
  for (const p of set.practices.values()) {
    practices.push({
      id: p.id,
      name: p.name,
      description: p.description,
      intent: p.intent,
      protocol: serializeProtocol(p.protocol),
      substrate: p.substrate,
      seed: p.seed,
    });
  }
  return { practices };
}

function serializeProtocol(protocol: PracticeProtocol): SerializedProtocol {
  return {
    triggers: protocol.triggers.map(serializeTrigger),
    contextWindow: protocol.contextWindow,
    artifactMaxAgeMs: protocol.artifactMaxAgeMs,
  };
}

function serializeTrigger(t: PracticeTrigger): SerializedTrigger {
  const m = t.matches;
  let matches: SerializedTrigger["matches"];
  if (m.kind === "state") {
    matches = { kind: "state" };
  } else {
    matches = { kind: m.kind, type: m.type };
  }
  return {
    matches,
    requiresPressure: t.requiresPressure,
    intent: t.intent,
    maxContribution: t.maxContribution,
  };
}

function serializeWear(wear: WearState): SerializedWearState {
  const perDrive: SerializedWearState["perDrive"] = [];
  for (const [driveId, tracker] of wear.perDrive) {
    perDrive.push({ driveId, tracker });
  }
  return { perDrive, chronicLoad: wear.chronicLoad };
}

function stripAttemptFunctions(attempts: readonly PracticeAttempt[]): PracticeAttempt[] {
  // Attempts contain context with no functions; safe to deep-clone.
  return cloneJson(attempts) as PracticeAttempt[];
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ---------------------------------------------------------------------------
// Deserialization
// ---------------------------------------------------------------------------

/**
 * Deserializes a Being from a JSON-safe object.
 *
 * Restores all data faithfully. Function-valued fields (matcher predicates,
 * custom drift/depth functions) are stripped — predicates become absent
 * (matches still work by type), custom drift becomes identity, custom depth
 * becomes the default depth function.
 *
 * Consumers needing full fidelity should re-apply their original config
 * after calling this.
 */
export function deserializeBeing(data: SerializedBeing): Being {
  const drives = deserializeDriveStack(data.drives);
  const practices = deserializePracticeSet(data.practices);
  const wear = deserializeWear(data.wear);
  const wearConfig = mergeWearConfig(data.wearConfig);

  return {
    id: data.id,
    name: data.name,
    drives,
    practices,
    subscriptions: data.subscriptions,
    capabilities: data.capabilities,
    wear,
    pendingAttempts: cloneJson(data.pendingAttempts) as PracticeAttempt[],
    wearConfig,
    history: cloneJson(data.history) as History,
    elapsedMs: data.elapsedMs,
    metadata: data.metadata,
  };
}

function deserializeDriveStack(s: SerializedDriveStack): DriveStack {
  const drives = new Map<string, Drive>();
  for (const d of s.drives) {
    drives.set(d.id, {
      id: d.id,
      name: d.name,
      description: d.description,
      tier: d.tier,
      weight: d.weight,
      level: d.level,
      target: d.target,
      drift: deserializeDrift(d.drift),
      satiatedBy: d.satiatedBy.map((b) => ({
        matches: { kind: b.matches.kind, type: b.matches.type },
        amount: b.amount,
      })) as readonly SatiationBinding[],
    });
  }
  return {
    drives,
    tierCount: s.tierCount,
    dominationRules: s.dominationRules,
  };
}

function deserializeDrift(d: SerializedDrift): DriftFunction {
  switch (d.kind) {
    case "linear":
      return { kind: "linear", ratePerHour: d.ratePerHour };
    case "exponential":
      return { kind: "exponential", halfLifeHours: d.halfLifeHours };
    case "custom":
      return { kind: "custom", compute: (current) => current };
  }
}

function deserializePracticeSet(s: SerializedPracticeSet): { practices: Map<string, Practice> } {
  const practices = new Map<string, Practice>();
  for (const p of s.practices) {
    practices.set(p.id, {
      id: p.id,
      name: p.name,
      description: p.description,
      intent: p.intent,
      protocol: deserializeProtocol(p.protocol),
      substrate: p.substrate,
      seed: p.seed,
    });
  }
  return { practices };
}

function deserializeProtocol(s: SerializedProtocol): PracticeProtocol {
  return {
    triggers: s.triggers.map(deserializeTrigger),
    contextWindow: s.contextWindow,
    artifactMaxAgeMs: s.artifactMaxAgeMs,
    // depthFunction omitted — default is used when computing depth
  };
}

function deserializeTrigger(s: SerializedTrigger): PracticeTrigger {
  if (s.matches.kind === "state") {
    return {
      matches: { kind: "state", predicate: () => false },
      requiresPressure: s.requiresPressure,
      intent: s.intent,
      maxContribution: s.maxContribution,
    };
  }
  return {
    matches: { kind: s.matches.kind, type: s.matches.type },
    requiresPressure: s.requiresPressure,
    intent: s.intent,
    maxContribution: s.maxContribution,
  };
}

function deserializeWear(s: SerializedWearState): WearState {
  const perDrive = new Map<string, ChronicTracker>();
  for (const entry of s.perDrive) {
    perDrive.set(entry.driveId, entry.tracker);
  }
  return { perDrive, chronicLoad: s.chronicLoad };
}

// Suppress the unused imports — they're declared for type clarity in the
// serialized shapes above.
type _Unused =
  | Artifact
  | DepthFunction
  | IntegrationAction
  | IntegrationEvent
  | PracticeAttemptContext
  | CustomPracticeConfig;
