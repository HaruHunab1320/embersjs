/**
 * Orientation determination: synthesizes drive pressure and practice
 * state into one of four overall orientations.
 *
 * - clear: drives satisfied, practices decent — present and free
 * - held: drives pressing but practices holding — difficulty met with resource
 * - stretched: drives pressing, practices stretched thin — coping but strained
 * - consumed: drives pressing, practices absent — overwhelmed
 */

import type { ComposedEffects } from "../practices/effects.js";
import { activePractices, averagePracticeDepth } from "../practices/query.js";
import type { Orientation, PracticeSet } from "../types.js";
import type { FeltDrivePressure } from "./pressure.js";

/**
 * Determines the being's overall orientation from pressure and practice state.
 *
 * Uses average felt pressure across drives (not total) so that a being
 * with many small gaps doesn't read as overwhelmed. A freshly-authored
 * being with modest drives should be clear or mildly held, not stretched.
 *
 * The algorithm:
 * - If average felt pressure is low → clear
 * - If average is moderate → held (with practices) or stretched (without)
 * - If average is high → held (strong practices), stretched, or consumed
 *
 * Pure function.
 */
export function determineOrientation(
  pressures: FeltDrivePressure[],
  practices: PracticeSet,
  _effects: ComposedEffects,
): Orientation {
  if (pressures.length === 0) return "clear";

  const avgPressure = pressures.reduce((sum, p) => sum + p.feltPressure, 0) / pressures.length;
  const avgDepth = averagePracticeDepth(practices);
  const activeCount = activePractices(practices).length;

  // Low pressure: the being's needs are largely met
  if (avgPressure < 0.08) {
    return "clear";
  }

  // Moderate pressure — some drives are asking for attention
  if (avgPressure < 0.2) {
    if (avgDepth >= 0.3 && activeCount >= 2) return "held";
    if (avgDepth > 0.1 || activeCount >= 1) return "stretched";
    return "consumed";
  }

  // High pressure — real difficulty
  if (avgDepth >= 0.35 && activeCount >= 2) return "held";
  if (avgDepth > 0.1 || activeCount >= 1) return "stretched";
  return "consumed";
}
