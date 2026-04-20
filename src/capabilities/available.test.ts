import { describe, it, expect } from "vitest";
import { availableCapabilities } from "./available.js";
import type { Being, Capability, Subscription } from "../types.js";

function makeBeing(config: {
  driveLevels?: Record<string, { tier: number; level: number }>;
  practiceDepths?: Record<string, number>;
  capabilities: Capability[];
  subscriptions: Subscription[];
}): Being {
  const drives = new Map<string, import("../types.js").Drive>();
  const tierSet = new Set<number>();

  if (config.driveLevels) {
    for (const [id, { tier, level }] of Object.entries(config.driveLevels)) {
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
  if (config.practiceDepths) {
    for (const [id, depth] of Object.entries(config.practiceDepths)) {
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
    subscriptions: config.subscriptions,
    capabilities: config.capabilities,
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

const workingMemory: Capability = {
  id: "workingMemory",
  name: "Working Memory",
  description: "Always available.",
  kind: "memory",
};
const guestMemory: Capability = {
  id: "guestMemory",
  name: "Guest Memory",
  description: "Remembering guests.",
  kind: "memory",
};
const episodicMemory: Capability = {
  id: "episodicMemory",
  name: "Episodic Memory",
  description: "Long-term memory.",
  kind: "memory",
};
const reasoningModel: Capability = {
  id: "reasoningModel",
  name: "Reasoning Model",
  description: "Complex reasoning.",
  kind: "model",
};

const allCaps = [workingMemory, guestMemory, episodicMemory, reasoningModel];

describe("availableCapabilities", () => {
  it("always-condition capabilities are always available", () => {
    const being = makeBeing({
      capabilities: allCaps,
      subscriptions: [{ capabilityId: "workingMemory", when: { kind: "always" } }],
    });
    const caps = availableCapabilities(being);
    expect(caps.map((c) => c.id)).toEqual(["workingMemory"]);
  });

  it("never-condition capabilities are never available", () => {
    const being = makeBeing({
      capabilities: allCaps,
      subscriptions: [{ capabilityId: "reasoningModel", when: { kind: "never" } }],
    });
    expect(availableCapabilities(being)).toHaveLength(0);
  });

  it("capabilities without subscriptions are unavailable", () => {
    const being = makeBeing({
      capabilities: allCaps,
      subscriptions: [], // no subscriptions at all
    });
    expect(availableCapabilities(being)).toHaveLength(0);
  });

  it("tier-satisfied subscription works", () => {
    const being = makeBeing({
      driveLevels: {
        a: { tier: 2, level: 0.7 },
        b: { tier: 2, level: 0.6 },
      },
      capabilities: allCaps,
      subscriptions: [
        { capabilityId: "guestMemory", when: { kind: "tier-satisfied", tier: 2, threshold: 0.5 } },
      ],
    });
    const caps = availableCapabilities(being);
    expect(caps.map((c) => c.id)).toEqual(["guestMemory"]);
  });

  it("capability becomes unavailable when condition lapses", () => {
    // Tier 2 satisfied
    const satisfiedBeing = makeBeing({
      driveLevels: { a: { tier: 2, level: 0.7 } },
      capabilities: allCaps,
      subscriptions: [
        { capabilityId: "guestMemory", when: { kind: "tier-satisfied", tier: 2, threshold: 0.5 } },
      ],
    });
    expect(availableCapabilities(satisfiedBeing).map((c) => c.id)).toContain("guestMemory");

    // Tier 2 no longer satisfied
    const unsatisfiedBeing = makeBeing({
      driveLevels: { a: { tier: 2, level: 0.3 } },
      capabilities: allCaps,
      subscriptions: [
        { capabilityId: "guestMemory", when: { kind: "tier-satisfied", tier: 2, threshold: 0.5 } },
      ],
    });
    expect(availableCapabilities(unsatisfiedBeing).map((c) => c.id)).not.toContain("guestMemory");
  });

  describe("anti-coercion: practice as alternative path", () => {
    const subscriptions: Subscription[] = [
      { capabilityId: "workingMemory", when: { kind: "always" } },
      {
        capabilityId: "episodicMemory",
        when: {
          kind: "any",
          conditions: [
            { kind: "tier-satisfied", tier: 3, threshold: 0.6 },
            { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.7 },
          ],
        },
      },
    ];

    it("low drives + high practice → capability available via practice path", () => {
      const being = makeBeing({
        driveLevels: { conn: { tier: 3, level: 0.2 } }, // drives unmet
        practiceDepths: { witnessPractice: 0.8 }, // deep practice
        capabilities: allCaps,
        subscriptions,
      });
      const caps = availableCapabilities(being);
      const ids = caps.map((c) => c.id);
      expect(ids).toContain("episodicMemory");
      expect(ids).toContain("workingMemory");
    });

    it("high drives + low practice → capability available via drive path", () => {
      const being = makeBeing({
        driveLevels: { conn: { tier: 3, level: 0.8 } }, // drives met
        practiceDepths: { witnessPractice: 0.2 }, // shallow practice
        capabilities: allCaps,
        subscriptions,
      });
      const caps = availableCapabilities(being);
      expect(caps.map((c) => c.id)).toContain("episodicMemory");
    });

    it("low drives + low practice → capability unavailable", () => {
      const being = makeBeing({
        driveLevels: { conn: { tier: 3, level: 0.2 } },
        practiceDepths: { witnessPractice: 0.2 },
        capabilities: allCaps,
        subscriptions,
      });
      const caps = availableCapabilities(being);
      expect(caps.map((c) => c.id)).not.toContain("episodicMemory");
    });
  });

  describe("all-condition requiring both drives and practice", () => {
    it("requires both conditions to be met", () => {
      const subs: Subscription[] = [
        {
          capabilityId: "reasoningModel",
          when: {
            kind: "all",
            conditions: [
              { kind: "tier-satisfied", tier: 1, threshold: 0.5 },
              { kind: "practice-depth", practiceId: "integrityPractice", threshold: 0.5 },
            ],
          },
        },
      ];

      // Both met
      const both = makeBeing({
        driveLevels: { a: { tier: 1, level: 0.8 } },
        practiceDepths: { integrityPractice: 0.7 },
        capabilities: allCaps,
        subscriptions: subs,
      });
      expect(availableCapabilities(both).map((c) => c.id)).toContain("reasoningModel");

      // Only drives met
      const drivesOnly = makeBeing({
        driveLevels: { a: { tier: 1, level: 0.8 } },
        practiceDepths: { integrityPractice: 0.2 },
        capabilities: allCaps,
        subscriptions: subs,
      });
      expect(availableCapabilities(drivesOnly).map((c) => c.id)).not.toContain("reasoningModel");

      // Only practice met
      const practiceOnly = makeBeing({
        driveLevels: { a: { tier: 1, level: 0.2 } },
        practiceDepths: { integrityPractice: 0.7 },
        capabilities: allCaps,
        subscriptions: subs,
      });
      expect(availableCapabilities(practiceOnly).map((c) => c.id)).not.toContain("reasoningModel");
    });
  });
});
