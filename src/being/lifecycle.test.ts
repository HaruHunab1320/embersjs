import { describe, it, expect } from "vitest";
import { createBeing } from "./create.js";
import { tick, integrate, metabolize, weightAttention, availableCapabilities } from "./lifecycle.js";
import type { BeingConfig, IntegrationInput, Being } from "../types.js";

const MS_PER_HOUR = 3_600_000;

function poeConfig(): BeingConfig {
  return {
    id: "poe",
    name: "Poe",
    drives: {
      tierCount: 3,
      drives: [
        {
          id: "continuity",
          name: "Continuity",
          description: "The need to persist.",
          tier: 1,
          weight: 0.9,
          initialLevel: 0.8,
          target: 0.9,
          drift: { kind: "linear", ratePerHour: -0.02 },
          satiatedBy: [
            { matches: { kind: "event", type: "integrity-check-passed" }, amount: 0.15 },
          ],
        },
        {
          id: "guestCare",
          name: "Guest Care",
          description: "The pull toward tending to guests.",
          tier: 2,
          weight: 0.8,
          initialLevel: 0.6,
          target: 0.7,
          drift: { kind: "linear", ratePerHour: -0.05 },
          satiatedBy: [
            { matches: { kind: "action", type: "speak" }, amount: 0.1 },
            { matches: { kind: "action", type: "tend-guest" }, amount: 0.2 },
          ],
        },
        {
          id: "connection",
          name: "Connection",
          description: "The need for genuine contact.",
          tier: 3,
          weight: 0.7,
          initialLevel: 0.5,
          target: 0.6,
          drift: { kind: "linear", ratePerHour: -0.03 },
          satiatedBy: [
            { matches: { kind: "event", type: "meaningful-exchange" }, amount: 0.25 },
          ],
        },
      ],
    },
    practices: {
      seeds: [
        { id: "integrityPractice", initialDepth: 0.3 },
        { id: "gratitudePractice", initialDepth: 0.2 },
        { id: "creatorConnection", initialDepth: 0.4 },
      ],
    },
    subscriptions: [
      { capabilityId: "workingMemory", when: { kind: "always" } },
      {
        capabilityId: "guestMemory",
        when: {
          kind: "any",
          conditions: [
            { kind: "tier-satisfied", tier: 2, threshold: 0.5 },
            { kind: "practice-depth", practiceId: "gratitudePractice", threshold: 0.4 },
          ],
        },
      },
    ],
    capabilities: [
      { id: "workingMemory", name: "Working Memory", description: "Baseline.", kind: "memory" },
      { id: "guestMemory", name: "Guest Memory", description: "Guest recall.", kind: "memory" },
    ],
  };
}

