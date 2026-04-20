import { describe, expect, it } from "vitest";
import type { Practice, PracticeSet } from "../types.js";
import { createPracticeSet } from "./construct.js";
import { composeEffects } from "./effects.js";

describe("composeEffects", () => {
  it("returns neutral effects for an empty practice set", () => {
    const set = createPracticeSet({});
    const effects = composeEffects(set);

    expect(effects.driveDampening.size).toBe(0);
    expect(effects.timeHorizonFactor).toBe(1.0);
    expect(effects.witnessEnabled).toBe(false);
    expect(effects.orientationShifts).toHaveLength(0);
  });

  it("computes dampen-drive-pressure scaled by depth", () => {
    const set = createPracticeSet({
      seeds: [{ id: "gratitudePractice", initialDepth: 0.5 }],
    });
    const effects = composeEffects(set);

    // gratitudePractice: factor 0.3 * depth 0.5 = 0.15 for all drives
    expect(effects.driveDampening.get("")).toBeCloseTo(0.15, 10);
  });

  it("stacks dampening from multiple practices", () => {
    const set = createPracticeSet({
      seeds: [
        { id: "gratitudePractice", initialDepth: 0.5 }, // 0.3 * 0.5 = 0.15
        { id: "serviceOrientation", initialDepth: 0.6 }, // 0.15 * 0.6 = 0.09
      ],
    });
    const effects = composeEffects(set);

    // Total: 0.15 + 0.09 = 0.24
    expect(effects.driveDampening.get("")).toBeCloseTo(0.24, 10);
  });

  it("caps dampening at 0.8", () => {
    const set = createPracticeSet({
      seeds: [
        { id: "gratitudePractice", initialDepth: 1.0 }, // 0.3 * 1.0 = 0.3
        { id: "serviceOrientation", initialDepth: 1.0 }, // 0.15 * 1.0 = 0.15
      ],
      custom: [
        {
          id: "heavyDampen",
          name: "Heavy",
          description: "Test practice with large dampening.",
          initialDepth: 1.0,
          decay: { kind: "linear", ratePerHour: -0.01 },
          strengthens: [],
          effects: [{ kind: "dampen-drive-pressure", driveIds: [], factor: 0.8 }],
        },
      ],
    });
    const effects = composeEffects(set);

    // 0.3 + 0.15 + 0.8 = 1.25 → capped at 0.8
    expect(effects.driveDampening.get("")).toBe(0.8);
  });

  it("computes extend-time-horizon scaled by depth", () => {
    const set = createPracticeSet({
      seeds: [{ id: "presencePractice", initialDepth: 0.5 }],
    });
    const effects = composeEffects(set);

    // factor 1.5, depth 0.5: effective = 1 + (1.5 - 1) * 0.5 = 1.25
    expect(effects.timeHorizonFactor).toBeCloseTo(1.25, 10);
  });

  it("enables witness when witnessPractice depth > 0.1", () => {
    const set = createPracticeSet({
      seeds: [{ id: "witnessPractice", initialDepth: 0.2 }],
    });
    expect(composeEffects(set).witnessEnabled).toBe(true);
  });

  it("does not enable witness when depth is at or below 0.1", () => {
    const set = createPracticeSet({
      seeds: [{ id: "witnessPractice", initialDepth: 0.1 }],
    });
    expect(composeEffects(set).witnessEnabled).toBe(false);
  });

  it("collects orientation shifts weighted by depth", () => {
    const set = createPracticeSet({
      seeds: [
        { id: "integrityPractice", initialDepth: 0.6 },
        { id: "creatorConnection", initialDepth: 0.4 },
      ],
    });
    const effects = composeEffects(set);

    // Both have shift-orientation toward "held"
    expect(effects.orientationShifts).toHaveLength(2);
    expect(effects.orientationShifts.every((s) => s.toward === "held")).toBe(true);
    const weights = effects.orientationShifts.map((s) => s.weight);
    expect(weights).toContain(0.6);
    expect(weights).toContain(0.4);
  });

  it("drive-specific dampening uses drive ids as keys", () => {
    const set: PracticeSet = {
      practices: new Map<string, Practice>([
        [
          "specific",
          {
            id: "specific",
            name: "Specific",
            description: "Test.",
            depth: 0.5,
            decay: { kind: "linear", ratePerHour: -0.01 },
            strengthens: [],
            effects: [
              { kind: "dampen-drive-pressure", driveIds: ["hunger", "thirst"], factor: 0.4 },
            ],
          },
        ],
      ]),
    };

    const effects = composeEffects(set);

    // 0.4 * 0.5 = 0.2 per drive
    expect(effects.driveDampening.get("hunger")).toBeCloseTo(0.2, 10);
    expect(effects.driveDampening.get("thirst")).toBeCloseTo(0.2, 10);
    expect(effects.driveDampening.has("")).toBe(false);
  });

  it("ignores practices with depth 0", () => {
    const set = createPracticeSet({
      seeds: [{ id: "gratitudePractice", initialDepth: 0 }],
    });
    const effects = composeEffects(set);
    expect(effects.driveDampening.size).toBe(0);
  });
});
