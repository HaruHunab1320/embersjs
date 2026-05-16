/**
 * Orientation determination: synthesizes pressure, practice, and wear into
 * one of four orientations.
 *
 * - clear: drives satisfied, practices decent — present and free
 * - held: drives pressing but practices holding — difficulty met with resource
 * - stretched: drives pressing, practices stretched thin — coping but strained
 * - consumed: drives pressing, practices absent OR collapsed by chronic state
 *
 * Wear forces orientation toward "consumed" above the collapse threshold —
 * a being chronically deprived cannot calmly proclaim peace, regardless of
 * how deep its practices once were.
 */

import { activePractices, averagePracticeDepth } from "../practices/query.js";
import type { Orientation, PracticeSet, WearConfig, WearState } from "../types.js";
import type { DrivePressureSummary } from "./pressure.js";

/**
 * Determines overall orientation. Pure function.
 */
export function determineOrientation(
  pressures: DrivePressureSummary[],
  practices: PracticeSet,
  wear: WearState,
  wearConfig: WearConfig,
  nowMs: number,
): Orientation {
  // Anti-stoic-marble: high chronic load forces consumed regardless of practice.
  if (wear.chronicLoad >= wearConfig.orientationCollapseThreshold) {
    return "consumed";
  }

  if (pressures.length === 0) return "clear";

  const avgPressure = pressures.reduce((sum, p) => sum + p.weightedPressure, 0) / pressures.length;
  const avgDepth = averagePracticeDepth(practices, nowMs);
  const activeCount = activePractices(practices, nowMs).length;

  if (avgPressure < 0.08) return "clear";

  if (avgPressure < 0.2) {
    if (avgDepth >= 0.3 && activeCount >= 2) return "held";
    if (avgDepth > 0.1 || activeCount >= 1) return "stretched";
    return "consumed";
  }

  // High pressure
  if (avgDepth >= 0.35 && activeCount >= 2) return "held";
  if (avgDepth > 0.1 || activeCount >= 1) return "stretched";
  return "consumed";
}
