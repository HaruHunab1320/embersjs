/**
 * History management: recording the being's trajectory and reading from it.
 *
 * In v0.2, history is no longer "recorded but never read." It becomes the
 * substrate of self-reflection — read by selfModel assembly, attention
 * weighting, and the practice-attempt context window.
 */

import type {
  Being,
  ContextWindowSpec,
  DriveTrajectoryPoint,
  IntegrationAction,
  IntegrationEvent,
  Pattern,
  PracticeMilestone,
  PressuredChoice,
  RecentEntry,
  Transition,
} from "../types.js";

/** Default trajectory ring buffer capacity. */
const DEFAULT_TRAJECTORY_CAPACITY = 1000;
/** Default recentEntries ring buffer capacity. */
const DEFAULT_RECENT_ENTRIES_CAPACITY = 200;

const HOUR_MS = 3_600_000;
const WEEK_MS = 7 * 24 * HOUR_MS;

// ---------------------------------------------------------------------------
// Recording — mutating helpers used by tick and integrate
// ---------------------------------------------------------------------------

/**
 * Records a drive trajectory point. Mutates history in place.
 */
export function recordTrajectoryPoint(being: Being, capacity = DEFAULT_TRAJECTORY_CAPACITY): void {
  const levels: Record<string, number> = {};
  for (const [id, drive] of being.drives.drives) {
    levels[id] = drive.level;
  }

  being.history.driveTrajectory.push({ atMs: being.elapsedMs, levels });
  if (being.history.driveTrajectory.length > capacity) {
    being.history.driveTrajectory.shift();
  }
}

/**
 * Records an integration entry in the recentEntries ring buffer.
 * Used by integrate() to track what the being has experienced.
 */
export function recordRecentEntry(
  being: Being,
  entry: IntegrationEvent | IntegrationAction,
  capacity = DEFAULT_RECENT_ENTRIES_CAPACITY,
): void {
  being.history.recentEntries.push({ atMs: being.elapsedMs, entry });
  if (being.history.recentEntries.length > capacity) {
    being.history.recentEntries.shift();
  }
}

/**
 * Records a practice depth threshold crossing.
 */
export function recordPracticeMilestone(
  being: Being,
  practiceId: string,
  depth: number,
  direction: "deepened" | "eroded",
  attemptId?: string,
): void {
  const milestone: PracticeMilestone = {
    practiceId,
    depth,
    atMs: being.elapsedMs,
    direction,
    attemptId,
  };
  being.history.practiceMilestones.push(milestone);
}

/**
 * Records a choice made under drive pressure.
 */
export function recordPressuredChoice(
  being: Being,
  pressingDriveIds: readonly string[],
  action: IntegrationAction,
  practiceAttemptIds: readonly string[],
): void {
  const choice: PressuredChoice = {
    atMs: being.elapsedMs,
    pressingDriveIds,
    action,
    practiceAttemptIds,
  };
  being.history.pressuredChoices.push(choice);
}

/**
 * Records a notable state transition.
 */
export function recordTransition(
  being: Being,
  description: string,
  from: string,
  to: string,
): void {
  const transition: Transition = {
    atMs: being.elapsedMs,
    description,
    from,
    to,
  };
  being.history.notableTransitions.push(transition);
}

/** Practice depth thresholds worth marking as milestones. */
const MILESTONE_THRESHOLDS = [0.1, 0.25, 0.5, 0.75, 0.9];

/**
 * Records milestones for any thresholds crossed by a depth change.
 */
export function checkAndRecordMilestones(
  being: Being,
  practiceId: string,
  before: number,
  after: number,
  attemptId?: string,
): void {
  for (const threshold of MILESTONE_THRESHOLDS) {
    if (before < threshold && after >= threshold) {
      recordPracticeMilestone(being, practiceId, threshold, "deepened", attemptId);
    } else if (before >= threshold && after < threshold) {
      recordPracticeMilestone(being, practiceId, threshold, "eroded", attemptId);
    }
  }
}

// ---------------------------------------------------------------------------
// Reading — pure query helpers used by metabolize, selfModel, and frameworks
// ---------------------------------------------------------------------------

/**
 * Returns recent integration entries matching the supplied window spec.
 *
 * Pure read. Returns most-recent-first up to the window's `entries` cap and
 * within `maxAgeMs` of `nowMs`.
 */
