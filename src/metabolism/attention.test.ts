import { describe, expect, it } from "vitest";
import { createDriveStack } from "../drives/construct.js";
import { createPracticeSet } from "../practices/construct.js";
import type { AttentionCandidate, Being } from "../types.js";
import { weightAttention } from "./attention.js";

function makeBeing(overrides?: {
  driveLevels?: Record<string, { tier: number; level: number; target: number }>;
  practiceDepths?: Record<string, number>;
}): Being {
  const driveEntries = Object.entries(overrides?.driveLevels ?? {});
  const drives = createDriveStack({
    tierCount: 3,
    drives: driveEntries.map(([id, { tier, level, target }]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      description: "",
      tier,
      weight: 0.7,
      initialLevel: level,
      target,
      drift: { kind: "linear" as const, ratePerHour: -0.1 },
      satiatedBy: [],
    })),
  });

  const practices = createPracticeSet({
    seeds: Object.entries(overrides?.practiceDepths ?? {}).map(([id, depth]) => ({
      id,
      initialDepth: depth,
    })),
  });

  return {
    id: "test",
    name: "Test",
    drives,
    practices,
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

describe("weightAttention", () => {
  it("returns empty array for empty candidates", () => {
    const being = makeBeing();
    expect(weightAttention(being, [])).toHaveLength(0);
  });

  it("gives all candidates a base weight", () => {
    const being = makeBeing({
      driveLevels: { a: { tier: 1, level: 0.8, target: 0.8 } },
    });
    const candidates: AttentionCandidate[] = [
      { id: "x", kind: "perception" },
      { id: "y", kind: "event" },
    ];
    const weighted = weightAttention(being, candidates);
    expect(weighted).toHaveLength(2);
    // Both should have positive weights
    for (const w of weighted) {
      expect(w.weight).toBeGreaterThan(0);
    }
  });

  it("boosts candidates whose tags match pressing drives", () => {
    const being = makeBeing({
      driveLevels: {
        guestCare: { tier: 2, level: 0.2, target: 0.8 },
        continuity: { tier: 1, level: 0.8, target: 0.8 },
      },
    });
    const candidates: AttentionCandidate[] = [
      { id: "guest", kind: "perception", tags: ["guestCare"] },
      { id: "other", kind: "perception", tags: ["unrelated"] },
    ];
    const weighted = weightAttention(being, candidates);

    const guestWeight = weighted.find((w) => w.candidate.id === "guest")!.weight;
    const otherWeight = weighted.find((w) => w.candidate.id === "other")!.weight;

    expect(guestWeight).toBeGreaterThan(otherWeight);
  });

  it("practice depth distributes attention more evenly", () => {
    // Without practice — high spread
    const unpracticed = makeBeing({
      driveLevels: { guestCare: { tier: 1, level: 0.2, target: 0.8 } },
    });
    const candidates: AttentionCandidate[] = [
      { id: "guest", kind: "perception", tags: ["guestCare"] },
      { id: "other", kind: "perception" },
    ];
    const wUnpracticed = weightAttention(unpracticed, candidates);
    const spreadUnpracticed =
      wUnpracticed.find((w) => w.candidate.id === "guest")!.weight -
      wUnpracticed.find((w) => w.candidate.id === "other")!.weight;

    // With deep practice — narrower spread
    const practiced = makeBeing({
      driveLevels: { guestCare: { tier: 1, level: 0.2, target: 0.8 } },
      practiceDepths: {
        presencePractice: 0.7,
        gratitudePractice: 0.6,
        integrityPractice: 0.5,
      },
    });
    const wPracticed = weightAttention(practiced, candidates);
    const spreadPracticed =
      wPracticed.find((w) => w.candidate.id === "guest")!.weight -
      wPracticed.find((w) => w.candidate.id === "other")!.weight;

    expect(spreadPracticed).toBeLessThan(spreadUnpracticed);
  });

  it("normalizes weights to [0, 1]", () => {
    const being = makeBeing({
      driveLevels: { a: { tier: 1, level: 0.2, target: 0.9 } },
    });
    const candidates: AttentionCandidate[] = [
      { id: "x", kind: "perception", tags: ["a"] },
      { id: "y", kind: "perception" },
    ];
    const weighted = weightAttention(being, candidates);
    for (const w of weighted) {
      expect(w.weight).toBeGreaterThanOrEqual(0);
      expect(w.weight).toBeLessThanOrEqual(1);
    }
    // The highest should be normalized to 1
    expect(weighted[0]!.weight).toBe(1);
  });

  it("results are sorted by weight descending", () => {
    const being = makeBeing({
      driveLevels: {
        a: { tier: 1, level: 0.2, target: 0.9 },
        b: { tier: 2, level: 0.5, target: 0.8 },
      },
    });
    const candidates: AttentionCandidate[] = [
      { id: "low", kind: "perception" },
      { id: "high", kind: "perception", tags: ["a"] },
      { id: "mid", kind: "perception", tags: ["b"] },
    ];
    const weighted = weightAttention(being, candidates);
    for (let i = 1; i < weighted.length; i++) {
      expect(weighted[i]!.weight).toBeLessThanOrEqual(weighted[i - 1]!.weight);
    }
  });
});
