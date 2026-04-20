/**
 * Satiation: matching events/actions to drive bindings and updating levels.
 */

import type {
  DriveStack,
  Drive,
  IntegrationEvent,
  IntegrationAction,
  SatiationBinding,
} from "../types.js";

/**
 * Applies an event or action to a drive stack, satiating any drives
 * whose bindings match.
 *
 * Returns a new DriveStack with updated levels (does not mutate input).
 * Also returns the list of changes for debugging/logging.
 */
export function satiateDrives(
  stack: DriveStack,
  entry: IntegrationEvent | IntegrationAction,
): { stack: DriveStack; changes: Array<{ driveId: string; before: number; after: number }> } {
  const nextDrives = new Map<string, Drive>();
  const changes: Array<{ driveId: string; before: number; after: number }> = [];

  for (const [id, drive] of stack.drives) {
    let totalSatiation = 0;

    for (const binding of drive.satiatedBy) {
      if (matchesBinding(binding, entry)) {
        totalSatiation += binding.amount;
      }
    }

    if (totalSatiation > 0) {
      const before = drive.level;
      const after = clamp01(drive.level + totalSatiation);
      nextDrives.set(id, { ...drive, level: after });
      changes.push({ driveId: id, before, after });
    } else {
      nextDrives.set(id, drive);
    }
  }

  return {
    stack: { ...stack, drives: nextDrives },
    changes,
  };
}

function matchesBinding(
  binding: SatiationBinding,
  entry: IntegrationEvent | IntegrationAction,
): boolean {
  const matcher = binding.matches;

  // Kind must align: event matchers match events, action matchers match actions
  if (matcher.kind === "event" && entry.kind !== "event") return false;
  if (matcher.kind === "action" && entry.kind !== "action") return false;

  // Type must match
  if (matcher.type !== entry.type) return false;

  // If predicate exists, it must pass.
  // At this point, kind alignment is guaranteed by the early returns above.
  if (matcher.kind === "event" && matcher.predicate) {
    return matcher.predicate(entry as IntegrationEvent);
  }
  if (matcher.kind === "action" && matcher.predicate) {
    return matcher.predicate(entry as IntegrationAction);
  }

  return true;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