export function recentEntries(being: Being, window: ContextWindowSpec): readonly RecentEntry[] {
  const maxEntries = window.entries ?? 50;
  const maxAgeMs = window.maxAgeMs ?? 24 * HOUR_MS;
  const cutoff = being.elapsedMs - maxAgeMs;

  const result: RecentEntry[] = [];
  const all = being.history.recentEntries;
  for (let i = all.length - 1; i >= 0 && result.length < maxEntries; i--) {
    const e = all[i]!;
    if (e.atMs < cutoff) break;
    result.unshift(e);
  }
  return result;
}

/**
 * Returns recent pressured choices, optionally filtered.
 */
export function recentPressuredChoices(
  being: Being,
  filter?: { driveId?: string; sinceMs?: number },
): readonly PressuredChoice[] {
  const sinceMs = filter?.sinceMs ?? 0;
  let choices = being.history.pressuredChoices.filter((c) => c.atMs >= sinceMs);
  if (filter?.driveId) {
    const driveId = filter.driveId;
    choices = choices.filter((c) => c.pressingDriveIds.includes(driveId));
  }
  return choices;
}

/**
 * Returns the slice of drive trajectory at or after `sinceMs`.
 */
export function trajectorySnippet(being: Being, sinceMs: number): readonly DriveTrajectoryPoint[] {
  return being.history.driveTrajectory.filter((p) => p.atMs >= sinceMs);
}

/**
 * Detects recurring patterns in the being's recent history.
 *
 * Heuristic — looks at:
 * - Drives that have been below threshold across many recent observations
 * - Practices that have crossed depth thresholds repeatedly
 * - Drives that have driven multiple pressured choices
 *
 * Returns patterns sorted by `observedCount` descending.
 */
export function recurringPatterns(being: Being): readonly Pattern[] {
  const patterns: Pattern[] = [];
  const nowMs = being.elapsedMs;
  const weekAgo = nowMs - WEEK_MS;
  const lowLevelThreshold = being.drives.dominationRules.threshold;
  const recentTrajectoryCount = 100;

  // 1. Drives repeatedly low across recent trajectory points
  const recentTrajectory = being.history.driveTrajectory.slice(-recentTrajectoryCount);
  if (recentTrajectory.length > 0) {
    const lowCounts = new Map<string, number>();
    for (const point of recentTrajectory) {
      for (const [id, level] of Object.entries(point.levels)) {
        if (level < lowLevelThreshold) {
          lowCounts.set(id, (lowCounts.get(id) ?? 0) + 1);
        }
      }
    }
    const minObservations = Math.max(3, Math.floor(recentTrajectory.length * 0.3));
    for (const [driveId, count] of lowCounts) {
      if (count >= minObservations) {
        const drive = being.drives.drives.get(driveId);
        patterns.push({
          kind: "drive-low",
          subject: driveId,
          description: `${drive?.name ?? driveId} has been below threshold in ${count} of the last ${recentTrajectory.length} observations`,
          observedCount: count,
        });
      }
    }
  }

  // 2. Practices repeatedly deepening
  const recentDeepenings = new Map<string, number>();
  for (const m of being.history.practiceMilestones) {
    if (m.atMs >= weekAgo && m.direction === "deepened") {
      recentDeepenings.set(m.practiceId, (recentDeepenings.get(m.practiceId) ?? 0) + 1);
    }
  }
  for (const [practiceId, count] of recentDeepenings) {
    if (count >= 2) {
      const practice = being.practices.practices.get(practiceId);
      patterns.push({
        kind: "practice-engaged",
        subject: practiceId,
        description: `${practice?.name ?? practiceId} deepened ${count} times in the last week`,
        observedCount: count,
      });
    }
  }

  // 3. Drives that have driven multiple recent pressured choices
  const pressureCounts = new Map<string, number>();
  for (const choice of being.history.pressuredChoices) {
    if (choice.atMs < weekAgo) continue;
    for (const driveId of choice.pressingDriveIds) {
      pressureCounts.set(driveId, (pressureCounts.get(driveId) ?? 0) + 1);
    }
  }
  for (const [driveId, count] of pressureCounts) {
    if (count >= 3) {
      const drive = being.drives.drives.get(driveId);
      patterns.push({
        kind: "pressured-choice",
        subject: driveId,
        description: `Choices made under pressure from ${drive?.name ?? driveId}: ${count} in the last week`,
        observedCount: count,
      });
    }
  }

  patterns.sort((a, b) => b.observedCount - a.observedCount);
  return patterns;
}
