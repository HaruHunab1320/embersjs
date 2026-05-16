/**
 * Wear tick: updates chronic state trackers each simulation tick.
 *
 * Hysteresis:
 * - When a drive's level falls below `criticalThreshold`, sustainedBelowMs
 *   accumulates and sustainedAboveMs resets to 0 (recovery interrupted).
 * - When a drive's level rises above `recoveryThreshold`, sustainedAboveMs
 *   accumulates. Once it reaches `recoveryHorizonMs`, sustainedBelowMs
 *   clears entirely (the drive is fully recovered).
 * - Between thresholds: both trackers hold steady. The hysteresis prevents
 *   flip-flop near a single threshold.
 *
 * Recovery is asymmetric: descent into chronic state can happen quickly,
 * but full recovery requires sustained above-threshold time.
 */

import type { ChronicTracker, DriveStack, WearConfig, WearState } from "../types.js";
import { clamp01 } from "../util.js";

/**
 * Advances the wear state by `dtMs` milliseconds given current drive levels.
 *
 * Pure function. Same input produces same output.
 */
export function tickWear(
  wear: WearState,
  drives: DriveStack,
  dtMs: number,
  config: WearConfig,
): WearState {
  if (dtMs <= 0) return wear;

  const newTrackers = new Map<string, ChronicTracker>();

  for (const [driveId, drive] of drives.drives) {
    const tracker = wear.perDrive.get(driveId) ?? { sustainedBelowMs: 0, sustainedAboveMs: 0 };
    newTrackers.set(driveId, tickTracker(tracker, drive.level, dtMs, config));
  }

  const chronicLoad = computeChronicLoad(newTrackers, drives, config);

  return { perDrive: newTrackers, chronicLoad };
}

function tickTracker(
  tracker: ChronicTracker,
  level: number,
  dtMs: number,
  config: WearConfig,
): ChronicTracker {
  if (level < config.criticalThreshold) {
    // Below critical: accumulate chronic-below time, reset recovery.
    return {
      sustainedBelowMs: tracker.sustainedBelowMs + dtMs,
      sustainedAboveMs: 0,
    };
  }
  if (level > config.recoveryThreshold) {
    // Above recovery: accumulate recovery time. Full recovery clears below.
    const newAboveMs = tracker.sustainedAboveMs + dtMs;
    if (newAboveMs >= config.recoveryHorizonMs) {
      return {
        sustainedBelowMs: 0,
        sustainedAboveMs: config.recoveryHorizonMs,
      };
    }
    return {
      sustainedBelowMs: tracker.sustainedBelowMs,
      sustainedAboveMs: newAboveMs,
    };
  }
  // Between thresholds: hysteresis hold.
  return tracker;
}

/**
 * Computes overall chronic load (0–1) from per-drive trackers.
 *
 * Each drive's contribution is bounded by its tier-adjusted saturation.
 * Tier-1 drives saturate fastest (most foundational); higher tiers take
 * proportionally longer to reach full contribution. Recovery progress
 * (sustainedAboveMs / recoveryHorizonMs) reduces contribution gradually.
 *
 * Drives are weighted by inverse tier so tier-1 deprivation dominates.
 */
function computeChronicLoad(
  trackers: ReadonlyMap<string, ChronicTracker>,
  drives: DriveStack,
  config: WearConfig,
): number {
  let totalContribution = 0;
  let totalWeight = 0;

  for (const drive of drives.drives.values()) {
    const tracker = trackers.get(drive.id);
    if (!tracker) continue;

    const tierSaturationMs = config.tier1SaturationMs * (1 + (drive.tier - 1) * 0.5);
    const rawContribution = Math.min(1, tracker.sustainedBelowMs / tierSaturationMs);
    const recoveryProgress = Math.min(1, tracker.sustainedAboveMs / config.recoveryHorizonMs);
    const contribution = rawContribution * (1 - recoveryProgress);

    const tierWeight = 1 / drive.tier;
    totalContribution += contribution * tierWeight;
    totalWeight += tierWeight;
  }

  if (totalWeight === 0) return 0;
  return clamp01(totalContribution / totalWeight);
}
