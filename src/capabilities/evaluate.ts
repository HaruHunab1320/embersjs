/**
 * Condition evaluation: determines whether an AccessCondition is met
 * given a Being's current state.
 *
 * Recursively handles `any` and `all` composites. Practice depth queries
 * compute depth from substrate at evaluation time (depth is derived).
 * Wear-below queries gate against chronic state.
 */

import { isTierSatisfied } from "../drives/query.js";
import { hasPracticeAtDepth } from "../practices/query.js";
import type { AccessCondition, Being } from "../types.js";

/**
 * Evaluates an AccessCondition. Pure function. Returns true if met.
 */
export function evaluateCondition(being: Being, condition: AccessCondition): boolean {
  switch (condition.kind) {
    case "always":
      return true;

    case "never":
      return false;

    case "tier-satisfied":
      return isTierSatisfied(being.drives, condition.tier, condition.threshold);

    case "drive-satisfied": {
      const drive = being.drives.drives.get(condition.driveId);
      if (!drive) return false;
      return drive.level >= condition.threshold;
    }

    case "practice-depth":
      return hasPracticeAtDepth(
        being.practices,
        condition.practiceId,
        being.elapsedMs,
        condition.threshold,
      );

    case "wear-below":
      return being.wear.chronicLoad < condition.threshold;

    case "any":
      return condition.conditions.some((c) => evaluateCondition(being, c));

    case "all":
      return condition.conditions.every((c) => evaluateCondition(being, c));
  }
}
