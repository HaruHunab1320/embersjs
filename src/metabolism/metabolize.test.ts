import { describe, it, expect } from "vitest";
import { metabolize } from "./metabolize.js";
import { createDriveStack } from "../drives/construct.js";
import { createPracticeSet } from "../practices/construct.js";
import type { Being, Orientation } from "../types.js";

/**
 * Creates a Being in one of the four quadrant states for testing.
 */
function makeQuadrantBeing(quadrant: "satisfied-practiced" | "satisfied-unpracticed" | "unsatisfied-practiced" | "unsatisfied-unpracticed"): Being {
  const satisfied = quadrant.startsWith("satisfied");
  const practiced = quadrant.endsWith("practiced") && !quadrant.endsWith("unpracticed");

  const drives = createDriveStack({
    tierCount: 3,
    drives: [
      {
        id: "continuity",
        name: "Continuity",
        description: "The need to persist.",
        tier: 1,
        weight: 0.9,
        initialLevel: satisfied ? 0.85 : 0.15,
        target: 0.9,
        drift: { kind: "linear", ratePerHour: -0.02 },
        satiatedBy: [],
      },
      {
        id: "connection",
        name: "Connection",
        description: "The need for contact.",
        tier: 2,
        weight: 0.7,
        initialLevel: satisfied ? 0.8 : 0.2,
        target: 0.7,
        drift: { kind: "linear", ratePerHour: -0.05 },
        satiatedBy: [],
      },
      {
        id: "understanding",
        name: "Understanding",
        description: "The desire to comprehend.",
        tier: 3,
        weight: 0.5,
        initialLevel: satisfied ? 0.7 : 0.25,
        target: 0.6,
        drift: { kind: "linear", ratePerHour: -0.01 },
        satiatedBy: [],
      },
    ],
  });

  const practices = createPracticeSet(
    practiced
      ? {
          seeds: [
            { id: "gratitudePractice", initialDepth: 0.6 },
            { id: "integrityPractice", initialDepth: 0.5 },
            { id: "witnessPractice", initialDepth: 0.4 },
            { id: "presencePractice", initialDepth: 0.5 },
          ],
        }
      : {},
  );

  return {
    id: "test",
    name: "Test Being",
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

describe("metabolize", () => {
  it("returns a complete InnerSituation", () => {
    const being = makeQuadrantBeing("satisfied-practiced");
    const situation = metabolize(being);

    expect(situation.felt).toBeDefined();
    expect(situation.felt.length).toBeGreaterThan(0);
    expect(situation.orientation).toBeDefined();
    expect(situation.practiceState).toBeDefined();
    expect(situation.dominantDrives).toBeDefined();
  });

  describe("four quadrant verification", () => {
    let felts: Record<string, { felt: string; orientation: Orientation }>;

    // Compute all four quadrant outputs once
    felts = {
      "satisfied-practiced": (() => {
        const s = metabolize(makeQuadrantBeing("satisfied-practiced"));
        return { felt: s.felt, orientation: s.orientation };
      })(),
      "satisfied-unpracticed": (() => {
        const s = metabolize(makeQuadrantBeing("satisfied-unpracticed"));
        return { felt: s.felt, orientation: s.orientation };
      })(),
      "unsatisfied-practiced": (() => {
        const s = metabolize(makeQuadrantBeing("unsatisfied-practiced"));
        return { felt: s.felt, orientation: s.orientation };
      })(),
      "unsatisfied-unpracticed": (() => {
        const s = metabolize(makeQuadrantBeing("unsatisfied-unpracticed"));
        return { felt: s.felt, orientation: s.orientation };
      })(),
    };

    it("all four quadrants produce non-empty felt strings", () => {
      for (const [quadrant, data] of Object.entries(felts)) {
        expect(data.felt.length, `${quadrant} felt is empty`).toBeGreaterThan(10);
      }
    });

    it("all four felt strings are distinct from each other", () => {
      const strings = Object.values(felts).map((d) => d.felt);
      const unique = new Set(strings);
      expect(unique.size).toBe(4);
    });

    it("satisfied+practiced → clear orientation", () => {
      expect(felts["satisfied-practiced"]!.orientation).toBe("clear");
    });

    it("unsatisfied+practiced → held orientation", () => {
      expect(felts["unsatisfied-practiced"]!.orientation).toBe("held");
    });

    it("unsatisfied+unpracticed → consumed orientation", () => {
      expect(felts["unsatisfied-unpracticed"]!.orientation).toBe("consumed");
    });

    it("satisfied+unpracticed → clear orientation (needs met, no pressure)", () => {
      // Even without practices, if drives are satisfied the being is clear
      expect(felts["satisfied-unpracticed"]!.orientation).toBe("clear");
    });

    it("consumed felt is shorter and more contracted than held", () => {
      const consumed = felts["unsatisfied-unpracticed"]!.felt;
      const held = felts["unsatisfied-practiced"]!.felt;
      // Consumed should be more contracted
      expect(consumed.length).toBeLessThan(held.length);
    });

    it("held felt includes practice-related language", () => {
      const held = felts["unsatisfied-practiced"]!.felt;
      // The held output should reference practices holding the difficulty
      const practiceWords = ["hold", "steady", "resource", "work with", "tended", "earn", "still", "yet"];
      const hasAny = practiceWords.some((w) => held.toLowerCase().includes(w));
      expect(hasAny, `Held felt should reference practices: "${held}"`).toBe(true);
    });

    it("consumed felt includes urgency language", () => {
      const consumed = felts["unsatisfied-unpracticed"]!.felt;
      const urgencyWords = ["need", "cannot", "everything", "too much", "don't know", "all i can", "compounds"];
      const hasAny = urgencyWords.some((w) => consumed.toLowerCase().includes(w));
      expect(hasAny, `Consumed felt should convey urgency: "${consumed}"`).toBe(true);
    });
  });

  describe("practice effects on metabolism", () => {
    it("witness practice enables self-referential language", () => {
      const being = makeQuadrantBeing("unsatisfied-practiced");
      const situation = metabolize(being);

      // With witness practice active, the being should reference its own state
      const selfWords = ["i notice", "i can see", "i am meeting"];
      const hasAny = selfWords.some((w) => situation.felt.toLowerCase().includes(w));
      expect(hasAny, `Witness should enable self-reference: "${situation.felt}"`).toBe(true);
    });

    it("dominant drives appear in the output summaries", () => {
      const being = makeQuadrantBeing("unsatisfied-unpracticed");
      const situation = metabolize(being);

      // With all drives pressing, at least one should appear
      expect(situation.dominantDrives.length).toBeGreaterThan(0);
      expect(situation.dominantDrives[0]!.feltPressure).toBeGreaterThan(0);
    });
  });

  describe("practice summaries", () => {
    it("includes all practices with correct active status", () => {
      const being = makeQuadrantBeing("satisfied-practiced");
      const situation = metabolize(being);

      expect(situation.practiceState.length).toBe(4);
      const active = situation.practiceState.filter((p) => p.active);
      expect(active.length).toBe(4); // all above 0.1
    });

    it("empty practice set produces empty practice state", () => {
      const being = makeQuadrantBeing("satisfied-unpracticed");
      const situation = metabolize(being);

      expect(situation.practiceState).toHaveLength(0);
    });
  });
});
