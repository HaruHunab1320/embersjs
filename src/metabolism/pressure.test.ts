import { describe, it, expect } from "vitest";
import { computeFeltPressures, dominantDrives, totalFeltPressure } from "./pressure.js";
import { createDriveStack } from "../drives/construct.js";
import { composeEffects } from "../practices/effects.js";
import { createPracticeSet } from "../practices/construct.js";

const MS_PER_HOUR = 3_600_000;

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
        initialLevel: 0.2, // below domination threshold
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
        initialLevel: 0.5,
        target: 0.7,
        drift: { kind: "linear", ratePerHour: -0.05 },
        satiatedBy: [],
      },
      {
        id: "understanding",
        name: "Understanding",
        description: "Comprehend.",
        tier: 3,
        weight: 0.6,
        initialLevel: 0.3,
        target: 0.7,
        drift: { kind: "linear", ratePerHour: -0.01 },
        satiatedBy: [],
      },
    ],
  });
}

describe("computeFeltPressures", () => {
  it("computes raw pressure as target - level", () => {
    const stack = makeStack();
    const effects = composeEffects(createPracticeSet({}));
    const pressures = computeFeltPressures(stack, effects);

    const cont = pressures.find((p) => p.drive.id === "continuity")!;
    expect(cont.rawPressure).toBeCloseTo(0.7, 10); // 0.9 - 0.2
  });

  it("applies tier domination — higher tiers dampened when lower tier dominates", () => {
    const stack = makeStack(); // continuity at 0.2, below threshold 0.3
    const effects = composeEffects(createPracticeSet({}));
    const pressures = computeFeltPressures(stack, effects);

    const cont = pressures.find((p) => p.drive.id === "continuity")!;
    const guest = pressures.find((p) => p.drive.id === "guestCare")!;

    // continuity is tier 1, at 0.2 — it dominates
    // guestCare is tier 2 — it should be dampened
    // weighted = 0.2 * 0.8 = 0.16, dominated = 0.16 * (1 - 0.7) = 0.048
    expect(guest.dominatedPressure).toBeCloseTo(guest.weightedPressure * 0.3, 10);

    // continuity itself (tier 1) should NOT be dampened
    expect(cont.dominatedPressure).toBe(cont.weightedPressure);
  });

  it("applies practice dampening effects", () => {
    const stack = makeStack();
    const practices = createPracticeSet({
      seeds: [{ id: "gratitudePractice", initialDepth: 0.5 }],
    });
    const effects = composeEffects(practices);
    const pressures = computeFeltPressures(stack, effects);

    // Global dampening: 0.3 * 0.5 = 0.15
    // Every drive's feltPressure should be dominatedPressure * (1 - 0.15)
    for (const p of pressures) {
      expect(p.feltPressure).toBeCloseTo(p.dominatedPressure * 0.85, 5);
    }
  });

  it("results are sorted by felt pressure descending", () => {
    const stack = makeStack();
    const effects = composeEffects(createPracticeSet({}));
    const pressures = computeFeltPressures(stack, effects);

    for (let i = 1; i < pressures.length; i++) {
      expect(pressures[i]!.feltPressure).toBeLessThanOrEqual(pressures[i - 1]!.feltPressure);
    }
  });
});

describe("dominantDrives", () => {
  it("returns top N by felt pressure", () => {
    const stack = makeStack();
    const effects = composeEffects(createPracticeSet({}));
    const pressures = computeFeltPressures(stack, effects);
    const top = dominantDrives(pressures, 2);

    expect(top).toHaveLength(2);
    expect(top[0]!.feltPressure).toBeGreaterThanOrEqual(top[1]!.feltPressure);
  });
});

describe("totalFeltPressure", () => {
  it("sums all felt pressures", () => {
    const stack = makeStack();
    const effects = composeEffects(createPracticeSet({}));
    const pressures = computeFeltPressures(stack, effects);
    const total = totalFeltPressure(pressures);

    const manual = pressures.reduce((s, p) => s + p.feltPressure, 0);
    expect(total).toBeCloseTo(manual, 10);
    expect(total).toBeGreaterThan(0);
  });
});
