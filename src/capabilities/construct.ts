/**
 * Factory functions for creating Capabilities and Subscriptions.
 */

import type { Capability, CapabilityKind, Subscription, AccessCondition } from "../types.js";

/**
 * Creates a Capability.
 */
export function createCapability(config: {
  id: string;
  name: string;
  description: string;
  kind: CapabilityKind;
  payload?: Record<string, unknown>;
}): Capability {
  return { ...config };
}

/**
 * Creates a Subscription binding a capability to an access condition.
 */
export function createSubscription(config: {
  capabilityId: string;
  when: AccessCondition;
  because?: string;
}): Subscription {
  return { ...config };
}
