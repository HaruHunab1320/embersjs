/**
 * Pressure computation: turns raw drive state into felt pressure,
 * after applying tier-domination and practice effects.
 */

import { dominantTier, drivePressure, weightedPressure } from "../drives/query.js";
import type { ComposedEffects } from "../practices/effects.js";
import type { Drive, DriveStack } from "../types.js";

/**
 * A drive's pressure after all modulations have been applied.
 */
export interface FeltDrivePressure {
  readonly drive: Drive;
  /** Raw pressure: max(0, target - level). */
  readonly rawPressure: number;
  /** Raw pressure * weight. */
  readonly weightedPressure: number;
  /** After tier-domination dampening. */
  readonly dominatedPressure: number;
  /** After practice-effect dampening — the final felt pressure. */
  readonly feltPressure: number;
}

/**
 * Computes felt pressure for every drive in the stack.
 *
 * The pipeline:
 * 1. Raw pressure = max(0, target - level)
 * 2. Weighted pressure = raw * weight
 * 3. Tier domination: if a lower tier is dominating, higher-tier
 *    drives have their pressure multiplied by (1 - dampening)
 * 4. Practice effects: dampen-drive-pressure effects reduce felt
 *    pressure further
 *
 * Pure function.
 */
export function computeFeltPressures(
  stack: DriveStack,
  effects: ComposedEffects,
): FeltDrivePressure[] {
  const domTier = dominantTier(stack);
  const results: FeltDrivePressure[] = [];

  for (const drive of stack.drives.values()) {
    const raw = drivePressure(drive);
    const weighted = weightedPressure(drive);

    // Tier domination: higher tiers are dampened when a lower tier dominates
    let dominated = weighted;
    if (domTier !== undefined && drive.tier > domTier) {
      dominated = weighted * (1 - stack.dominationRules.dampening);
    }

    // Practice dampening
    let felt = dominated;

    // Apply drive-specific dampening
    const specificDampening = effects.driveDampening.get(drive.id);
    if (specificDampening !== undefined) {
      felt = felt * (1 - specificDampening);
    }

    // Apply global dampening (empty-string key)
    const globalDampening = effects.driveDampening.get("");
    if (globalDampening !== undefined) {
      felt = felt * (1 - globalDampening);
    }

    results.push({
      drive,
      rawPressure: raw,
      weightedPressure: weighted,
      dominatedPressure: dominated,
      feltPressure: Math.max(0, felt),
    });
  }

  // Sort by felt pressure descending
  results.sort((a, b) => b.feltPressure - a.feltPressure);

  return results;
}

/**
 * Returns the top N drives by felt pressure.
 */
export function dominantDrives(pressures: FeltDrivePressure[], n = 3): FeltDrivePressure[] {
  return pressures.slice(0, n);
}

/**
 * Returns the total felt pressure across all drives.
 * Useful for orientation determination.
 */
export function totalFeltPressure(pressures: FeltDrivePressure[]): number {
  let total = 0;
  for (const p of pressures) {
    total += p.feltPressure;
  }
  return total;
}
