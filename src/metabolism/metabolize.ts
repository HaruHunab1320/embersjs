/**
 * The core metabolize function: takes a Being's current state and produces
 * a rich, prompt-ready InnerSituation.
 *
 * This is the main output of the library. The `felt` string is what goes
 * into prompts. The structured data informs attention-weighting and
 * capability access decisions by the consuming framework.
 */

import type { Being, InnerSituation } from "../types.js";
import { composeEffects } from "../practices/effects.js";
import { computeFeltPressures, dominantDrives } from "./pressure.js";
import { determineOrientation } from "./orientation.js";
import { composeFelt, toDriveSummary, toPracticeSummary } from "./felt-templates.js";

/**
 * Metabolizes a Being's current drive and practice state into an InnerSituation.
 *
 * The output includes:
 * - `dominantDrives`: the 2-3 most pressing drives with their felt descriptions
 * - `practiceState`: all practices with depth and active status
 * - `felt`: prose description of the being's current experience
 * - `orientation`: overall state (clear/held/stretched/consumed)
 *
 * Pure function: same Being state produces the same InnerSituation.
 */
export function metabolize(being: Being): InnerSituation {
  // 1. Compose practice effects
  const effects = composeEffects(being.practices);

  // 2. Compute felt pressure for every drive
  const pressures = computeFeltPressures(being.drives, effects);

  // 3. Identify dominant drives (top 3 by felt pressure)
  const dominant = dominantDrives(pressures, 3);

  // 4. Build practice summaries
  const practiceSummaries = Array.from(being.practices.practices.values()).map((p) =>
    toPracticeSummary(p.id, p.name, p.depth),
  );

  // 5. Determine orientation
  const orientation = determineOrientation(pressures, being.practices, effects);

  // 6. Compose the felt string
  const felt = composeFelt(orientation, dominant, practiceSummaries, effects);

  // 7. Build drive summaries
  const driveSummaries = dominant
    .filter((p) => p.feltPressure > 0.01)
    .map(toDriveSummary);

  return {
    dominantDrives: driveSummaries,
    practiceState: practiceSummaries,
    felt,
    orientation,
  };
}
