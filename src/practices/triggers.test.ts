import { describe, expect, it } from "vitest";
import type { BeingState, PracticeTrigger } from "../types.js";
import { triggerMatches } from "./triggers.js";

const emptyState = {
  drives: {
    drives: new Map(),
    tierCount: 0,
    dominationRules: { threshold: 0.3, attentionDampening: 0.7 },
  },
  practices: { practices: new Map() },
  wear: { perDrive: new Map(), chronicLoad: 0 },
} as unknown as BeingState;

describe("triggerMatches", () => {
  it("matches event triggers by type", () => {
    const trigger: PracticeTrigger = {
      matches: { kind: "event", type: "guest-arrived" },
      requiresPressure: false,
      intent: "test",
      maxContribution: 0.05,
    };
    expect(
      triggerMatches(trigger, { kind: "event", type: "guest-arrived" }, false, emptyState),
    ).toBe(true);
    expect(triggerMatches(trigger, { kind: "event", type: "other" }, false, emptyState)).toBe(
      false,
    );
  });

  it("respects requiresPressure", () => {
    const trigger: PracticeTrigger = {
      matches: { kind: "action", type: "speak" },
      requiresPressure: true,
      intent: "test",
      maxContribution: 0.05,
    };
    expect(triggerMatches(trigger, { kind: "action", type: "speak" }, false, emptyState)).toBe(
      false,
    );
    expect(triggerMatches(trigger, { kind: "action", type: "speak" }, true, emptyState)).toBe(true);
  });

  it("does not cross-match events and actions", () => {
    const eventTrigger: PracticeTrigger = {
      matches: { kind: "event", type: "ping" },
      requiresPressure: false,
      intent: "test",
      maxContribution: 0.05,
    };
    expect(triggerMatches(eventTrigger, { kind: "action", type: "ping" }, false, emptyState)).toBe(
      false,
    );
  });

  it("state matchers fire when predicate is true (regardless of entry)", () => {
    const trigger: PracticeTrigger = {
      matches: { kind: "state", predicate: () => true },
      requiresPressure: false,
      intent: "test",
      maxContribution: 0.02,
    };
    expect(triggerMatches(trigger, undefined, false, emptyState)).toBe(true);
    expect(triggerMatches(trigger, { kind: "event", type: "anything" }, false, emptyState)).toBe(
      true,
    );
  });

  it("event predicate must pass for trigger to match", () => {
    const trigger: PracticeTrigger = {
      matches: {
        kind: "event",
        type: "guest-arrived",
        predicate: (e) => (e.payload as { kind?: string } | undefined)?.kind === "vip",
      },
      requiresPressure: false,
      intent: "test",
      maxContribution: 0.05,
    };
    expect(
      triggerMatches(
        trigger,
        { kind: "event", type: "guest-arrived", payload: { kind: "regular" } },
        false,
        emptyState,
      ),
    ).toBe(false);
    expect(
      triggerMatches(
        trigger,
        { kind: "event", type: "guest-arrived", payload: { kind: "vip" } },
        false,
        emptyState,
      ),
    ).toBe(true);
  });
});
