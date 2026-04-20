/**
 * Tick function for advancing drive state over time.
 *
 * Pure function: same input produces same output, no side effects.
 */

import type { DriveStack, Drive } from "../types.js";
import { applyDrift } from "./drift.js";

/**
 * Advances all drives in a stack by `dtMs` milliseconds.
 *
 * Applies each drive's drift function to its current level.
 * Returns a new DriveStack with updated levels (does not mutate input).
 */
export function tickDrives(stack: DriveStack, dtMs: number): DriveStack {
  if (dtMs <= 0) return stack;

  const nextDrives = new Map<string, Drive>();

  for (const [id, drive] of stack.drives) {
    const nextLevel = applyDrift(drive.drift, drive.level, dtMs);
    nextDrives.set(id, { ...drive, level: nextLevel });
  }

  return {
    ...stack,
    drives: nextDrives,
  };
}
