/**
 * Practice attempts: phase 1 of the two-phase evaluation mechanic.
 *
 * When `integrate()` matches a trigger, no depth changes — instead, a
 * PracticeAttempt is recorded with rich context for the framework to
 * evaluate. Depth changes only when the framework calls `resolveAttempt()`.
 */

import type {
  Artifact,
  Being,
  BeingState,
  IntegrationAction,
  IntegrationEvent,
  Practice,
  PracticeAttempt,
  PracticeAttemptContext,
  RecentEntry,
} from "../types.js";
import { computeDepth } from "./depth.js";
import { triggerMatches } from "./triggers.js";

const DEFAULT_CONTEXT_ENTRIES = 50;
const DEFAULT_CONTEXT_AGE_MS = 24 * 3_600_000;
const DEFAULT_RELATED_SUBSTRATE_PER_PRACTICE = 3;

/**
 * Generates a unique attempt id. Uses Web Crypto's randomUUID where
 * available (Node 19+, all modern browsers); falls back to a simple
 * timestamp + random hex for environments that don't expose it.
 */
function newAttemptId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Records practice attempts for any triggers matched by this entry.
 *
 * Mutates `being.pendingAttempts`. Returns the IDs of new attempts.
 */
export function recordAttempts(
  being: Being,
  entry: IntegrationEvent | IntegrationAction,
  underPressure: boolean,
  pressingDriveIds: readonly string[],
): readonly string[] {
  const state: BeingState = {
    drives: being.drives,
    practices: being.practices,
    wear: being.wear,
  };
  const newAttempts: PracticeAttempt[] = [];

  for (const practice of being.practices.practices.values()) {
    for (let i = 0; i < practice.protocol.triggers.length; i++) {
      const trigger = practice.protocol.triggers[i]!;
      if (triggerMatches(trigger, entry, underPressure, state)) {
        newAttempts.push(createAttempt(being, practice, i, entry, underPressure, pressingDriveIds));
      }
    }
  }

  if (newAttempts.length === 0) return [];

  being.pendingAttempts = [...being.pendingAttempts, ...newAttempts];
  return newAttempts.map((a) => a.id);
}

function createAttempt(
  being: Being,
  practice: Practice,
  triggerIndex: number,
  entry: IntegrationEvent | IntegrationAction,
  underPressure: boolean,
  pressingDriveIds: readonly string[],
): PracticeAttempt {
  const trigger = practice.protocol.triggers[triggerIndex]!;
  const context = buildContext(being, practice, trigger.intent, underPressure, pressingDriveIds);

  return {
    id: newAttemptId(),
    practiceId: practice.id,
    triggerIndex,
    triggeredBy: entry,
    proposedAmount: trigger.maxContribution,
    attemptedAtMs: being.elapsedMs,
    underPressure,
    context,
    status: "pending",
  };
}

function buildContext(
  being: Being,
  practice: Practice,
  triggerIntent: string,
  underPressure: boolean,
  pressingDriveIds: readonly string[],
): PracticeAttemptContext {
  const window = practice.protocol.contextWindow;
  const maxEntries = window.entries ?? DEFAULT_CONTEXT_ENTRIES;
  const maxAgeMs = window.maxAgeMs ?? DEFAULT_CONTEXT_AGE_MS;
  const includeTrajectory = window.includeTrajectory ?? true;
  const includeRelated = window.includeRelatedSubstrate ?? false;

  const driveLevels: Record<string, number> = {};
  for (const [id, drive] of being.drives.drives) {
    driveLevels[id] = drive.level;
  }

  const practiceDepths: Record<string, number> = {};
  for (const [id, p] of being.practices.practices) {
    practiceDepths[id] = computeDepth(p, being.elapsedMs);
  }

  const cutoff = being.elapsedMs - maxAgeMs;

  const recentEntries: RecentEntry[] = [];
  const allEntries = being.history.recentEntries;
  for (let i = allEntries.length - 1; i >= 0 && recentEntries.length < maxEntries; i--) {
    const e = allEntries[i]!;
    if (e.atMs < cutoff) break;
    recentEntries.unshift(e);
  }

  const recentPressuredChoices = being.history.pressuredChoices.filter((c) => c.atMs >= cutoff);

  const recentTrajectory = includeTrajectory
    ? being.history.driveTrajectory.filter((p) => p.atMs >= cutoff)
    : [];

  const relatedSubstrate: Array<{ practiceId: string; artifacts: readonly Artifact[] }> = [];
  if (includeRelated) {
    for (const [id, p] of being.practices.practices) {
      if (id === practice.id) continue;
      const recent = p.substrate.artifacts.slice(-DEFAULT_RELATED_SUBSTRATE_PER_PRACTICE);
      if (recent.length > 0) {
        relatedSubstrate.push({ practiceId: id, artifacts: recent });
      }
    }
  }

  return {
    practice: {
      id: practice.id,
      name: practice.name,
      description: practice.description,
      intent: practice.intent,
      currentDepth: computeDepth(practice, being.elapsedMs),
      seed: practice.seed,
    },
    triggerIntent,
    driveLevels,
    practiceDepths,
    underPressure,
    pressingDriveIds,
    recentEntries,
    recentPressuredChoices,
    recentTrajectory,
    relatedSubstrate,
  };
}

/**
 * Returns all currently-pending attempts for the being.
 */
export function getPendingAttempts(being: Being): readonly PracticeAttempt[] {
  return being.pendingAttempts.filter((a) => a.status === "pending");
}

/**
 * Returns a specific attempt by id, or undefined if not found.
 */
export function getAttempt(being: Being, attemptId: string): PracticeAttempt | undefined {
  return being.pendingAttempts.find((a) => a.id === attemptId);
}

/**
 * Drops attempts older than `olderThanMs` (relative to the being's current
 * elapsed time). Removes attempts in any status — pending, resolved, or
 * rejected — that have aged past the cutoff.
 *
 * Useful for long-running beings where the pendingAttempts array would
 * otherwise grow unbounded. Frameworks that never call `resolveAttempt`
 * for some attempts can call this to release that memory.
 *
 * Mutates the being. Returns the number of attempts removed.
 */
export function expirePendingAttempts(being: Being, olderThanMs: number): number {
  const cutoff = being.elapsedMs - olderThanMs;
  const before = being.pendingAttempts.length;
  being.pendingAttempts = being.pendingAttempts.filter((a) => a.attemptedAtMs >= cutoff);
  return before - being.pendingAttempts.length;
}