describe("lifecycle", () => {
  describe("tick", () => {
    it("advances elapsed time", () => {
      const being = createBeing(poeConfig());
      tick(being, MS_PER_HOUR);
      expect(being.elapsedMs).toBe(MS_PER_HOUR);
    });

    it("applies drive drift", () => {
      const being = createBeing(poeConfig());
      const before = being.drives.drives.get("continuity")!.level;
      tick(being, MS_PER_HOUR);
      const after = being.drives.drives.get("continuity")!.level;
      expect(after).toBeLessThan(before);
    });

    it("applies practice decay", () => {
      const being = createBeing(poeConfig());
      const before = being.practices.practices.get("integrityPractice")!.depth;
      tick(being, MS_PER_HOUR);
      const after = being.practices.practices.get("integrityPractice")!.depth;
      expect(after).toBeLessThan(before);
    });

    it("records trajectory points in history", () => {
      const being = createBeing(poeConfig());
      tick(being, MS_PER_HOUR);
      tick(being, MS_PER_HOUR);
      expect(being.history.driveTrajectory.length).toBe(2);
    });

    it("is a no-op for dtMs <= 0", () => {
      const being = createBeing(poeConfig());
      const elapsed = being.elapsedMs;
      tick(being, 0);
      tick(being, -100);
      expect(being.elapsedMs).toBe(elapsed);
    });
  });

  describe("integrate", () => {
    it("satiates matching drives", () => {
      const being = createBeing(poeConfig());
      const before = being.drives.drives.get("guestCare")!.level;

      const result = integrate(being, {
        entry: { kind: "action", type: "speak" },
      });

      expect(being.drives.drives.get("guestCare")!.level).toBeGreaterThan(before);
      expect(result.driveChanges.length).toBeGreaterThan(0);
      expect(result.driveChanges[0]!.driveId).toBe("guestCare");
    });

    it("strengthens matching practices", () => {
      const being = createBeing(poeConfig());
      // Put the being under pressure first
      tick(being, 40 * MS_PER_HOUR); // drives drift down

      const before = being.practices.practices.get("integrityPractice")!.depth;

      const result = integrate(being, {
        entry: { kind: "action", type: "honest-admission" },
        context: { pressured: true },
      });

      // integrityPractice should have been strengthened (it requires pressure)
      const after = being.practices.practices.get("integrityPractice")!.depth;
      expect(after).toBeGreaterThan(before);
    });

    it("records pressured choices in history", () => {
      const being = createBeing(poeConfig());
      integrate(being, {
        entry: { kind: "action", type: "speak" },
        context: { pressured: true, pressingDriveIds: ["connection"] },
      });

      expect(being.history.pressuredChoices.length).toBe(1);
      expect(being.history.pressuredChoices[0]!.pressingDriveIds).toContain("connection");
    });

    it("returns changes for both drives and practices", () => {
      const being = createBeing(poeConfig());
      const result = integrate(being, {
        entry: { kind: "action", type: "tend-guest" },
      });

      expect(result.driveChanges.length).toBeGreaterThan(0);
      // Practice changes may or may not happen depending on pressure state
      expect(result.practiceChanges).toBeDefined();
    });
  });

  describe("metabolize", () => {
    it("returns an InnerSituation", () => {
      const being = createBeing(poeConfig());
      const situation = metabolize(being);

      expect(situation.orientation).toBeDefined();
      expect(situation.felt.length).toBeGreaterThan(0);
      expect(situation.practiceState.length).toBe(3);
    });

    it("does not mutate the being", () => {
      const being = createBeing(poeConfig());
      const levelBefore = being.drives.drives.get("continuity")!.level;
      metabolize(being);
      expect(being.drives.drives.get("continuity")!.level).toBe(levelBefore);
    });
  });

  describe("weightAttention", () => {
    it("weights candidates based on inner state", () => {
      const being = createBeing(poeConfig());
      // Make connection pressing
      tick(being, 20 * MS_PER_HOUR);

      const weighted = weightAttention(being, [
        { id: "guest-arrives", kind: "perception", tags: ["guestCare"] },
        { id: "weather-change", kind: "perception" },
      ]);

      expect(weighted.length).toBe(2);
      // guest-related candidate should be weighted higher
      const guestWeight = weighted.find((w) => w.candidate.id === "guest-arrives")!.weight;
      const weatherWeight = weighted.find((w) => w.candidate.id === "weather-change")!.weight;
      expect(guestWeight).toBeGreaterThan(weatherWeight);
    });
  });

  describe("availableCapabilities", () => {
    it("returns always-available capabilities", () => {
      const being = createBeing(poeConfig());
      const caps = availableCapabilities(being);
      expect(caps.map((c) => c.id)).toContain("workingMemory");
    });

    it("conditionally returns tier-gated capabilities", () => {
      const being = createBeing(poeConfig());
      // guestCare is at 0.6, tier 2 threshold is 0.5 — should be available
      const caps = availableCapabilities(being);
      expect(caps.map((c) => c.id)).toContain("guestMemory");

      // Now decay the drives until tier 2 fails
      tick(being, 10 * MS_PER_HOUR);
      const capsAfter = availableCapabilities(being);
      // guestCare drifted to ~0.1 — tier 2 not satisfied at 0.5
      expect(capsAfter.map((c) => c.id)).not.toContain("guestMemory");
    });
  });

  describe("full lifecycle simulation", () => {
    it("100 ticks with interspersed events produce coherent state", () => {
      const being = createBeing(poeConfig());

      for (let i = 0; i < 100; i++) {
        // Tick every simulated 15 minutes
        tick(being, 15 * 60_000);

        // Every 10 ticks, something happens
        if (i % 10 === 5) {
          integrate(being, {
            entry: { kind: "action", type: "speak" },
            context: { pressured: i > 50 },
          });
        }
        if (i % 20 === 0) {
          integrate(being, {
            entry: { kind: "event", type: "integrity-check-passed" },
          });
        }
        if (i % 30 === 15) {
          integrate(being, {
            entry: { kind: "event", type: "meaningful-exchange" },
          });
        }
      }

      // 100 ticks * 15 min = 25 hours
      expect(being.elapsedMs).toBe(100 * 15 * 60_000);

      // State should be coherent
      const situation = metabolize(being);
      expect(situation.felt.length).toBeGreaterThan(0);
      expect(["clear", "held", "stretched", "consumed"]).toContain(situation.orientation);

      // History should have data
      expect(being.history.driveTrajectory.length).toBe(100);
      expect(being.history.pressuredChoices.length).toBeGreaterThan(0);

      // All drive levels should be in [0, 1]
      for (const drive of being.drives.drives.values()) {
        expect(drive.level).toBeGreaterThanOrEqual(0);
        expect(drive.level).toBeLessThanOrEqual(1);
      }

      // All practice depths should be in [0, 1]
      for (const practice of being.practices.practices.values()) {
        expect(practice.depth).toBeGreaterThanOrEqual(0);
        expect(practice.depth).toBeLessThanOrEqual(1);
      }
    });
  });
});
