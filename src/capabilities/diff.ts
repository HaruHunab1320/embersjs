/**
 * Capability diff: computes what changed between two capability snapshots.
 * Useful for logging when capabilities shift.
 */

import type { Capability } from "../types.js";

export interface CapabilityDiff {
  /** Capabilities that became available. */
  readonly gained: readonly Capability[];
  /** Capabilities that became unavailable. */
  readonly lost: readonly Capability[];
  /** Capabilities that remained available. */
  readonly retained: readonly Capability[];
}

/**
 * Computes the difference between two capability lists.
 *
 * @param before - capabilities available before
 * @param after - capabilities available after
 */
export function capabilityDiff(
  before: readonly Capability[],
  after: readonly Capability[],
): CapabilityDiff {
  const beforeIds = new Set(before.map((c) => c.id));
  const afterIds = new Set(after.map((c) => c.id));

  return {
    gained: after.filter((c) => !beforeIds.has(c.id)),
    lost: before.filter((c) => !afterIds.has(c.id)),
    retained: after.filter((c) => beforeIds.has(c.id)),
  };
}
