import { describe, expect, it } from "vitest";
import { createPracticeSet } from "./construct.js";
import {
  activePractices,
  averagePracticeDepth,
  hasPracticeAtDepth,
  practiceDepth,
  practicesByDepth,
} from "./query.js";

function makeSet() {
  return createPracticeSet({
    seeds: [
      { id: "integrityPractice", initialDepth: 0.3 },
      { id: "gratitudePractice", initialDepth: 0.6 },
      { id: "witnessPractice", initialDepth: 0.05 },
    ],
  });
}

describe("practiceDepth", () => {
  it("returns the depth of a present practice", () => {
    expect(practiceDepth(makeSet(), "integrityPractice")).toBe(0.3);
  });

  it("returns 0 for a missing practice", () => {
    expect(practiceDepth(makeSet(), "nonexistent")).toBe(0);
  });
});

describe("hasPracticeAtDepth", () => {
  it("returns true when depth meets threshold", () => {
    expect(hasPracticeAtDepth(makeSet(), "gratitudePractice", 0.5)).toBe(true);
  });

  it("returns false when depth is below threshold", () => {
    expect(hasPracticeAtDepth(makeSet(), "integrityPractice", 0.5)).toBe(false);
  });

  it("returns false for a missing practice", () => {
    expect(hasPracticeAtDepth(makeSet(), "nonexistent", 0.1)).toBe(false);
  });

  it("returns true when depth exactly equals threshold", () => {
    expect(hasPracticeAtDepth(makeSet(), "integrityPractice", 0.3)).toBe(true);
  });
});

describe("practicesByDepth", () => {
  it("returns practices sorted by depth descending", () => {
    const sorted = practicesByDepth(makeSet());
    expect(sorted[0]!.id).toBe("gratitudePractice");
    expect(sorted[1]!.id).toBe("integrityPractice");
    expect(sorted[2]!.id).toBe("witnessPractice");
  });
});

describe("activePractices", () => {
  it("returns practices above the default threshold (0.1)", () => {
    const active = activePractices(makeSet());
    expect(active).toHaveLength(2);
    const ids = active.map((p) => p.id);
    expect(ids).toContain("integrityPractice");
    expect(ids).toContain("gratitudePractice");
    // witnessPractice at 0.05 should be excluded
    expect(ids).not.toContain("witnessPractice");
  });

  it("respects custom minimum threshold", () => {
    const active = activePractices(makeSet(), 0.5);
    expect(active).toHaveLength(1);
    expect(active[0]!.id).toBe("gratitudePractice");
  });
});

describe("averagePracticeDepth", () => {
  it("returns the mean depth across all practices", () => {
    // (0.3 + 0.6 + 0.05) / 3 ≈ 0.3167
    expect(averagePracticeDepth(makeSet())).toBeCloseTo(0.95 / 3, 10);
  });

  it("returns 0 for an empty set", () => {
    const set = createPracticeSet({});
    expect(averagePracticeDepth(set)).toBe(0);
  });
});
