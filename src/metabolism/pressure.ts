/**
 * Pressure computation: turns raw drive state into weighted pressure.
 *
 * In v0.2, pressure is never reduced by practices. The being feels the full
 * weight of its drives. What practice changes is what the being can bring
 * to meet that pressure, surfaced via substrate retrieval in metabolism.
 *
 * Tier domination is no longer applied here — it shifts attention weighting
 * (in attention.ts), not pressure itself.
 */

import { drivePressure, weightedPressure } from "../drives/query.js";
import type { Drive, DriveStack } from "../types.js";

/**
 * A drive's raw and weighted pressure.
 */
export interface DrivePressureSummary {
  readonly drive: Drive;
  /** Raw pressure: max(0, target - level). */
  readonly rawPressure: number;
  /** Weighted pressure: rawPressure × weight. */
  readonly weightedPressure: number;
}

/**
 * Computes pressure for every drive in the stack.
 *
 * Pure function. Returns drives sorted by weighted pressure descending.
 */
export function computePressures(stack: DriveStack): DrivePressureSummary[] {
  const results: DrivePressureSummary[] = [];
  for (const drive of stack.drives.values()) {
    results.push({
      drive,
      rawPressure: drivePressure(drive),
      weightedPressure: weightedPressure(drive),
    });
  }
  results.sort((a, b) => b.weightedPressure - a.weightedPressure);
  return results;
}

/**
 * Returns the top N drives by weighted pressure.
 */
export function dominantDrives(pressures: DrivePressureSummary[], n = 3): DrivePressureSummary[] {
  return pressures.slice(0, n);
}

/**
 * Total weighted pressure across all drives.
 */
export function totalPressure(pressures: DrivePressureSummary[]): number {
  let total = 0;
  for (const p of pressures) total += p.weightedPressure;
  return total;
}

/**
 * Average weighted pressure across all drives. 0 for empty stack.
 */
export function averagePressure(pressures: DrivePressureSummary[]): number {
  if (pressures.length === 0) return 0;
  return totalPressure(pressures) / pressures.length;
}
