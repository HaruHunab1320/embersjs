/**
 * Query helpers for inspecting a PracticeSet.
 *
 * All queries take `nowMs` because depth is derived from substrate and
 * depends on simulation time (recency factor).
 */

import type { Practice, PracticeSet } from "../types.js";
import { computeDepth } from "./depth.js";

/**
 * Returns the current derived depth of a practice. 0 if not in the set.
 */
export function practiceDepth(set: PracticeSet, id: string, nowMs: number): number {
  const practice = set.practices.get(id);
  if (!practice) return 0;
  return computeDepth(practice, nowMs);
}

/**
 * Returns true if the practice exists and its current depth meets the threshold.
 */
export function hasPracticeAtDepth(
  set: PracticeSet,
  id: string,
  nowMs: number,
  threshold: number,
): boolean {
  return practiceDepth(set, id, nowMs) >= threshold;
}

/**
 * Returns all practices sorted by current depth descending.
 */
export function practicesByDepth(set: PracticeSet, nowMs: number): Practice[] {
  return Array.from(set.practices.values()).sort(
    (a, b) => computeDepth(b, nowMs) - computeDepth(a, nowMs),
  );
}

/**
 * Returns practices whose depth is at or above the active threshold.
 * Default minimum: 0.1.
 */
export function activePractices(set: PracticeSet, nowMs: number, minimum = 0.1): Practice[] {
  const result: Practice[] = [];
  for (const practice of set.practices.values()) {
    if (computeDepth(practice, nowMs) >= minimum) {
      result.push(practice);
    }
  }
  return result;
}

/**
 * Returns the average depth across all practices in the set. 0 for empty set.
 */
export function averagePracticeDepth(set: PracticeSet, nowMs: number): number {
  if (set.practices.size === 0) return 0;
  let total = 0;
  for (const practice of set.practices.values()) {
    total += computeDepth(practice, nowMs);
  }
  return total / set.practices.size;
}
