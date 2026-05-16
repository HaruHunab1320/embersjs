/**
 * Lifecycle: the public integration surface for consuming frameworks.
 *
 * Five primary functions:
 * - tick(being, dtMs)            — advance time, update drives/wear/practices
 * - integrate(being, input)      — process an event/action
 * - metabolize(being, opts?)     — produce InnerSituation
 * - weightAttention(being, …)    — rank candidates
 * - availableCapabilities(being) — gate access
 *
 * Auxiliaries for the two-phase practice mechanic:
 * - getPendingAttempts(being)
 * - resolveAttempt(being, id, result)
 * - resolveAllPending(being, evaluate)
 * - getSelfModel(being)
 *
 * `tick`, `integrate`, and `resolveAttempt` mutate the Being. The rest are
 * pure reads.
 */

import { availableCapabilities as availableCapsInner } from "../capabilities/available.js";
import { pressingDrives } from "../drives/query.js";
import { satiateDrives } from "../drives/satiate.js";
import { tickDrives } from "../drives/tick.js";
import { weightAttention as weightAttentionInner } from "../metabolism/attention.js";
import { metabolize as metabolizeInner } from "../metabolism/metabolize.js";
import {
  expirePendingAttempts as expirePendingAttemptsInner,
  getPendingAttempts as getPendingAttemptsInner,
  recordAttempts,
} from "../practices/attempt.js";
import { computeDepth } from "../practices/depth.js";
import { resolveAttempt as resolveAttemptInner } from "../practices/resolve.js";
import { tickPractices } from "../practices/tick.js";
import type {
  AttemptResolution,
  AttentionCandidate,
  Being,
  Capability,
  InnerSituation,
  IntegrationInput,
  IntegrationResult,
  MetabolizeOptions,
  PracticeAttempt,
  PracticeAttemptResult,
  SelfModel,
  WeightedCandidate,
} from "../types.js";
import { tickWear } from "../wear/tick.js";
import {
  checkAndRecordMilestones,
  recordPressuredChoice,
  recordRecentEntry,
  recordTrajectoryPoint,
} from "./history.js";
import { buildSelfModel } from "./self-model.js";

/**
 * Advances the being's state by `dtMs` milliseconds.
 *
 * - Applies drive drift
 * - Updates wear (chronic state trackers and chronicLoad)
 * - Runs practice housekeeping (artifact eviction, accelerated by wear)
 * - Records a drive-trajectory point
 * - Records practice milestones for any threshold crossings caused by
 *   recency-factor depth changes
 *
 * **Mutates** the being.
 */
export function tick(being: Being, dtMs: number): void {
  if (dtMs <= 0) return;

  // Snapshot practice depths at start (for milestone detection across the tick)
  const depthsBefore = new Map<string, number>();
  for (const [id, practice] of being.practices.practices) {
    depthsBefore.set(id, computeDepth(practice, being.elapsedMs));
  }

  // Advance drives and time
  being.drives = tickDrives(being.drives, dtMs);
  being.elapsedMs += dtMs;

  // Update wear (now that drive levels are post-drift)
  being.wear = tickWear(being.wear, being.drives, dtMs, being.wearConfig);

  // Practice housekeeping
  tickPractices(being.practices, being.elapsedMs, being.wear, being.wearConfig.erosionFactor);

  // Record drive trajectory
  recordTrajectoryPoint(being);

  // Check for practice milestones from recency-factor depth shifts
  for (const [id, practice] of being.practices.practices) {
    const before = depthsBefore.get(id);
    if (before === undefined) continue;
    const after = computeDepth(practice, being.elapsedMs);
    checkAndRecordMilestones(being, id, before, after);
  }
}

/**
 * Integrates an event or action into the being's state.
 *
 * - Records the entry in `history.recentEntries`
 * - Satiates drives (matching drives' levels rise)
 * - Records pending practice attempts (NO depth change)
 * - Records a pressured choice if the entry is an action under pressure
 *
 * Practice depth changes only via `resolveAttempt`. **Mutates** the being.
 */
