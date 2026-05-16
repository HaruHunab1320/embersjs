/**
 * Practice tick: housekeeping for accumulating substrate.
 *
 * In v0.2 there is no per-tick depth decay — depth is derived from
 * substrate each time it's read, with recency baked in.
 *
 * Tick's job is artifact eviction:
 * - Artifacts older than the practice's `artifactMaxAgeMs` are removed.
 * - Wear accelerates the effective age cap: under chronic load, artifacts
 *   age out faster (this is part of how the being degrades structurally
 *   under sustained deprivation).
 */

import type { PracticeSet, WearState } from "../types.js";

/** Default hard age cap for artifacts: 30 days. */
export const DEFAULT_HARD_AGE_CAP_MS = 30 * 24 * 3_600_000;

/**
 * Evicts artifacts older than each practice's effective age cap.
 *
 * The effective cap = configured cap / (1 + wear.chronicLoad × erosionFactor).
 * At full chronic load with default factor 2.0, artifacts age 3× faster.
 *
 * Mutates the practices in place. Returns the set for convenience.
 */
export function tickPractices(
  set: PracticeSet,
  nowMs: number,
  wear: WearState,
  erosionFactor: number,
): PracticeSet {
  const ageMultiplier = 1 + wear.chronicLoad * erosionFactor;

  for (const practice of set.practices.values()) {
    const cap = practice.protocol.artifactMaxAgeMs ?? DEFAULT_HARD_AGE_CAP_MS;
    const effectiveCap = cap / ageMultiplier;
    const cutoff = nowMs - effectiveCap;

    const filtered = practice.substrate.artifacts.filter((a) => a.atMs >= cutoff);
    if (filtered.length !== practice.substrate.artifacts.length) {
      practice.substrate = {
        artifacts: filtered,
        capacity: practice.substrate.capacity,
      };
    }
  }

  return set;
}
