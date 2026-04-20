/**
 * Orientation determination: synthesizes drive pressure and practice
 * state into one of four overall orientations.
 *
 * - clear: drives satisfied, practices decent — present and free
 * - held: drives pressing but practices holding — difficulty met with resource
 * - stretched: drives pressing, practices stretched thin — coping but strained
 * - consumed: drives pressing, practices absent — overwhelmed
 */

import type { Orientation, PracticeSet } from "../types.js";
import { averagePracticeDepth, activePractices } from "../practices/query.js";
import type { FeltDrivePressure } from "./pressure.js";
import type { ComposedEffects } from "../practices/effects.js";

/**
 * Determines the being's overall orientation from pressure and practice state.
 *
 * The algorithm:
 * - If total felt pressure is low → clear or held (depending on practice depth)
 * - If total felt pressure is moderate-to-high:
 *   - Strong practices → held
 *   - Moderate practices → stretched
 *   - Weak/absent practices → consumed
 *
 * Practice-driven orientation shifts nudge toward their target.
 *
 * Pure function.
 */
export function determineOrientation(
  pressures: FeltDrivePressure[],
  practices: PracticeSet,
  effects: ComposedEffects,
): Orientation {
  const totalPressure = pressures.reduce((sum, p) => sum + p.feltPressure, 0);
  const avgDepth = averagePracticeDepth(practices);
  const activeCount = activePractices(practices).length;

  // Low pressure: the being's needs are largely met
  if (totalPressure < 0.15) {
    // Even with low pressure, a being with deep practice is "clear"
    // while one without is somewhat hollow — but not strained
    return avgDepth > 0.3 ? "clear" : "clear";
  }

  // Moderate pressure
  if (totalPressure < 0.4) {
    if (avgDepth >= 0.35 && activeCount >= 2) return "held";
    if (avgDepth > 0.15 || activeCount >= 1) return "stretched";
    return "consumed";
  }

  // High pressure
  if (avgDepth >= 0.4 && activeCount >= 2) return "held";
  if (avgDepth > 0.15 || activeCount >= 1) return "stretched";
  return "consumed";

  // Note: orientation shifts from practices are handled in the felt-string
  // generation, where they color the prose rather than overriding the
  // computed orientation. A being under extreme pressure with good practices
  // is "held" — the practices *hold* the difficulty, they don't erase it.
}
