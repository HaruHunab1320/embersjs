/**
 * Lifecycle functions: the five integration points that consuming
 * frameworks call to interact with a Being.
 *
 * - tick(being, dtMs) — advance time
 * - integrate(being, input) — process events/actions
 * - metabolize(being) — produce inner situation
 * - weightAttention(being, candidates) — weight attention candidates
 * - availableCapabilities(being) — determine accessible capabilities
 *
 * `tick` and `integrate` mutate the Being in place.
 * `metabolize`, `weightAttention`, and `availableCapabilities` are pure reads.
 */

import type {
  Being,
  IntegrationInput,
  IntegrationResult,
  InnerSituation,
  AttentionCandidate,
  WeightedCandidate,
  Capability,
  Orientation,
} from "../types.js";
import { tickDrives } from "../drives/tick.js";
import { satiateDrives } from "../drives/satiate.js";
import { pressingDrives } from "../drives/query.js";
import { tickPractices } from "../practices/tick.js";
import { strengthenPractices } from "../practices/strengthen.js";
import { metabolize as metabolizeInner } from "../metabolism/metabolize.js";
import { weightAttention as weightAttentionInner } from "../metabolism/attention.js";
import { availableCapabilities as availableCapsInner } from "../capabilities/available.js";
import {
  recordTrajectoryPoint,
  recordPressuredChoice,
  recordTransition,
  checkAndRecordMilestones,
} from "./history.js";

/**
 * Advances the being's state by `dtMs` milliseconds.
 *
 * This:
 * - Applies drift to every drive's level
 * - Applies decay to every practice's depth
 * - Records a trajectory point in history
 * - Advances elapsed time
 *
 * **Mutates** the being in place. Call on every tick of your runtime loop.
 */
export function tick(being: Being, dtMs: number): void {
  if (dtMs <= 0) return;

  // Snapshot practice depths before decay (for milestone detection)
  const depthsBefore = new Map<string, number>();
  for (const [id, practice] of being.practices.practices) {
    depthsBefore.set(id, practice.depth);
  }

  // Advance drives and practices
  const nextDrives = tickDrives(being.drives, dtMs);
  const nextPractices = tickPractices(being.practices, dtMs);

  // Apply mutations
  (being as { drives: typeof nextDrives }).drives = nextDrives;
  (being as { practices: typeof nextPractices }).practices = nextPractices;
  being.elapsedMs += dtMs;

  // Record trajectory
  recordTrajectoryPoint(being);

  // Check for practice milestones from decay
  for (const [id, practice] of being.practices.practices) {
    const before = depthsBefore.get(id);
    if (before !== undefined) {
      checkAndRecordMilestones(being, id, before, practice.depth);
    }
  }
}

/**
 * Integrates an event or action into the being's state.
 *
 * This:
 * - Matches the event/action against drive satiation bindings
 * - Matches against practice strengtheners (respecting pressure gating)
 * - Records pressured choices in history
 * - Records practice milestones
 *
 * **Mutates** the being in place. Returns a diff of what changed.
 */
export function integrate(being: Being, input: IntegrationInput): IntegrationResult {
  const entry = input.entry;

  // Satiate drives
  const { stack: nextDrives, changes: driveChanges } = satiateDrives(being.drives, entry);
  (being as { drives: typeof nextDrives }).drives = nextDrives;

  // Strengthen practices
  const { set: nextPractices, changes: practiceChanges } = strengthenPractices(
    being.practices,
    entry,
    being.drives,
  );
  (being as { practices: typeof nextPractices }).practices = nextPractices;

  // Record practice milestones
  for (const change of practiceChanges) {
    checkAndRecordMilestones(being, change.practiceId, change.before, change.after);
  }

  // Record pressured choice if applicable
  const pressured = input.context?.pressured ?? false;
  if (pressured && entry.kind === "action") {
    const pressingIds =
      input.context?.pressingDriveIds ??
      pressingDrives(being.drives, being.drives.dominationRules.threshold).map((d) => d.id);

    recordPressuredChoice(
      being,
      pressingIds,
      entry,
      practiceChanges.map((c) => c.practiceId),
    );
  }

  return {
    driveChanges: driveChanges.map((c) => ({
      driveId: c.driveId,
      before: c.before,
      after: c.after,
    })),
    practiceChanges: practiceChanges.map((c) => ({
      practiceId: c.practiceId,
      before: c.before,
      after: c.after,
    })),
  };
}

/**
 * Metabolizes the being's current state into a prompt-ready InnerSituation.
 *
 * **Pure function** — does not mutate the being.
 * Call before assembling prompts.
 */
export function metabolize(being: Being): InnerSituation {
  return metabolizeInner(being);
}

/**
 * Weights attention candidates based on the being's inner state.
 *
 * **Pure function** — does not mutate the being.
 * Call when multiple things compete for the being's focus.
 */
export function weightAttention(
  being: Being,
  candidates: readonly AttentionCandidate[],
): WeightedCandidate[] {
  return weightAttentionInner(being, candidates);
}

/**
 * Returns the capabilities currently available to the being.
 *
 * **Pure function** — does not mutate the being.
 * Call to determine what resources the being can currently access.
 */
export function availableCapabilities(being: Being): Capability[] {
  return availableCapsInner(being);
}
