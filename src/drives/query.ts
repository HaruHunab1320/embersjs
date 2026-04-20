/**
 * Query helpers for inspecting drive stack state.
 */

import type { Drive, DriveStack } from "../types.js";

/**
 * Returns the raw pressure of a drive: how far it is below its target.
 * Pressure = max(0, target - level). A fully satisfied drive has 0 pressure.
 */
export function drivePressure(drive: Drive): number {
  return Math.max(0, drive.target - drive.level);
}

/**
 * Returns the weighted pressure of a drive: pressure * weight.
 */
export function weightedPressure(drive: Drive): number {
  return drivePressure(drive) * drive.weight;
}

/**
 * Returns all drives whose level is at or below the given threshold.
 * These are the drives that are "pressing" — demanding attention.
 */
export function pressingDrives(stack: DriveStack, threshold: number): Drive[] {
  const result: Drive[] = [];
  for (const drive of stack.drives.values()) {
    if (drive.level <= threshold) {
      result.push(drive);
    }
  }
  return result;
}

/**
 * Returns the lowest tier number that has at least one drive below
 * the domination threshold. Returns `undefined` if no tier is dominating.
 */
export function dominantTier(stack: DriveStack): number | undefined {
  const { threshold } = stack.dominationRules;
  let lowest: number | undefined;

  for (const drive of stack.drives.values()) {
    if (drive.level < threshold) {
      if (lowest === undefined || drive.tier < lowest) {
        lowest = drive.tier;
      }
    }
  }

  return lowest;
}

/**
 * Returns true if all drives in the given tier meet the satisfaction threshold.
 */
export function isTierSatisfied(stack: DriveStack, tier: number, threshold: number): boolean {
  for (const drive of stack.drives.values()) {
    if (drive.tier === tier && drive.level < threshold) {
      return false;
    }
  }
  // A tier with no drives is vacuously satisfied
  return true;
}

/**
 * Returns all drives in a specific tier, sorted by weighted pressure descending.
 */
export function drivesInTier(stack: DriveStack, tier: number): Drive[] {
  const result: Drive[] = [];
  for (const drive of stack.drives.values()) {
    if (drive.tier === tier) {
      result.push(drive);
    }
  }
  return result.sort((a, b) => weightedPressure(b) - weightedPressure(a));
}

/**
 * Returns the top N drives by weighted pressure, across all tiers.
 */
export function topDrivesByPressure(stack: DriveStack, n: number): Drive[] {
  const all = Array.from(stack.drives.values());
  return all.sort((a, b) => weightedPressure(b) - weightedPressure(a)).slice(0, n);
}
