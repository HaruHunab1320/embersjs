import { describe, expect, it } from "vitest";
import { createDriveStack } from "./construct.js";
import {
  dominantTier,
  drivePressure,
  isTierSatisfied,
  pressingDrives,
  weightedPressure,
} from "./query.js";

function makeStack() {
  return createDriveStack({
    tierCount: 2,
    drives: [
      {
        id: "safety",
        name: "Safety",
        description: "t",
        tier: 1,
        weight: 1,
        initialLevel: 0.2,
        target: 0.8,
        drift: { kind: "linear", ratePerHour: 0 },
        satiatedBy: [],
      },
      {
        id: "belonging",
        name: "Belonging",
        description: "t",
        tier: 2,
        weight: 0.5,
        initialLevel: 0.7,
        target: 0.6,
        drift: { kind: "linear", ratePerHour: 0 },
        satiatedBy: [],
      },
    ],
  });
}

describe("drives/query", () => {
  it("drivePressure = max(0, target - level)", () => {
    const stack = makeStack();
    const safety = stack.drives.get("safety")!;
    const belonging = stack.drives.get("belonging")!;
    expect(drivePressure(safety)).toBeCloseTo(0.6);
    expect(drivePressure(belonging)).toBe(0); // target met
  });

  it("weightedPressure = pressure * weight", () => {
    const safety = makeStack().drives.get("safety")!;
    expect(weightedPressure(safety)).toBeCloseTo(0.6); // weight = 1
  });

  it("pressingDrives finds drives at/below threshold", () => {
    const stack = makeStack();
    const pressing = pressingDrives(stack, 0.3);
    expect(pressing.map((d) => d.id)).toEqual(["safety"]);
  });

  it("dominantTier identifies lowest tier with critically-low drive", () => {
    const stack = makeStack();
    expect(dominantTier(stack)).toBe(1);
  });

  it("isTierSatisfied checks all drives in a tier above threshold", () => {
    const stack = makeStack();
    expect(isTierSatisfied(stack, 1, 0.5)).toBe(false);
    expect(isTierSatisfied(stack, 2, 0.5)).toBe(true);
  });
});
