import { describe, expect, it } from "vitest";
import { createDriveStack } from "./construct.js";
import {
  dominantTier,
  drivePressure,
  drivesInTier,
  isTierSatisfied,
  pressingDrives,
  topDrivesByPressure,
  weightedPressure,
} from "./query.js";

function makeStack() {
  return createDriveStack({
    tierCount: 3,
    drives: [
      {
        id: "continuity",
        name: "Continuity",
        description: "Persist.",
        tier: 1,
        weight: 0.9,
        initialLevel: 0.2, // below domination threshold (0.3)
        target: 0.9,
        drift: { kind: "linear", ratePerHour: -0.1 },
        satiatedBy: [],
      },
      {
        id: "guestCare",
        name: "Guest Care",
        description: "Tend to guests.",
        tier: 2,
        weight: 0.8,
        initialLevel: 0.6,
        target: 0.7,
        drift: { kind: "linear", ratePerHour: -0.05 },
        satiatedBy: [],
      },
      {
        id: "placeIntegrity",
        name: "Place Integrity",
        description: "Maintain the place.",
        tier: 2,
        weight: 0.5,
        initialLevel: 0.9,
        target: 0.8,
        drift: { kind: "linear", ratePerHour: -0.03 },
        satiatedBy: [],
      },
      {
        id: "understanding",
        name: "Understanding",
        description: "Comprehend.",
        tier: 3,
        weight: 0.6,
        initialLevel: 0.4,
        target: 0.7,
        drift: { kind: "linear", ratePerHour: -0.01 },
        satiatedBy: [],
      },
    ],
  });
}

describe("drivePressure", () => {
  it("returns target - level when level is below target", () => {
    const drive = makeStack().drives.get("continuity")!;
    expect(drivePressure(drive)).toBeCloseTo(0.7, 10); // 0.9 - 0.2
  });

  it("returns 0 when level is at or above target", () => {
    const drive = makeStack().drives.get("placeIntegrity")!;
    expect(drivePressure(drive)).toBe(0); // 0.9 >= 0.8
  });
});

describe("weightedPressure", () => {
  it("returns pressure * weight", () => {
    const drive = makeStack().drives.get("continuity")!;
    expect(weightedPressure(drive)).toBeCloseTo(0.7 * 0.9, 10);
  });
});

describe("pressingDrives", () => {
  it("returns drives at or below the threshold", () => {
    const stack = makeStack();
    const pressing = pressingDrives(stack, 0.3);
    expect(pressing).toHaveLength(1);
    expect(pressing[0]!.id).toBe("continuity");
  });

  it("returns empty array when no drives are pressing", () => {
    const stack = makeStack();
    const pressing = pressingDrives(stack, 0.1);
    expect(pressing).toHaveLength(0);
  });

  it("returns multiple drives at a higher threshold", () => {
    const stack = makeStack();
    const pressing = pressingDrives(stack, 0.5);
    const ids = pressing.map((d) => d.id);
    expect(ids).toContain("continuity");
    expect(ids).toContain("understanding");
  });
});

describe("dominantTier", () => {
  it("returns the lowest tier with a drive below domination threshold", () => {
    const stack = makeStack();
    // continuity (tier 1) is at 0.2, below threshold 0.3
    expect(dominantTier(stack)).toBe(1);
  });

  it("returns undefined when no drives are below threshold", () => {
    const stack = createDriveStack({
      tierCount: 2,
      drives: [
        {
          id: "a",
          name: "A",
          description: "",
          tier: 1,
          weight: 0.5,
          initialLevel: 0.8,
          target: 0.5,
          drift: { kind: "linear", ratePerHour: -0.1 },
          satiatedBy: [],
        },
      ],
    });
    expect(dominantTier(stack)).toBeUndefined();
  });
});

describe("isTierSatisfied", () => {
  it("returns false when a drive in the tier is below threshold", () => {
    const stack = makeStack();
    expect(isTierSatisfied(stack, 1, 0.5)).toBe(false);
  });

  it("returns true when all drives in the tier meet threshold", () => {
    const stack = makeStack();
    expect(isTierSatisfied(stack, 2, 0.5)).toBe(true);
  });

  it("returns true for an empty tier", () => {
    const stack = createDriveStack({ tierCount: 3, drives: [] });
    expect(isTierSatisfied(stack, 2, 0.5)).toBe(true);
  });
});

describe("drivesInTier", () => {
  it("returns all drives in the given tier sorted by pressure", () => {
    const stack = makeStack();
    const tier2 = drivesInTier(stack, 2);
    expect(tier2).toHaveLength(2);
    // guestCare has more pressure than placeIntegrity (which is over-satisfied)
    expect(tier2[0]!.id).toBe("guestCare");
    expect(tier2[1]!.id).toBe("placeIntegrity");
  });

  it("returns empty array for tier with no drives", () => {
    const stack = createDriveStack({ tierCount: 5, drives: [] });
    expect(drivesInTier(stack, 4)).toHaveLength(0);
  });
});

describe("topDrivesByPressure", () => {
  it("returns the top N drives by weighted pressure", () => {
    const stack = makeStack();
    const top = topDrivesByPressure(stack, 2);
    expect(top).toHaveLength(2);
    // continuity has highest weighted pressure: 0.7 * 0.9 = 0.63
    expect(top[0]!.id).toBe("continuity");
  });

  it("returns all drives when N exceeds drive count", () => {
    const stack = makeStack();
    const top = topDrivesByPressure(stack, 100);
    expect(top).toHaveLength(4);
  });
});
