/**
 * Serialization and deserialization of Beings.
 *
 * The library doesn't handle persistence — consumers do.
 * This module converts Beings to/from plain JSON-safe objects
 * so consumers can persist them however they like.
 *
 * Note: custom drift/decay compute functions and matcher predicates
 * cannot be serialized. Consumers using custom functions must
 * re-attach them after deserialization.
 */

import type {
  Being,
  DecayFunction,
  DriftFunction,
  Drive,
  DriveStack,
  History,
  Practice,
} from "../types.js";

/**
 * A JSON-safe representation of a Being's state.
 * Does not include function-valued fields (custom drift/decay compute,
 * matcher predicates). Those must be re-attached by the consumer.
 */
export interface SerializedBeing {
  id: string;
  name: string;
  drives: SerializedDriveStack;
  practices: SerializedPracticeSet;
  subscriptions: Being["subscriptions"];
  capabilities: Being["capabilities"];
  history: History;
  elapsedMs: number;
  metadata: Record<string, unknown>;
}

interface SerializedDrive {
  id: string;
  name: string;
  description: string;
  tier: number;
  weight: number;
  level: number;
  target: number;
  drift: SerializedDriftFunction;
}

type SerializedDriftFunction =
  | { kind: "linear"; ratePerHour: number }
  | { kind: "exponential"; halfLifeHours: number }
  | { kind: "custom" };

interface SerializedDriveStack {
  drives: SerializedDrive[];
  tierCount: number;
  dominationRules: DriveStack["dominationRules"];
}

interface SerializedPractice {
  id: string;
  name: string;
  description: string;
  depth: number;
  decay: SerializedDecayFunction;
}

type SerializedDecayFunction =
  | { kind: "linear"; ratePerHour: number }
  | { kind: "exponential"; halfLifeHours: number }
  | { kind: "custom" };

interface SerializedPracticeSet {
  practices: SerializedPractice[];
}

/**
 * Serializes a Being into a JSON-safe object.
 *
 * Custom compute functions are replaced with `{ kind: "custom" }` markers.
 * Satiation bindings and practice strengtheners are stripped since they
 * contain functions (predicates). Consumers must re-attach these after
 * deserialization by merging with their original config.
 */
export function serializeBeing(being: Being): SerializedBeing {
  const drives: SerializedDrive[] = [];
  for (const drive of being.drives.drives.values()) {
    drives.push({
      id: drive.id,
      name: drive.name,
      description: drive.description,
      tier: drive.tier,
      weight: drive.weight,
      level: drive.level,
      target: drive.target,
      drift: serializeDrift(drive.drift),
    });
  }

  const practices: SerializedPractice[] = [];
  for (const practice of being.practices.practices.values()) {
    practices.push({
      id: practice.id,
      name: practice.name,
      description: practice.description,
      depth: practice.depth,
      decay: serializeDecay(practice.decay),
    });
  }

  return {
    id: being.id,
    name: being.name,
    drives: {
      drives,
      tierCount: being.drives.tierCount,
      dominationRules: being.drives.dominationRules,
    },
    practices: { practices },
    subscriptions: being.subscriptions,
    capabilities: being.capabilities,
    history: JSON.parse(JSON.stringify(being.history)) as History,
    elapsedMs: being.elapsedMs,
    metadata: being.metadata as Record<string, unknown>,
  };
}

/**
 * Deserializes a Being from a serialized representation.
 *
 * The returned Being will have empty satiation bindings and practice
 * strengtheners. Consumers must merge these from their original config
 * if they need event-driven behavior to continue working.
 *
 * Custom drift/decay functions become no-ops (identity functions).
 * Consumers should replace these with their actual implementations.
 */
export function deserializeBeing(data: SerializedBeing): Being {
  const driveMap = new Map<string, Drive>();
  for (const d of data.drives.drives) {
    driveMap.set(d.id, {
      id: d.id,
      name: d.name,
      description: d.description,
      tier: d.tier,
      weight: d.weight,
      level: d.level,
      target: d.target,
      drift: deserializeDrift(d.drift),
      satiatedBy: [],
    });
  }

  const practiceMap = new Map<string, Practice>();
  for (const p of data.practices.practices) {
    practiceMap.set(p.id, {
      id: p.id,
      name: p.name,
      description: p.description,
      depth: p.depth,
      decay: deserializeDecay(p.decay),
      strengthens: [],
      effects: [],
    });
  }

  return {
    id: data.id,
    name: data.name,
    drives: {
      drives: driveMap,
      tierCount: data.drives.tierCount,
      dominationRules: data.drives.dominationRules,
    },
    practices: { practices: practiceMap },
    subscriptions: data.subscriptions,
    capabilities: data.capabilities,
    history: JSON.parse(JSON.stringify(data.history)) as History,
    elapsedMs: data.elapsedMs,
    metadata: data.metadata,
  };
}

function serializeDrift(drift: DriftFunction): SerializedDriftFunction {
  switch (drift.kind) {
    case "linear":
      return { kind: "linear", ratePerHour: drift.ratePerHour };
    case "exponential":
      return { kind: "exponential", halfLifeHours: drift.halfLifeHours };
    case "custom":
      return { kind: "custom" };
  }
}

function deserializeDrift(drift: SerializedDriftFunction): DriftFunction {
  switch (drift.kind) {
    case "linear":
      return { kind: "linear", ratePerHour: drift.ratePerHour };
    case "exponential":
      return { kind: "exponential", halfLifeHours: drift.halfLifeHours };
    case "custom":
      return { kind: "custom", compute: (current) => current };
  }
}

function serializeDecay(decay: DecayFunction): SerializedDecayFunction {
  switch (decay.kind) {
    case "linear":
      return { kind: "linear", ratePerHour: decay.ratePerHour };
    case "exponential":
      return { kind: "exponential", halfLifeHours: decay.halfLifeHours };
    case "custom":
      return { kind: "custom" };
  }
}

function deserializeDecay(decay: SerializedDecayFunction): DecayFunction {
  switch (decay.kind) {
    case "linear":
      return { kind: "linear", ratePerHour: decay.ratePerHour };
    case "exponential":
      return { kind: "exponential", halfLifeHours: decay.halfLifeHours };
    case "custom":
      return { kind: "custom", compute: (current) => current };
  }
}
