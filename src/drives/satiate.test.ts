import { describe, expect, it } from "vitest";
import type { IntegrationAction, IntegrationEvent } from "../types.js";
import { createDriveStack } from "./construct.js";
import { satiateDrives } from "./satiate.js";

function makeStack() {
  return createDriveStack({
    tierCount: 3,
    drives: [
      {
        id: "guestCare",
        name: "Guest Care",
        description: "Tend to guests.",
        tier: 2,
        weight: 0.8,
        initialLevel: 0.4,
        target: 0.7,
        drift: { kind: "linear", ratePerHour: -0.05 },
        satiatedBy: [
          { matches: { kind: "action", type: "speak" }, amount: 0.1 },
          { matches: { kind: "action", type: "tend-guest" }, amount: 0.2 },
          {
            matches: {
              kind: "event",
              type: "guest-arrived",
              predicate: (e) => e.payload?.returning === true,
            },
            amount: 0.15,
          },
        ],
      },
      {
        id: "continuity",
        name: "Continuity",
        description: "Persist.",
        tier: 1,
        weight: 0.9,
        initialLevel: 0.8,
        target: 0.9,
        drift: { kind: "linear", ratePerHour: -0.02 },
        satiatedBy: [{ matches: { kind: "event", type: "integrity-check-passed" }, amount: 0.15 }],
      },
      {
        id: "connection",
        name: "Connection",
        description: "Contact.",
        tier: 3,
        weight: 0.7,
        initialLevel: 0.3,
        target: 0.6,
        drift: { kind: "linear", ratePerHour: -0.05 },
        satiatedBy: [{ matches: { kind: "event", type: "meaningful-exchange" }, amount: 0.25 }],
      },
    ],
  });
}

describe("satiateDrives", () => {
  it("satiates the matching drive by the binding amount", () => {
    const stack = makeStack();
    const action: IntegrationAction = { kind: "action", type: "speak" };
    const { stack: next, changes } = satiateDrives(stack, action);

    expect(next.drives.get("guestCare")!.level).toBeCloseTo(0.5, 10);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.driveId).toBe("guestCare");
    expect(changes[0]!.before).toBeCloseTo(0.4, 10);
    expect(changes[0]!.after).toBeCloseTo(0.5, 10);
  });

  it("does not satiate non-matching drives", () => {
    const stack = makeStack();
    const action: IntegrationAction = { kind: "action", type: "speak" };
    const { stack: next } = satiateDrives(stack, action);

    // continuity and connection should be unchanged
    expect(next.drives.get("continuity")!.level).toBe(0.8);
    expect(next.drives.get("connection")!.level).toBe(0.3);
  });

  it("an event matching a binding increments the drive level", () => {
    const stack = makeStack();
    const event: IntegrationEvent = { kind: "event", type: "meaningful-exchange" };
    const { stack: next, changes } = satiateDrives(stack, event);

    expect(next.drives.get("connection")!.level).toBeCloseTo(0.55, 10);
    expect(changes).toHaveLength(1);
  });

  it("multiple bindings on one drive stack correctly for one event", () => {
    // guestCare has both "speak" and "tend-guest" action bindings
    // but a single "speak" action should only match the "speak" binding
    const stack = makeStack();
    const action: IntegrationAction = { kind: "action", type: "tend-guest" };
    const { stack: next } = satiateDrives(stack, action);

    // tend-guest gives +0.2
    expect(next.drives.get("guestCare")!.level).toBeCloseTo(0.6, 10);
  });

  it("predicate-based matching works", () => {
    const stack = makeStack();
    // returning guest — predicate should pass
    const event: IntegrationEvent = {
      kind: "event",
      type: "guest-arrived",
      payload: { returning: true },
    };
    const { stack: next, changes } = satiateDrives(stack, event);

    expect(next.drives.get("guestCare")!.level).toBeCloseTo(0.55, 10);
    expect(changes).toHaveLength(1);
  });

  it("predicate rejection prevents satiation", () => {
    const stack = makeStack();
    // new guest — predicate checks for returning: true
    const event: IntegrationEvent = {
      kind: "event",
      type: "guest-arrived",
      payload: { returning: false },
    };
    const { stack: next, changes } = satiateDrives(stack, event);

    expect(next.drives.get("guestCare")!.level).toBe(0.4);
    expect(changes).toHaveLength(0);
  });

  it("clamps at 1 when over-satiated", () => {
    const stack = makeStack();
    // connection is at 0.3, meaningful-exchange gives +0.25
    // Apply it 4 times: 0.3 → 0.55 → 0.8 → 1.0 → 1.0
    let current = stack;
    const event: IntegrationEvent = { kind: "event", type: "meaningful-exchange" };
    for (let i = 0; i < 4; i++) {
      current = satiateDrives(current, event).stack;
    }
    expect(current.drives.get("connection")!.level).toBe(1);
  });

  it("does not mutate the original stack", () => {
    const stack = makeStack();
    const original = stack.drives.get("guestCare")!.level;
    satiateDrives(stack, { kind: "action", type: "speak" });
    expect(stack.drives.get("guestCare")!.level).toBe(original);
  });

  it("action matcher does not match events", () => {
    const stack = makeStack();
    // "speak" is an action binding on guestCare; an event with type "speak" should not match
    const event: IntegrationEvent = { kind: "event", type: "speak" };
    const { changes } = satiateDrives(stack, event);
    expect(changes).toHaveLength(0);
  });

  it("event matcher does not match actions", () => {
    const stack = makeStack();
    // "integrity-check-passed" is an event binding on continuity
    const action: IntegrationAction = { kind: "action", type: "integrity-check-passed" };
    const { changes } = satiateDrives(stack, action);
    expect(changes).toHaveLength(0);
  });
});
