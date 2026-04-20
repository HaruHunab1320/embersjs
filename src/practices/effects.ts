/**
 * Effect composition: combines active practices' effects into a bundle
 * that metabolism can apply.
 *
 * Effects are applied proportionally to practice depth. A practice at
 * depth 0.5 with a dampen-drive-pressure factor of 0.3 produces an
 * effective dampening of 0.15.
 */

import type { Practice, PracticeSet, PracticeEffect } from "../types.js";

/**
 * The composed result of all active practice effects, ready for
 * metabolism to consume.
 */
export interface ComposedEffects {
  /**
   * Per-drive dampening factors. Key is drive id, value is the
   * total dampening factor (0–1). An empty-string key means
   * "all drives."
   */
  readonly driveDampening: ReadonlyMap<string, number>;

  /**
   * Multiplicative time-horizon extension factor.
   * 1.0 = no extension; >1 = difficulty feels more local.
   */
  readonly timeHorizonFactor: number;

  /** Whether witness meta-awareness is enabled. */
  readonly witnessEnabled: boolean;

  /**
   * Orientation shifts, weighted by depth. Each entry is
   * { toward, weight } where weight reflects how strongly
   * the practice pushes toward that orientation.
   */
  readonly orientationShifts: ReadonlyArray<{
    readonly toward: "clear" | "held" | "stretched";
    readonly weight: number;
  }>;
}

/**
 * Composes all active practices' effects into a single bundle.
 *
 * Effects are scaled by each practice's current depth:
 * - dampen-drive-pressure: effective factor = configured factor * depth
 * - extend-time-horizon: effective factor = 1 + (configured factor - 1) * depth
 * - enable-witness: enabled if depth > 0.1
 * - shift-orientation: weight = depth
 *
 * Multiple practices with overlapping effects stack additively for
 * dampening (capped at 0.8 to prevent total suppression) and
 * multiplicatively for time horizon.
 */
export function composeEffects(set: PracticeSet): ComposedEffects {
  const dampeningMap = new Map<string, number>();
  let timeHorizonFactor = 1.0;
  let witnessEnabled = false;
  const orientationShifts: Array<{ toward: "clear" | "held" | "stretched"; weight: number }> = [];

  for (const practice of set.practices.values()) {
    if (practice.depth <= 0) continue;

    for (const effect of practice.effects) {
      applyEffect(effect, practice, dampeningMap, orientationShifts, {
        getTimeHorizon: () => timeHorizonFactor,
        setTimeHorizon: (v: number) => {
          timeHorizonFactor = v;
        },
        getWitness: () => witnessEnabled,
        setWitness: (v: boolean) => {
          witnessEnabled = v;
        },
      });
    }
  }

  // Cap dampening at 0.8 to prevent total suppression
  for (const [key, value] of dampeningMap) {
    dampeningMap.set(key, Math.min(value, 0.8));
  }

  return {
    driveDampening: dampeningMap,
    timeHorizonFactor,
    witnessEnabled,
    orientationShifts,
  };
}

function applyEffect(
  effect: PracticeEffect,
  practice: Practice,
  dampeningMap: Map<string, number>,
  orientationShifts: Array<{ toward: "clear" | "held" | "stretched"; weight: number }>,
  scalars: {
    getTimeHorizon: () => number;
    setTimeHorizon: (v: number) => void;
    getWitness: () => boolean;
    setWitness: (v: boolean) => void;
  },
): void {
  switch (effect.kind) {
    case "dampen-drive-pressure": {
      const effectiveFactor = effect.factor * practice.depth;
      if (effect.driveIds.length === 0) {
        // Empty driveIds means "all drives" — use empty string as key
        const current = dampeningMap.get("") ?? 0;
        dampeningMap.set("", current + effectiveFactor);
      } else {
        for (const driveId of effect.driveIds) {
          const current = dampeningMap.get(driveId) ?? 0;
          dampeningMap.set(driveId, current + effectiveFactor);
        }
      }
      break;
    }
    case "extend-time-horizon": {
      // Scale: at full depth, apply the full factor; at 0, no extension
      const effectiveFactor = 1 + (effect.factor - 1) * practice.depth;
      scalars.setTimeHorizon(scalars.getTimeHorizon() * effectiveFactor);
      break;
    }
    case "enable-witness": {
      if (practice.depth > 0.1) {
        scalars.setWitness(true);
      }
      break;
    }
    case "shift-orientation": {
      orientationShifts.push({
        toward: effect.toward,
        weight: practice.depth,
      });
      break;
    }
  }
}
