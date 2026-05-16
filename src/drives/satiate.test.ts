import { describe, expect, it } from "vitest";
import type { DriveStack } from "../types.js";
import { createDriveStack } from "./construct.js";
import { satiateDrives } from "./satiate.js";

function makeStack(): DriveStack {
  return createDriveStack({
    tierCount: 1,
    drives: [
      {
        id: "hunger",
        name: "Hunger",
        description: "test",
        tier: 1,
        weight: 1,
        initialLevel: 0.5,
        target: 0.7,
        drift: { kind: "linear", ratePerHour: 0 },
        satiatedBy: [{ matches: { kind: "event", type: "eat" }, amount: 0.2 }],
      },
    ],
  });
}

describe("satiateDrives", () => {
  it("raises drive level on matching event", () => {
    const stack = makeStack();
    const { stack: next, changes } = satiateDrives(stack, { kind: "event", type: "eat" });
    expect(next.drives.get("hunger")?.level).toBeCloseTo(0.7);
    expect(changes).toHaveLength(1);
  });

  it("ignores non-matching events", () => {
    const stack = makeStack();
    const { stack: next, changes } = satiateDrives(stack, { kind: "event", type: "sleep" });
    expect(next.drives.get("hunger")?.level).toBe(0.5);
    expect(changes).toHaveLength(0);
  });

  it("clamps level to 1", () => {
    const stack = makeStack();
    const { stack: next } = satiateDrives(stack, { kind: "event", type: "eat" });
    const { stack: again } = satiateDrives(next, { kind: "event", type: "eat" });
    const { stack: third } = satiateDrives(again, { kind: "event", type: "eat" });
    expect(third.drives.get("hunger")?.level).toBe(1);
  });

  it("respects optional predicate", () => {
    const stack = createDriveStack({
      tierCount: 1,
      drives: [
        {
          id: "thirst",
          name: "Thirst",
          description: "test",
          tier: 1,
          weight: 1,
          initialLevel: 0.5,
          target: 0.7,
          drift: { kind: "linear", ratePerHour: 0 },
          satiatedBy: [
            {
              matches: {
                kind: "event",
                type: "drink",
                predicate: (e) =>
                  (e.payload as { liquid?: string } | undefined)?.liquid === "water",
              },
              amount: 0.2,
            },
          ],
        },
      ],
    });
    const { changes: c1 } = satiateDrives(stack, {
      kind: "event",
      type: "drink",
      payload: { liquid: "soda" },
    });
    expect(c1).toHaveLength(0);
    const { changes: c2 } = satiateDrives(stack, {
      kind: "event",
      type: "drink",
      payload: { liquid: "water" },
    });
    expect(c2).toHaveLength(1);
  });
});
