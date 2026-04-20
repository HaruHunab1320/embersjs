/**
 * History management: recording the being's trajectory.
 *
 * In v0.1, history is recorded but not read by the library itself.
 * It's available for debugging and future emergent-behavior features.
 */

import type {
  Being,
  DriveTrajectoryPoint,
  IntegrationAction,
  PracticeMilestone,
  PressuredChoice,
  Transition,
} from "../types.js";

/** Default maximum entries in the drive trajectory ring buffer. */
const DEFAULT_TRAJECTORY_CAPACITY = 1000;

/**
 * Records a drive trajectory point in history.
 * Manages the ring buffer, evicting oldest entries when full.
 *
 * Mutates the being's history in place.
 */
export function recordTrajectoryPoint(being: Being, capacity = DEFAULT_TRAJECTORY_CAPACITY): void {
  const levels: Record<string, number> = {};
  for (const [id, drive] of being.drives.drives) {
    levels[id] = drive.level;
  }

  const point: DriveTrajectoryPoint = {
    atMs: being.elapsedMs,
    levels,
  };

  being.history.driveTrajectory.push(point);

  // Ring buffer: evict oldest when over capacity
  if (being.history.driveTrajectory.length > capacity) {
    being.history.driveTrajectory.shift();
  }
}

/**
 * Records a practice milestone when a practice crosses a notable depth threshold.
 *
 * Mutates the being's history in place.
 */
export function recordPracticeMilestone(
  being: Being,
  practiceId: string,
  depth: number,
  direction: "deepened" | "eroded",
): void {
  const milestone: PracticeMilestone = {
    practiceId,
    depth,
    atMs: being.elapsedMs,
    direction,
  };
  being.history.practiceMilestones.push(milestone);
}

/**
 * Records a choice made under pressure.
 *
 * Mutates the being's history in place.
 */
export function recordPressuredChoice(
  being: Being,
  pressingDriveIds: readonly string[],
  action: IntegrationAction,
  practicesStrengthened: readonly string[],
): void {
  const choice: PressuredChoice = {
    atMs: being.elapsedMs,
    pressingDriveIds,
    action,
    practicesStrengthened,
  };
  being.history.pressuredChoices.push(choice);
}

/**
 * Records a notable transition.
 *
 * Mutates the being's history in place.
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

/** Milestone thresholds — depth crossings worth recording. */
const MILESTONE_THRESHOLDS = [0.1, 0.25, 0.5, 0.75, 0.9];

/**
 * Checks whether a depth change crossed any milestone threshold and
 * records milestones accordingly.
 */
export function checkAndRecordMilestones(
  being: Being,
  practiceId: string,
  before: number,
  after: number,
): void {
  for (const threshold of MILESTONE_THRESHOLDS) {
    if (before < threshold && after >= threshold) {
      recordPracticeMilestone(being, practiceId, threshold, "deepened");
    } else if (before >= threshold && after < threshold) {
      recordPracticeMilestone(being, practiceId, threshold, "eroded");
    }
  }
}
