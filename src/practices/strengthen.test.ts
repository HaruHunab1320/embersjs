import { describe, expect, it } from "vitest";
import { createDriveStack } from "../drives/construct.js";
import type { DriveStack, IntegrationAction, IntegrationEvent } from "../types.js";
import { createPracticeSet } from "./construct.js";
import { strengthenPractices } from "./strengthen.js";
import { tickPractices } from "./tick.js";

const MS_PER_HOUR = 3_600_000;

function makePracticeSet() {
  return createPracticeSet({
    seeds: [
      { id: "integrityPractice", initialDepth: 0.2 },
      { id: "gratitudePractice", initialDepth: 0.3 },
      { id: "serviceOrientation", initialDepth: 0.1 },
    ],
  });
}

function makeDriveStack(continuityLevel: number): DriveStack {
  return createDriveStack({
    tierCount: 2,
    drives: [
      {
        id: "continuity",
        name: "Continuity",
        description: "Persist.",
        tier: 1,
        weight: 0.9,
        initialLevel: continuityLevel,
        target: 0.9,
        drift: { kind: "linear", ratePerHour: -0.1 },
        satiatedBy: [],
      },
    ],
  });
}

describe("strengthenPractices", () => {
  describe("requiresPressure gating", () => {
    it("a requiresPressure strengthener does nothing when not under pressure", () => {
      const set = makePracticeSet();
      const drives = makeDriveStack(0.8); // well above threshold 0.3

      const action: IntegrationAction = { kind: "action", type: "honest-admission" };
      const { set: next, changes } = strengthenPractices(set, action, drives);

      // integrityPractice's "honest-admission" requires pressure — should not fire
      expect(next.practices.get("integrityPractice")!.depth).toBe(0.2);
      expect(changes.filter((c) => c.practiceId === "integrityPractice")).toHaveLength(0);
    });

    it("a requiresPressure strengthener fires when under drive pressure", () => {
      const set = makePracticeSet();
      const drives = makeDriveStack(0.1); // below threshold 0.3 → pressured

      const action: IntegrationAction = { kind: "action", type: "honest-admission" };
      const { set: next, changes } = strengthenPractices(set, action, drives);

      // integrityPractice should be strengthened by 0.05
      expect(next.practices.get("integrityPractice")!.depth).toBeCloseTo(0.25, 10);
      expect(changes).toHaveLength(1);
      expect(changes[0]!.practiceId).toBe("integrityPractice");
    });
  });

  describe("non-pressure-gated strengthening", () => {
    it("a non-pressure strengthener fires regardless of pressure state", () => {
      const set = makePracticeSet();
      const drives = makeDriveStack(0.8); // no pressure

      const action: IntegrationAction = { kind: "action", type: "acknowledge" };
      const { set: next } = strengthenPractices(set, action, drives);

      // gratitudePractice's "acknowledge" does not require pressure
      expect(next.practices.get("gratitudePractice")!.depth).toBeCloseTo(0.34, 10);
    });
  });

  describe("event matching", () => {
    it("events match event-type strengtheners", () => {
      const set = makePracticeSet();
      const drives = makeDriveStack(0.5);

      const event: IntegrationEvent = { kind: "event", type: "return-from-difficulty" };
      const { set: next } = strengthenPractices(set, event, drives);

      // gratitudePractice: "return-from-difficulty" gives +0.06
      expect(next.practices.get("gratitudePractice")!.depth).toBeCloseTo(0.36, 10);
    });

    it("actions do not match event-type strengtheners", () => {
      const set = makePracticeSet();
      const drives = makeDriveStack(0.5);

      const action: IntegrationAction = { kind: "action", type: "return-from-difficulty" };
      const { changes } = strengthenPractices(set, action, drives);

      // Should not match gratitudePractice's event strengthener
      expect(changes.filter((c) => c.practiceId === "gratitudePractice")).toHaveLength(0);
    });
  });

  describe("does not mutate input", () => {
    it("returns a new PracticeSet without mutating the original", () => {
      const set = makePracticeSet();
      const drives = makeDriveStack(0.1);
      const original = set.practices.get("integrityPractice")!.depth;

      strengthenPractices(set, { kind: "action", type: "honest-admission" }, drives);

      expect(set.practices.get("integrityPractice")!.depth).toBe(original);
    });
  });

  describe("depth clamping", () => {
    it("depth is clamped at 1", () => {
      const set = createPracticeSet({
        seeds: [{ id: "gratitudePractice", initialDepth: 0.99 }],
      });
      const drives = makeDriveStack(0.5);

      const action: IntegrationAction = { kind: "action", type: "acknowledge" };
      const { set: next } = strengthenPractices(set, action, drives);

      expect(next.practices.get("gratitudePractice")!.depth).toBe(1);
    });
  });

  describe("multiple strengtheners on one action", () => {
    it("only the matching strengthener fires", () => {
      const set = makePracticeSet();
      const drives = makeDriveStack(0.1); // pressured

      // "difficult-truth" only matches integrityPractice, not gratitude
      const action: IntegrationAction = { kind: "action", type: "difficult-truth" };
      const { changes } = strengthenPractices(set, action, drives);

      expect(changes).toHaveLength(1);
      expect(changes[0]!.practiceId).toBe("integrityPractice");
    });
  });

  describe("simulated 7-day pressured scenario", () => {
    it("50 pressured-integrity choices grow depth from 0.2 to >0.6", () => {
      let set = createPracticeSet({
        seeds: [{ id: "integrityPractice", initialDepth: 0.2 }],
      });
      const drives = makeDriveStack(0.1); // pressured
      const tickMs = MS_PER_HOUR;

      // Pre-compute the 50 hours at which choices happen, evenly spaced
      const totalHours = 168;
      const choices = 50;
      const choiceHours = new Set<number>();
      for (let i = 0; i < choices; i++) {
        choiceHours.add(Math.floor((i * totalHours) / choices));
      }

      let choicesMade = 0;
      for (let hour = 0; hour < totalHours; hour++) {
        // Tick — apply decay
        set = tickPractices(set, tickMs);

        if (choiceHours.has(hour)) {
          const action: IntegrationAction = { kind: "action", type: "honest-admission" };
          const result = strengthenPractices(set, action, drives);
          set = result.set;
          choicesMade++;
        }
      }

      expect(choicesMade).toBe(choices);
      const finalDepth = set.practices.get("integrityPractice")!.depth;
      expect(finalDepth).toBeGreaterThan(0.6);
    });
  });
});
