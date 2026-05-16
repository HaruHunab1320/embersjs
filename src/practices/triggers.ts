/**
 * Trigger matching: tests whether a PracticeTrigger matches an event/action
 * given the being's current state and pressure status.
 */

import type { BeingState, IntegrationAction, IntegrationEvent, PracticeTrigger } from "../types.js";

/**
 * Returns true if the trigger fires for this entry under these conditions.
 *
 * - State matchers fire when their predicate is satisfied (entry is irrelevant).
 * - Event/action matchers fire when entry.kind aligns and type matches.
 * - If `requiresPressure` is set, the being must be under pressure.
 */
export function triggerMatches(
  trigger: PracticeTrigger,
  entry: IntegrationEvent | IntegrationAction | undefined,
  underPressure: boolean,
  state: BeingState,
): boolean {
  if (trigger.requiresPressure && !underPressure) {
    return false;
  }

  const matcher = trigger.matches;

  if (matcher.kind === "state") {
    return matcher.predicate(state);
  }

  if (!entry) return false;

  if (matcher.kind === "event") {
    if (entry.kind !== "event") return false;
    if (matcher.type !== entry.type) return false;
    if (matcher.predicate && !matcher.predicate(entry)) return false;
    return true;
  }

  // matcher.kind === "action"
  if (entry.kind !== "action") return false;
  if (matcher.type !== entry.type) return false;
  if (matcher.predicate && !matcher.predicate(entry)) return false;
  return true;
}
