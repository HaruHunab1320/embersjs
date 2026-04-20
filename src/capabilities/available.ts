/**
 * Determines which capabilities are currently available to a Being
 * based on its subscriptions and current state.
 */

import type { Being, Capability } from "../types.js";
import { evaluateCondition } from "./evaluate.js";

/**
 * Returns all capabilities currently available to the Being.
 *
 * A capability is available if it has at least one subscription
 * whose condition is met. Capabilities without any subscription
 * are not available.
 *
 * Pure function.
 */
export function availableCapabilities(being: Being): Capability[] {
  const availableIds = new Set<string>();

  for (const sub of being.subscriptions) {
    if (evaluateCondition(being, sub.when)) {
      availableIds.add(sub.capabilityId);
    }
  }

  return being.capabilities.filter((cap) => availableIds.has(cap.id));
}
