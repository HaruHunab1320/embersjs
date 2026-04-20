import { describe, expect, it } from "vitest";
import type { DriftFunction } from "../types.js";
import { applyDrift } from "./drift.js";

const MS_PER_HOUR = 3_600_000;

describe("applyDrift", () => {
  describe("linear drift", () => {
    const drift: DriftFunction = { kind: "linear", ratePerHour: -0.1 };

    it("a drive at 0.8 is at 0.75 after 30 simulated minutes", () => {
      const result = applyDrift(drift, 0.8, 30 * 60_000);
      expect(result).toBeCloseTo(0.75, 10);
    });

    it("drifts the full rate over one hour", () => {
      const result = applyDrift(drift, 1.0, MS_PER_HOUR);
      expect(result).toBeCloseTo(0.9, 10);
    });

    it("clamps at 0 — level never goes negative", () => {
      const result = applyDrift(drift, 0.05, MS_PER_HOUR);
      expect(result).toBe(0);
    });

    it("clamps at 1 — positive drift doesn't exceed 1", () => {
      const upDrift: DriftFunction = { kind: "linear", ratePerHour: 0.5 };
      const result = applyDrift(upDrift, 0.9, MS_PER_HOUR);
      expect(result).toBe(1);
    });

    it("returns current level when dtMs is 0", () => {
      const result = applyDrift(drift, 0.5, 0);
      expect(result).toBe(0.5);
    });

    it("returns current level when dtMs is negative", () => {
      const result = applyDrift(drift, 0.5, -1000);
      expect(result).toBe(0.5);
    });
  });

  describe("exponential drift", () => {
    const drift: DriftFunction = { kind: "exponential", halfLifeHours: 24 };

    it("halves the level after one half-life", () => {
      const result = applyDrift(drift, 1.0, 24 * MS_PER_HOUR);
      expect(result).toBeCloseTo(0.5, 10);
    });

    it("quarters the level after two half-lives", () => {
      const result = applyDrift(drift, 1.0, 48 * MS_PER_HOUR);
      expect(result).toBeCloseTo(0.25, 10);
    });

    it("decays from 0.8 over 12 hours correctly", () => {
      // 0.8 * 0.5^(12/24) = 0.8 * 0.5^0.5 = 0.8 * ~0.7071 ≈ 0.5657
      const result = applyDrift(drift, 0.8, 12 * MS_PER_HOUR);
      expect(result).toBeCloseTo(0.8 * Math.SQRT1_2, 10);
    });

    it("returns current level when dtMs is 0", () => {
      const result = applyDrift(drift, 0.5, 0);
      expect(result).toBe(0.5);
    });
  });

  describe("custom drift", () => {
    it("applies the custom compute function", () => {
      const drift: DriftFunction = {
        kind: "custom",
        compute: (current, dtMs) => current - (dtMs / MS_PER_HOUR) * 0.2,
      };
      const result = applyDrift(drift, 1.0, MS_PER_HOUR);
      expect(result).toBeCloseTo(0.8, 10);
    });

    it("clamps custom compute results to [0, 1]", () => {
      const drift: DriftFunction = {
        kind: "custom",
        compute: () => -0.5,
      };
      expect(applyDrift(drift, 0.1, 1000)).toBe(0);

      const drift2: DriftFunction = {
        kind: "custom",
        compute: () => 1.5,
      };
      expect(applyDrift(drift2, 0.9, 1000)).toBe(1);
    });
  });
});
