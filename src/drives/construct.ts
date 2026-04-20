/**
 * Factory functions for creating Drives and DriveStacks.
 */

import type {
  Drive,
  DriveStack,
  DriveConfig,
  DriveStackConfig,
  DominationRules,
} from "../types.js";

/** Default domination rules per the architecture spec. */
const DEFAULT_DOMINATION_RULES: DominationRules = {
  threshold: 0.3,
  dampening: 0.7,
};

/**
 * Creates a Drive from a configuration object.
 *
 * The `initialLevel` from the config becomes the drive's starting `level`.
 * Level is clamped to [0, 1].
 */
export function createDrive(config: DriveConfig): Drive {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    tier: config.tier,
    weight: config.weight,
    level: clamp01(config.initialLevel),
    target: clamp01(config.target),
    drift: config.drift,
    satiatedBy: config.satiatedBy,
  };
}

/**
 * Creates a DriveStack from a configuration object.
 *
 * Validates that:
 * - All drives have tiers within [1, tierCount]
 * - No duplicate drive IDs
 */
export function createDriveStack(config: DriveStackConfig): DriveStack {
  const drives = new Map<string, Drive>();

  for (const driveConfig of config.drives) {
    if (drives.has(driveConfig.id)) {
      throw new Error(`Duplicate drive id: "${driveConfig.id}"`);
    }
    if (driveConfig.tier < 1 || driveConfig.tier > config.tierCount) {
      throw new Error(
        `Drive "${driveConfig.id}" has tier ${driveConfig.tier}, but tierCount is ${config.tierCount}`,
      );
    }
    drives.set(driveConfig.id, createDrive(driveConfig));
  }

  return {
    drives,
    tierCount: config.tierCount,
    dominationRules: {
      ...DEFAULT_DOMINATION_RULES,
      ...config.dominationRules,
    },
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
