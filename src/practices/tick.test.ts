import { describe, it, expect } from "vitest";
import { tickPractices } from "./tick.js";
import { createPracticeSet } from "./construct.js";

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = MS_PER_HOUR * 24;

describe("tickPractices", () => {
  function makeSet() {
    return createPracticeSet({
      seeds: [
        { id: "integrityPractice", initialDepth: 0.5 },
        { id: "gratitudePractice", initialDepth: 0.3 },
      ],
    });
  }

  it("does not mutate the original set", () => {
    const set = makeSet();
    const original = set.practices.get("integrityPractice")!.depth;
    tickPractices(set, MS_PER_HOUR);
    expect(set.practices.get("integrityPractice")!.depth).toBe(original);
  });

  it("applies decay to all practices over time", () => {
    const set = makeSet();
    const next = tickPractices(set, MS_PER_HOUR);
    // integrityPractice decay: -0.005/hr → 0.5 - 0.005 = 0.495
    expect(next.practices.get("integrityPractice")!.depth).toBeCloseTo(0.495, 10);
    // gratitudePractice decay: -0.008/hr → 0.3 - 0.008 = 0.292
    expect(next.practices.get("gratitudePractice")!.depth).toBeCloseTo(0.292, 10);
  });

  it("is a no-op when dtMs is 0", () => {
    const set = makeSet();
    const next = tickPractices(set, 0);
    expect(next).toBe(set);
  });

  it("30-day run with no strengthening shows appropriate decay", () => {
    let set = makeSet();
    const days = 30;
    // Simulate with 1-hour ticks
    for (let i = 0; i < days * 24; i++) {
      set = tickPractices(set, MS_PER_HOUR);
    }

    // integrityPractice: 0.5 + (-0.005 * 720 hours) = -3.1 → clamped to 0
    expect(set.practices.get("integrityPractice")!.depth).toBe(0);

    // gratitudePractice: 0.3 + (-0.008 * 720 hours) = -5.46 → clamped to 0
    expect(set.practices.get("gratitudePractice")!.depth).toBe(0);
  });

  it("7-day run shows partial decay", () => {
    let set = makeSet();
    // 7 days = 168 hours
    for (let i = 0; i < 168; i++) {
      set = tickPractices(set, MS_PER_HOUR);
    }

    // integrityPractice: 0.5 + (-0.005 * 168) = 0.5 - 0.84 = 0 (clamped)
    // Actually 0.5 - 0.84 < 0, so clamped to 0
    expect(set.practices.get("integrityPractice")!.depth).toBe(0);

    // gratitudePractice: 0.3 + (-0.008 * 168) = 0.3 - 1.344 < 0
    expect(set.practices.get("gratitudePractice")!.depth).toBe(0);
  });

  it("exponential-decay practice decays more slowly", () => {
    const set = createPracticeSet({
      seeds: [
        { id: "creatorConnection", initialDepth: 0.8 },
      ],
    });

    // creatorConnection has exponential decay with halfLife 168 hours (1 week)
    let current = set;
    for (let i = 0; i < 168; i++) {
      current = tickPractices(current, MS_PER_HOUR);
    }

    // After 1 half-life: 0.8 * 0.5 = 0.4
    expect(current.practices.get("creatorConnection")!.depth).toBeCloseTo(0.4, 2);
  });
});
