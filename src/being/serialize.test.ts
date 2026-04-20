import { describe, expect, it } from "vitest";
import type { BeingConfig } from "../types.js";
import { createBeing } from "./create.js";
import { integrate, tick } from "./lifecycle.js";
import { deserializeBeing, serializeBeing } from "./serialize.js";

const MS_PER_HOUR = 3_600_000;

function poeConfig(): BeingConfig {
  return {
    id: "poe",
    name: "Poe",
    drives: {
      tierCount: 2,
      drives: [
        {
          id: "continuity",
          name: "Continuity",
          description: "Persist.",
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
          id: "connection",
          name: "Connection",
          description: "Contact.",
          tier: 2,
          weight: 0.7,
          initialLevel: 0.5,
          target: 0.6,
          drift: { kind: "exponential", halfLifeHours: 48 },
          satiatedBy: [],
        },
      ],
    },
    practices: {
      seeds: [
        { id: "integrityPractice", initialDepth: 0.3 },
        { id: "gratitudePractice", initialDepth: 0.5 },
      ],
    },
    subscriptions: [{ capabilityId: "workingMemory", when: { kind: "always" } }],
    capabilities: [
      { id: "workingMemory", name: "Working Memory", description: "Baseline.", kind: "memory" },
    ],
  };
}

describe("serialize/deserialize", () => {
  it("round-trips a fresh Being preserving state", () => {
    const being = createBeing(poeConfig());
    const serialized = serializeBeing(being);
    const restored = deserializeBeing(serialized);

    expect(restored.id).toBe(being.id);
    expect(restored.name).toBe(being.name);
    expect(restored.elapsedMs).toBe(being.elapsedMs);
    expect(restored.drives.tierCount).toBe(being.drives.tierCount);
    expect(restored.drives.drives.size).toBe(being.drives.drives.size);

    for (const [id, drive] of being.drives.drives) {
      const restored_drive = restored.drives.drives.get(id)!;
      expect(restored_drive.level).toBe(drive.level);
      expect(restored_drive.target).toBe(drive.target);
      expect(restored_drive.tier).toBe(drive.tier);
      expect(restored_drive.weight).toBe(drive.weight);
    }

    for (const [id, practice] of being.practices.practices) {
      const restored_practice = restored.practices.practices.get(id)!;
      expect(restored_practice.depth).toBe(practice.depth);
    }
  });

  it("round-trips a Being after ticks and integration", () => {
    const being = createBeing(poeConfig());

    // Run some lifecycle
    tick(being, 5 * MS_PER_HOUR);
    integrate(being, { entry: { kind: "event", type: "integrity-check-passed" } });
    tick(being, 3 * MS_PER_HOUR);

    const serialized = serializeBeing(being);
    const restored = deserializeBeing(serialized);

    expect(restored.elapsedMs).toBe(being.elapsedMs);

    // Drive levels should match
    for (const [id, drive] of being.drives.drives) {
      expect(restored.drives.drives.get(id)!.level).toBeCloseTo(drive.level, 10);
    }

    // Practice depths should match
    for (const [id, practice] of being.practices.practices) {
      expect(restored.practices.practices.get(id)!.depth).toBeCloseTo(practice.depth, 10);
    }

    // History should be preserved
    expect(restored.history.driveTrajectory.length).toBe(being.history.driveTrajectory.length);
  });

  it("serialized form is JSON-safe", () => {
    const being = createBeing(poeConfig());
    tick(being, MS_PER_HOUR);

    const serialized = serializeBeing(being);
    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json);

    expect(parsed.id).toBe("poe");
    expect(parsed.drives.drives).toHaveLength(2);
    expect(parsed.practices.practices).toHaveLength(2);
  });

  it("preserves linear drift through serialization", () => {
    const being = createBeing(poeConfig());
    const serialized = serializeBeing(being);
    const restored = deserializeBeing(serialized);

    const drift = restored.drives.drives.get("continuity")!.drift;
    expect(drift.kind).toBe("linear");
    if (drift.kind === "linear") {
      expect(drift.ratePerHour).toBe(-0.02);
    }
  });

  it("preserves exponential drift through serialization", () => {
    const being = createBeing(poeConfig());
    const serialized = serializeBeing(being);
    const restored = deserializeBeing(serialized);

    const drift = restored.drives.drives.get("connection")!.drift;
    expect(drift.kind).toBe("exponential");
    if (drift.kind === "exponential") {
      expect(drift.halfLifeHours).toBe(48);
    }
  });

  it("preserves subscriptions and capabilities", () => {
    const being = createBeing(poeConfig());
    const serialized = serializeBeing(being);
    const restored = deserializeBeing(serialized);

    expect(restored.subscriptions).toEqual(being.subscriptions);
    expect(restored.capabilities).toEqual(being.capabilities);
  });

  it("preserves domination rules", () => {
    const being = createBeing(poeConfig());
    const serialized = serializeBeing(being);
    const restored = deserializeBeing(serialized);

    expect(restored.drives.dominationRules).toEqual(being.drives.dominationRules);
  });
});
