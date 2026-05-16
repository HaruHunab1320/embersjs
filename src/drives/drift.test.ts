import { describe, expect, it } from "vitest";
import { applyDrift } from "./drift.js";

describe("applyDrift", () => {
  it("applies linear drift over an hour", () => {
    const result = applyDrift({ kind: "linear", ratePerHour: -0.1 }, 0.8, 3_600_000);
    expect(result).toBeCloseTo(0.7, 5);
  });

  it("applies linear drift over half an hour", () => {
    const result = applyDrift({ kind: "linear", ratePerHour: -0.1 }, 0.8, 1_800_000);
    expect(result).toBeCloseTo(0.75, 5);
  });

  it("clamps to [0, 1]", () => {
    expect(applyDrift({ kind: "linear", ratePerHour: -1 }, 0.1, 3_600_000)).toBe(0);
    expect(applyDrift({ kind: "linear", ratePerHour: 1 }, 0.9, 3_600_000)).toBe(1);
  });

  it("returns current level for dtMs <= 0", () => {
    expect(applyDrift({ kind: "linear", ratePerHour: -0.5 }, 0.5, 0)).toBe(0.5);
    expect(applyDrift({ kind: "linear", ratePerHour: -0.5 }, 0.5, -100)).toBe(0.5);
  });

  it("applies exponential half-life decay", () => {
    const result = applyDrift({ kind: "exponential", halfLifeHours: 24 }, 0.8, 24 * 3_600_000);
    expect(result).toBeCloseTo(0.4, 5);
  });

  it("calls custom compute", () => {
    const result = applyDrift({ kind: "custom", compute: (current) => current * 0.5 }, 0.8, 1_000);
    expect(result).toBe(0.4);
  });
});
