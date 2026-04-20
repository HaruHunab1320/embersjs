/**
 * Tick function for advancing practice state over time.
 *
 * Pure function: same input produces same output, no side effects.
 * Applies decay to every practice's depth.
 */

import type { Practice, PracticeSet } from "../types.js";
import { applyDecay } from "./decay.js";

/**
 * Advances all practices in a set by `dtMs` milliseconds.
 *
 * Applies each practice's decay function to its current depth.
 * Returns a new PracticeSet with updated depths (does not mutate input).
 */
export function tickPractices(set: PracticeSet, dtMs: number): PracticeSet {
  if (dtMs <= 0) return set;

  const nextPractices = new Map<string, Practice>();

  for (const [id, practice] of set.practices) {
    const nextDepth = applyDecay(practice.decay, practice.depth, dtMs);
    nextPractices.set(id, { ...practice, depth: nextDepth });
  }

  return { practices: nextPractices };
}
