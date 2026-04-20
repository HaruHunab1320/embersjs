/**
 * Decay function implementations for practices.
 *
 * Decay describes how a practice's depth erodes over time when
 * untended. An untended practice weakens — the being must keep
 * practicing to maintain depth.
 */

import type { DecayFunction } from "../types.js";

const MS_PER_HOUR = 3_600_000;

/**
 * Applies a decay function to a current depth over a time delta.
 *
 * Pure function. Returns the new depth, clamped to [0, 1].
 *
 * Note: decay rates are specified as negative values (e.g., -0.008 per hour),
 * matching the convention that depth decreases over time without tending.
 */
export function applyDecay(decay: DecayFunction, current: number, dtMs: number): number {
  if (dtMs <= 0) return current;

  let next: number;

  switch (decay.kind) {
    case "linear": {
      const hours = dtMs / MS_PER_HOUR;
      next = current + decay.ratePerHour * hours;
      break;
    }
    case "exponential": {
      const hours = dtMs / MS_PER_HOUR;
      next = current * Math.pow(0.5, hours / decay.halfLifeHours);
      break;
    }
    case "custom": {
      next = decay.compute(current, dtMs);
      break;
    }
  }

  return clamp01(next);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
