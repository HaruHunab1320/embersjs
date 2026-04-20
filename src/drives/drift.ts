/**
 * Drift function implementations.
 *
 * Drift describes how a drive's satisfaction level changes over time
 * absent external input. Most drives drift downward (become less satisfied),
 * requiring tending.
 */

import type { DriftFunction } from "../types.js";
import { clamp01, MS_PER_HOUR } from "../util.js";

/**
 * Applies a drift function to a current level over a time delta.
 *
 * Pure function. Returns the new level, clamped to [0, 1].
 */
export function applyDrift(drift: DriftFunction, current: number, dtMs: number): number {
  if (dtMs <= 0) return current;

  let next: number;

  switch (drift.kind) {
    case "linear": {
      const hours = dtMs / MS_PER_HOUR;
      next = current + drift.ratePerHour * hours;
      break;
    }
    case "exponential": {
      // Half-life decay: level * (0.5 ^ (dt / halfLife))
      const hours = dtMs / MS_PER_HOUR;
      next = current * 0.5 ** (hours / drift.halfLifeHours);
      break;
    }
    case "custom": {
      next = drift.compute(current, dtMs);
      break;
    }
  }

  return clamp01(next);
}
