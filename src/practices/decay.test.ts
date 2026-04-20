import { describe, it, expect } from "vitest";
import { applyDecay } from "./decay.js";
import type { DecayFunction } from "../types.js";

const MS_PER_HOUR = 3_600_000;

describe("applyDecay", () => {
  describe("linear decay", () => {
    const decay: DecayFunction = { kind: "linear", ratePerHour: -0.008 };

    it("reduces depth by the correct amount over time", () => {
      // 10 hours: 0.5 + (-0.008 * 10) = 0.42
      const result = applyDecay(decay, 0.5, 10 * MS_PER_HOUR);
      expect(result).toBeCloseTo(0.42, 10);
    });

    it("clamps at 0", () => {
      // 100 hours: 0.5 + (-0.008 * 100) = -0.3 → 0
      const result = applyDecay(decay, 0.5, 100 * MS_PER_HOUR);
      expect(result).toBe(0);
    });

    it("is a no-op when dtMs is 0", () => {
      expect(applyDecay(decay, 0.5, 0)).toBe(0.5);
    });

    it("is a no-op when dtMs is negative", () => {
      expect(applyDecay(decay, 0.5, -1000)).toBe(0.5);
    });
  });

  describe("exponential decay", () => {
    const decay: DecayFunction = { kind: "exponential", halfLifeHours: 168 }; // 1 week

    it("halves depth after one half-life", () => {
      const result = applyDecay(decay, 0.8, 168 * MS_PER_HOUR);
      expect(result).toBeCloseTo(0.4, 10);
    });

    it("quarters depth after two half-lives", () => {
      const result = applyDecay(decay, 0.8, 336 * MS_PER_HOUR);
      expect(result).toBeCloseTo(0.2, 10);
    });
  });

  describe("custom decay", () => {
    it("applies the custom compute function", () => {
      const decay: DecayFunction = {
        kind: "custom",
        compute: (current, dtMs) => current - (dtMs / MS_PER_HOUR) * 0.01,
      };
      const result = applyDecay(decay, 0.5, 10 * MS_PER_HOUR);
      expect(result).toBeCloseTo(0.4, 10);
    });

    it("clamps results to [0, 1]", () => {
      const decay: DecayFunction = { kind: "custom", compute: () => -0.5 };
      expect(applyDecay(decay, 0.1, 1000)).toBe(0);
    });
  });
});
