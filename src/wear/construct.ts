/**
 * Initial wear state construction.
 */

import type { ChronicTracker, DriveStack, WearState } from "../types.js";

/**
 * Creates an initial WearState with zero trackers for each drive in the stack.
 * A freshly-constructed being has zero chronic load.
 */
export function createInitialWear(drives: DriveStack): WearState {
  const perDrive = new Map<string, ChronicTracker>();
  for (const driveId of drives.drives.keys()) {
    perDrive.set(driveId, { sustainedBelowMs: 0, sustainedAboveMs: 0 });
  }
  return {
    perDrive,
    chronicLoad: 0,
  };
}