export function integrate(being: Being, input: IntegrationInput): IntegrationResult {
  const entry = input.entry;

  // Record the experience
  recordRecentEntry(being, entry);

  // Determine pressure context
  const pressingFromState = pressingDrives(being.drives, being.drives.dominationRules.threshold);
  const pressingDriveIds = input.context?.pressingDriveIds ?? pressingFromState.map((d) => d.id);
  const underPressure = input.context?.pressured ?? pressingFromState.length > 0;

  // Satiate drives (the v0.1-style mechanic — drive levels rise on match)
  const { stack: nextDrives, changes: driveChanges } = satiateDrives(being.drives, entry);
  being.drives = nextDrives;

  // Record practice attempts (phase 1 — no depth change here)
  const pendingAttemptIds = recordAttempts(being, entry, underPressure, pressingDriveIds);

  // Record a pressured choice for action-entries under pressure
  if (underPressure && entry.kind === "action") {
    recordPressuredChoice(being, pressingDriveIds, entry, pendingAttemptIds);
  }

  return {
    driveChanges: driveChanges.map((c) => ({
      driveId: c.driveId,
      before: c.before,
      after: c.after,
    })),
    pendingAttemptIds,
  };
}

/**
 * Metabolizes the being's current state into an InnerSituation.
 *
 * **Pure** — does not mutate.
 */
export function metabolize(being: Being, options?: MetabolizeOptions): InnerSituation {
  return metabolizeInner(being, options);
}

/**
 * Weights attention candidates by relevance to inner state. **Pure**.
 */
export function weightAttention(
  being: Being,
  candidates: readonly AttentionCandidate[],
): WeightedCandidate[] {
  return weightAttentionInner(being, candidates);
}

/**
 * Returns capabilities currently available to the being. **Pure**.
 */
export function availableCapabilities(being: Being): Capability[] {
  return availableCapsInner(being);
}

/**
 * Returns currently-pending practice attempts. **Pure**.
 */
export function getPendingAttempts(being: Being): readonly PracticeAttempt[] {
  return getPendingAttemptsInner(being);
}

/**
 * Drops practice attempts older than `olderThanMs` from the being. Useful
 * for long-running consumers that don't resolve every attempt and want to
 * keep the pendingAttempts array bounded.
 *
 * **Mutates** the being. Returns the number of attempts removed.
 */
export function expirePendingAttempts(being: Being, olderThanMs: number): number {
  return expirePendingAttemptsInner(being, olderThanMs);
}

/**
 * Resolves a pending practice attempt with a quality verdict from the framework.
 *
 * If accepted (and quality > 0), creates an Artifact and adds it to the
 * practice's substrate. Records a practice milestone if depth crosses a
 * threshold. **Mutates** the being.
 */
export function resolveAttempt(
  being: Being,
  attemptId: string,
  result: PracticeAttemptResult,
): AttemptResolution {
  const resolution = resolveAttemptInner(being, attemptId, result);

  if (resolution.accepted) {
    checkAndRecordMilestones(
      being,
      resolution.practiceId,
      resolution.depthBefore,
      resolution.depthAfter,
      resolution.attemptId,
    );
  }

  return resolution;
}

/**
 * Drains all pending practice attempts using the supplied evaluator.
 *
 * Calls `resolveAttempt` for each pending attempt with the evaluator's result.
 * **Mutates** the being.
 */
export async function resolveAllPending(
  being: Being,
  evaluate: (attempt: PracticeAttempt) => PracticeAttemptResult | Promise<PracticeAttemptResult>,
): Promise<AttemptResolution[]> {
  const pending = getPendingAttemptsInner(being);
  const resolutions: AttemptResolution[] = [];
  for (const attempt of pending) {
    const result = await evaluate(attempt);
    resolutions.push(resolveAttempt(being, attempt.id, result));
  }
  return resolutions;
}

/**
 * Returns the being's structured self-model — what it has earned the right
 * to refer to once witness has accumulated substrate. **Pure**.
 *
 * Frameworks call this when the witness capability is active and choose
 * how (or whether) to inject it into prompts.
 */
export function getSelfModel(being: Being): SelfModel {
  return buildSelfModel(being);
}
