/**
 * Query helpers for inspecting wear state.
 */

import type { WearConfig, WearState, WearZone } from "../types.js";

/**
 * Returns true if the drive is currently in chronic state — sustained below
 * the critical threshold and not yet fully recovered.
 */
export function isChronic(wear: WearState, driveId: string, config: WearConfig): boolean {
  const tracker = wear.perDrive.get(driveId);
  if (!tracker) return false;
  return tracker.sustainedBelowMs > 0 && tracker.sustainedAboveMs < config.recoveryHorizonMs;
}

/**
 * Returns the IDs of all drives currently in chronic state.
 */
export function chronicDrives(wear: WearState, config: WearConfig): string[] {
  const result: string[] = [];
  for (const [id, tracker] of wear.perDrive) {
    if (tracker.sustainedBelowMs > 0 && tracker.sustainedAboveMs < config.recoveryHorizonMs) {
      result.push(id);
    }
  }
  return result;
}

/**
 * Returns the sustained-below time for a specific drive, or 0 if not tracked.
 */
export function sustainedBelowMs(wear: WearState, driveId: string): number {
  return wear.perDrive.get(driveId)?.sustainedBelowMs ?? 0;
}

/**
 * Returns true if chronic load has crossed the orientation collapse threshold —
 * meaning orientation should be forced toward "consumed" regardless of practice.
 */
export function isCollapsed(wear: WearState, config: WearConfig): boolean {
  return wear.chronicLoad >= config.orientationCollapseThreshold;
}

/**
 * Which wear zone a level sits in.
 *
 * Mirrors the branch structure of `tickTracker` exactly — below the critical
 * threshold accrues chronic time, above the recovery threshold accrues
 * recovery time, and the band between is the hysteresis hold where neither
 * moves. Kept in one place so the transition log cannot disagree with the
 * behavior it is describing.
 */
export function wearZone(level: number, config: WearConfig): WearZone {
  if (level < config.criticalThreshold) return "below";
  if (level > config.recoveryThreshold) return "above";
  return "between";
}
