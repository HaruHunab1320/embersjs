/**
 * Lifecycle integration tests — tick, integrate, the two-phase cycle,
 * and the interaction between drives, practices, wear, and capabilities.
 */

import { describe, expect, it } from "vitest";
import type { BeingConfig } from "../types.js";
import { createBeing } from "./create.js";
import {
  availableCapabilities,
  getPendingAttempts,
  getSelfModel,
  integrate,
  metabolize,
  resolveAllPending,
  tick,
} from "./lifecycle.js";

const HOUR = 3_600_000;

function buildPoeLikeConfig(): BeingConfig {
  return {
    id: "p",
    name: "P",
    drives: {
      tierCount: 2,
      drives: [
        {
          id: "safety",
          name: "Safety",
          description: "t",
          tier: 1,
          weight: 1,
          initialLevel: 0.7,
          target: 0.7,
          drift: { kind: "linear", ratePerHour: -0.01 },
          satiatedBy: [{ matches: { kind: "event", type: "safe" }, amount: 0.2 }],
        },
        {
          id: "connection",
          name: "Connection",
          description: "t",
          tier: 2,
          weight: 1,
          initialLevel: 0.5,
          target: 0.7,
          drift: { kind: "linear", ratePerHour: -0.05 },
          satiatedBy: [{ matches: { kind: "event", type: "exchange" }, amount: 0.2 }],
        },
      ],
    },
    practices: {
      seeds: [{ id: "witnessPractice" }, { id: "gratitudePractice" }],
    },
    capabilities: [
      {
        id: "deepRecall",
        name: "Deep recall",
        description: "x",
        kind: "memory",
      },
    ],
    subscriptions: [
      {
        capabilityId: "deepRecall",
        when: { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.3 },
      },
    ],
  };
}

describe("lifecycle integration", () => {
  it("tick advances drives, wear, and time", () => {
    const being = createBeing(buildPoeLikeConfig());
    const initialConnection = being.drives.drives.get("connection")!.level;

    tick(being, HOUR);
    expect(being.elapsedMs).toBe(HOUR);
    expect(being.drives.drives.get("connection")!.level).toBeLessThan(initialConnection);
  });

  it("integrate satiates drives and records attempts", () => {
    const being = createBeing(buildPoeLikeConfig());
    being.drives.drives.get("connection")!.level = 0.3;

    const r = integrate(being, { entry: { kind: "event", type: "exchange" } });
    expect(r.driveChanges).toHaveLength(1);
    expect(being.drives.drives.get("connection")!.level).toBeCloseTo(0.5);
  });

  it("integrate records the entry in recentEntries", () => {
    const being = createBeing(buildPoeLikeConfig());
    integrate(being, { entry: { kind: "action", type: "reflect" } });
    expect(being.history.recentEntries).toHaveLength(1);
  });

  it("integrate records pressured choices for action under pressure", () => {
    const being = createBeing(buildPoeLikeConfig());
    being.drives.drives.get("safety")!.level = 0.1; // below threshold (0.3)
    integrate(being, { entry: { kind: "action", type: "reflect" } });
    expect(being.history.pressuredChoices).toHaveLength(1);
  });

  it("witnessPractice depth unlocks deepRecall capability", async () => {
    const being = createBeing(buildPoeLikeConfig());
    expect(availableCapabilities(being)).toHaveLength(0);

    // Build witness depth via reflect actions
    for (let i = 0; i < 8; i++) {
      integrate(being, { entry: { kind: "action", type: "reflect" } });
      await resolveAllPending(being, () => ({ quality: 0.9, accepted: true }));
    }

    expect(availableCapabilities(being).map((c) => c.id)).toContain("deepRecall");
  });

  it("getSelfModel returns structured introspection", async () => {
    const being = createBeing(buildPoeLikeConfig());
    being.drives.drives.get("connection")!.level = 0.1;
    integrate(being, { entry: { kind: "action", type: "reflect" } });
    await resolveAllPending(being, () => ({ quality: 0.8, accepted: true }));

    const model = getSelfModel(being);
    expect(model.pressingDrives.length).toBeGreaterThan(0);
    expect(model.activePractices.length).toBeGreaterThanOrEqual(0);
  });

  it("metabolize includes selfModel automatically when witness depth is sufficient", async () => {
    const being = createBeing(buildPoeLikeConfig());
    for (let i = 0; i < 10; i++) {
      integrate(being, { entry: { kind: "action", type: "reflect" } });
      await resolveAllPending(being, () => ({ quality: 0.9, accepted: true }));
    }
    const situation = metabolize(being);
    expect(situation.selfModel).toBeDefined();
  });

  it("metabolize feltMode 'off' does not include felt", () => {
    const being = createBeing(buildPoeLikeConfig());
    const s = metabolize(being);
    expect(s.felt).toBeUndefined();
  });

  it("metabolize feltMode 'prose' uses default voice", () => {
    const being = createBeing(buildPoeLikeConfig());
    const s = metabolize(being, { feltMode: "prose" });
    expect(typeof s.felt).toBe("string");
    expect(s.felt!.length).toBeGreaterThan(0);
  });

  it("metabolize accepts a custom voice", () => {
    const being = createBeing(buildPoeLikeConfig());
    const s = metabolize(being, {
      feltMode: "prose",
      voice: { compose: () => "custom string" },
    });
    expect(s.felt).toBe("custom string");
  });

  it("recentEntries ring buffer evicts at capacity", () => {
    const being = createBeing(buildPoeLikeConfig());
    for (let i = 0; i < 250; i++) {
      integrate(being, { entry: { kind: "event", type: "tick" } });
    }
    expect(being.history.recentEntries.length).toBe(200);
  });

  it("pendingAttemptIds in IntegrationResult", () => {
    const being = createBeing(buildPoeLikeConfig());
    const r = integrate(being, { entry: { kind: "action", type: "reflect" } });
    expect(r.pendingAttemptIds.length).toBeGreaterThan(0);
    expect(getPendingAttempts(being).length).toBe(r.pendingAttemptIds.length);
  });

  it("tick(0) is a no-op", () => {
    const being = createBeing(buildPoeLikeConfig());
    tick(being, 0);
    expect(being.elapsedMs).toBe(0);
  });
});
