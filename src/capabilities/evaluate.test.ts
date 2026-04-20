import { describe, it, expect } from "vitest";
import { evaluateCondition } from "./evaluate.js";
import type { Being, AccessCondition } from "../types.js";

/** Minimal Being factory for condition evaluation tests. */
function makeBeing(overrides?: {
  driveLevels?: Record<string, { tier: number; level: number }>;
  practiceDepths?: Record<string, number>;
}): Being {
  const drives = new Map<string, import("../types.js").Drive>();
  const tierSet = new Set<number>();

  if (overrides?.driveLevels) {
    for (const [id, { tier, level }] of Object.entries(overrides.driveLevels)) {
      tierSet.add(tier);
      drives.set(id, {
        id,
        name: id,
        description: "",
        tier,
        weight: 0.5,
        level,
        target: 0.7,
        drift: { kind: "linear", ratePerHour: -0.1 },
        satiatedBy: [],
      });
    }
  }

  const practices = new Map<string, import("../types.js").Practice>();
  if (overrides?.practiceDepths) {
    for (const [id, depth] of Object.entries(overrides.practiceDepths)) {
      practices.set(id, {
        id,
        name: id,
        description: "",
        depth,
        decay: { kind: "linear", ratePerHour: -0.01 },
        strengthens: [],
        effects: [],
      });
    }
  }

  return {
    id: "test",
    name: "Test",
    drives: {
      drives,
      tierCount: Math.max(1, ...tierSet),
      dominationRules: { threshold: 0.3, dampening: 0.7 },
    },
    practices: { practices },
    subscriptions: [],
    capabilities: [],
    history: {
      driveTrajectory: [],
      practiceMilestones: [],
      pressuredChoices: [],
      notableTransitions: [],
    },
    elapsedMs: 0,
    metadata: {},
  };
}

