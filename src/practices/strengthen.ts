/**
 * Practice strengthening: matching events/actions/states to practice
 * strengtheners and updating depth.
 *
 * The key subtlety: `requiresPressure` strengtheners only fire when
 * the being is under drive pressure. Choosing integrity when it's easy
 * doesn't develop integrityPractice — the pressure is what makes it practice.
 */

import type {
  BeingState,
  DriveStack,
  IntegrationAction,
  IntegrationEvent,
  Practice,
  PracticeSet,
  PracticeStrengthener,
} from "../types.js";
import { clamp01 } from "../util.js";

/**
 * Determines whether the being is currently "under pressure" —
 * whether any drive's level is below the domination threshold.
 */
function isUnderPressure(drives: DriveStack): boolean {
  const { threshold } = drives.dominationRules;
  for (const drive of drives.drives.values()) {
    if (drive.level < threshold) {
      return true;
    }
  }
  return false;
}

/**
 * Applies an event or action to a practice set, strengthening any practices
 * whose strengtheners match.
 *
 * Respects `requiresPressure`: strengtheners with `requiresPressure: true`
 * only fire when the being is under drive pressure.
 *
 * Returns a new PracticeSet with updated depths (does not mutate input).
 * Also returns the list of changes for debugging/logging.
 */
export function strengthenPractices(
  set: PracticeSet,
  entry: IntegrationEvent | IntegrationAction,
  drives: DriveStack,
): {
  set: PracticeSet;
  changes: Array<{ practiceId: string; before: number; after: number }>;
} {
  const pressured = isUnderPressure(drives);
  const beingState: BeingState = { drives, practices: set };
  const nextPractices = new Map<string, Practice>();
  const changes: Array<{ practiceId: string; before: number; after: number }> = [];

  for (const [id, practice] of set.practices) {
    let totalStrength = 0;

    for (const strengthener of practice.strengthens) {
      if (strengthener.requiresPressure && !pressured) {
        continue;
      }

      if (matchesStrengthener(strengthener, entry, beingState)) {
        totalStrength += strengthener.amount;
      }
    }

    if (totalStrength > 0) {
      const before = practice.depth;
      const after = clamp01(practice.depth + totalStrength);
      nextPractices.set(id, { ...practice, depth: after });
      changes.push({ practiceId: id, before, after });
    } else {
      nextPractices.set(id, practice);
    }
  }

  return {
    set: { practices: nextPractices },
    changes,
  };
}

function matchesStrengthener(
  strengthener: PracticeStrengthener,
  entry: IntegrationEvent | IntegrationAction,
  beingState: BeingState,
): boolean {
  const matcher = strengthener.matches;

  switch (matcher.kind) {
    case "event": {
      if (entry.kind !== "event") return false;
      if (matcher.type !== entry.type) return false;
      if (matcher.predicate && !matcher.predicate(entry)) return false;
      return true;
    }
    case "action": {
      if (entry.kind !== "action") return false;
      if (matcher.type !== entry.type) return false;
      if (matcher.predicate && !matcher.predicate(entry)) return false;
      return true;
    }
    case "state": {
      return matcher.predicate(beingState);
    }
  }
}
