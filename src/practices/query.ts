/**
 * Query helpers for inspecting practice set state.
 */

import type { Practice, PracticeSet } from "../types.js";

/**
 * Returns the depth of a specific practice, or 0 if the practice
 * is not present in the set.
 */
export function practiceDepth(set: PracticeSet, id: string): number {
  return set.practices.get(id)?.depth ?? 0;
}

/**
 * Returns true if the practice exists in the set and its depth
 * meets or exceeds the threshold.
 */
export function hasPracticeAtDepth(set: PracticeSet, id: string, threshold: number): boolean {
  const practice = set.practices.get(id);
  if (!practice) return false;
  return practice.depth >= threshold;
}

/**
 * Returns all practices sorted by depth descending.
 */
export function practicesByDepth(set: PracticeSet): Practice[] {
  return Array.from(set.practices.values()).sort((a, b) => b.depth - a.depth);
}

/**
 * Returns practices that are "active" — depth above a minimum threshold.
 * Default minimum: 0.1.
 */
export function activePractices(set: PracticeSet, minimum = 0.1): Practice[] {
  const result: Practice[] = [];
  for (const practice of set.practices.values()) {
    if (practice.depth >= minimum) {
      result.push(practice);
    }
  }
  return result;
}

/**
 * Returns the average depth across all practices in the set.
 * Returns 0 for an empty set.
 */
export function averagePracticeDepth(set: PracticeSet): number {
  if (set.practices.size === 0) return 0;
  let total = 0;
  for (const practice of set.practices.values()) {
    total += practice.depth;
  }
  return total / set.practices.size;
}