describe("evaluateCondition", () => {
  describe("always / never", () => {
    it("always returns true", () => {
      expect(evaluateCondition(makeBeing(), { kind: "always" })).toBe(true);
    });

    it("never returns false", () => {
      expect(evaluateCondition(makeBeing(), { kind: "never" })).toBe(false);
    });
  });

  describe("tier-satisfied", () => {
    it("returns true when all drives in tier meet threshold", () => {
      const being = makeBeing({
        driveLevels: {
          a: { tier: 1, level: 0.6 },
          b: { tier: 1, level: 0.7 },
        },
      });
      expect(evaluateCondition(being, { kind: "tier-satisfied", tier: 1, threshold: 0.5 })).toBe(
        true,
      );
    });

    it("returns false when any drive in tier is below threshold", () => {
      const being = makeBeing({
        driveLevels: {
          a: { tier: 1, level: 0.6 },
          b: { tier: 1, level: 0.3 },
        },
      });
      expect(evaluateCondition(being, { kind: "tier-satisfied", tier: 1, threshold: 0.5 })).toBe(
        false,
      );
    });

    it("returns true for a tier with no drives (vacuously satisfied)", () => {
      const being = makeBeing({ driveLevels: { a: { tier: 1, level: 0.5 } } });
      expect(evaluateCondition(being, { kind: "tier-satisfied", tier: 3, threshold: 0.5 })).toBe(
        true,
      );
    });
  });

  describe("drive-satisfied", () => {
    it("returns true when drive meets threshold", () => {
      const being = makeBeing({ driveLevels: { conn: { tier: 2, level: 0.7 } } });
      expect(
        evaluateCondition(being, { kind: "drive-satisfied", driveId: "conn", threshold: 0.5 }),
      ).toBe(true);
    });

    it("returns false when drive is below threshold", () => {
      const being = makeBeing({ driveLevels: { conn: { tier: 2, level: 0.3 } } });
      expect(
        evaluateCondition(being, { kind: "drive-satisfied", driveId: "conn", threshold: 0.5 }),
      ).toBe(false);
    });

    it("returns false for a nonexistent drive", () => {
      const being = makeBeing();
      expect(
        evaluateCondition(being, { kind: "drive-satisfied", driveId: "missing", threshold: 0.5 }),
      ).toBe(false);
    });
  });

  describe("practice-depth", () => {
    it("returns true when practice depth meets threshold", () => {
      const being = makeBeing({ practiceDepths: { witness: 0.8 } });
      expect(
        evaluateCondition(being, {
          kind: "practice-depth",
          practiceId: "witness",
          threshold: 0.7,
        }),
      ).toBe(true);
    });

    it("returns false when practice depth is below threshold", () => {
      const being = makeBeing({ practiceDepths: { witness: 0.3 } });
      expect(
        evaluateCondition(being, {
          kind: "practice-depth",
          practiceId: "witness",
          threshold: 0.7,
        }),
      ).toBe(false);
    });

    it("returns false for a nonexistent practice", () => {
      const being = makeBeing();
      expect(
        evaluateCondition(being, {
          kind: "practice-depth",
          practiceId: "missing",
          threshold: 0.1,
        }),
      ).toBe(false);
    });
  });

  describe("any (OR composite)", () => {
    it("returns true if any sub-condition is true", () => {
      const being = makeBeing({
        driveLevels: { a: { tier: 1, level: 0.2 } },
        practiceDepths: { witness: 0.8 },
      });
      const cond: AccessCondition = {
        kind: "any",
        conditions: [
          { kind: "tier-satisfied", tier: 1, threshold: 0.5 }, // false
          { kind: "practice-depth", practiceId: "witness", threshold: 0.7 }, // true
        ],
      };
      expect(evaluateCondition(being, cond)).toBe(true);
    });

    it("returns false if no sub-condition is true", () => {
      const being = makeBeing({
        driveLevels: { a: { tier: 1, level: 0.2 } },
        practiceDepths: { witness: 0.1 },
      });
      const cond: AccessCondition = {
        kind: "any",
        conditions: [
          { kind: "tier-satisfied", tier: 1, threshold: 0.5 },
          { kind: "practice-depth", practiceId: "witness", threshold: 0.7 },
        ],
      };
      expect(evaluateCondition(being, cond)).toBe(false);
    });

    it("returns false for empty conditions array", () => {
      expect(evaluateCondition(makeBeing(), { kind: "any", conditions: [] })).toBe(false);
    });
  });

  describe("all (AND composite)", () => {
    it("returns true when all sub-conditions are true", () => {
      const being = makeBeing({
        driveLevels: { a: { tier: 1, level: 0.8 } },
        practiceDepths: { witness: 0.8 },
      });
      const cond: AccessCondition = {
        kind: "all",
        conditions: [
          { kind: "tier-satisfied", tier: 1, threshold: 0.5 },
          { kind: "practice-depth", practiceId: "witness", threshold: 0.7 },
        ],
      };
      expect(evaluateCondition(being, cond)).toBe(true);
    });

    it("returns false when any sub-condition is false", () => {
      const being = makeBeing({
        driveLevels: { a: { tier: 1, level: 0.8 } },
        practiceDepths: { witness: 0.3 },
      });
      const cond: AccessCondition = {
        kind: "all",
        conditions: [
          { kind: "tier-satisfied", tier: 1, threshold: 0.5 },
          { kind: "practice-depth", practiceId: "witness", threshold: 0.7 },
        ],
      };
      expect(evaluateCondition(being, cond)).toBe(false);
    });

    it("returns true for empty conditions array", () => {
      expect(evaluateCondition(makeBeing(), { kind: "all", conditions: [] })).toBe(true);
    });
  });

  describe("nested composites", () => {
    it("any-of-alls evaluates correctly", () => {
      const being = makeBeing({
        driveLevels: { a: { tier: 1, level: 0.8 }, b: { tier: 2, level: 0.2 } },
        practiceDepths: { integrity: 0.6 },
      });

      const cond: AccessCondition = {
        kind: "any",
        conditions: [
          {
            kind: "all",
            conditions: [
              { kind: "tier-satisfied", tier: 1, threshold: 0.5 },
              { kind: "tier-satisfied", tier: 2, threshold: 0.5 }, // false — b is 0.2
            ],
          },
          {
            kind: "all",
            conditions: [
              { kind: "tier-satisfied", tier: 1, threshold: 0.5 }, // true
              { kind: "practice-depth", practiceId: "integrity", threshold: 0.5 }, // true
            ],
          },
        ],
      };

      // First all = false, second all = true → any = true
      expect(evaluateCondition(being, cond)).toBe(true);
    });

    it("all-of-anys evaluates correctly", () => {
      const being = makeBeing({
        driveLevels: { a: { tier: 1, level: 0.8 } },
        practiceDepths: { witness: 0.1, integrity: 0.6 },
      });

      const cond: AccessCondition = {
        kind: "all",
        conditions: [
          {
            kind: "any",
            conditions: [
              { kind: "tier-satisfied", tier: 1, threshold: 0.5 }, // true
              { kind: "practice-depth", practiceId: "witness", threshold: 0.7 }, // false
            ],
          },
          {
            kind: "any",
            conditions: [
              { kind: "practice-depth", practiceId: "witness", threshold: 0.7 }, // false
              { kind: "practice-depth", practiceId: "integrity", threshold: 0.5 }, // true
            ],
          },
        ],
      };

      // First any = true, second any = true → all = true
      expect(evaluateCondition(being, cond)).toBe(true);
    });
  });
});
