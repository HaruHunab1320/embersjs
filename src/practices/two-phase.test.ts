/**
 * Tests for the two-phase practice mechanic — the core v0.2 thesis:
 *
 *   No verdict from the framework, no depth growth.
 *
 * Includes the adversarial case: 1000 attempts without resolution produce
 * zero depth. This test catches the v0.1 failure mode at the type-system level.
 */

import { describe, expect, it } from "vitest";
import { createBeing } from "../being/create.js";
import {
  getPendingAttempts,
  integrate,
  resolveAllPending,
  resolveAttempt,
} from "../being/lifecycle.js";
import type { BeingConfig } from "../types.js";
import { computeDepth } from "./depth.js";

function buildBeing(): BeingConfig {
  return {
    id: "test",
    name: "Test",
    drives: {
      tierCount: 1,
      drives: [
        {
          id: "presence",
          name: "Presence",
          description: "t",
          tier: 1,
          weight: 1,
          initialLevel: 0.7,
          target: 0.7,
          drift: { kind: "linear", ratePerHour: 0 },
          satiatedBy: [],
        },
      ],
    },
    practices: { seeds: [{ id: "gratitudePractice" }] },
    subscriptions: [],
    capabilities: [],
  };
}

describe("two-phase practice mechanic", () => {
  it("integrate records pending attempts but does not change depth", () => {
    const being = createBeing(buildBeing());
    const beforeDepth = computeDepth(
      being.practices.practices.get("gratitudePractice")!,
      being.elapsedMs,
    );

    const result = integrate(being, { entry: { kind: "action", type: "acknowledge" } });

    expect(result.pendingAttemptIds).toHaveLength(1);
    expect(getPendingAttempts(being)).toHaveLength(1);

    const afterDepth = computeDepth(
      being.practices.practices.get("gratitudePractice")!,
      being.elapsedMs,
    );
    expect(afterDepth).toBe(beforeDepth);
  });

  it("ADVERSARIAL: 1000 unresolved attempts produce zero depth", () => {
    const being = createBeing(buildBeing());
    for (let i = 0; i < 1000; i++) {
      integrate(being, { entry: { kind: "action", type: "acknowledge" } });
    }
    const depth = computeDepth(
      being.practices.practices.get("gratitudePractice")!,
      being.elapsedMs,
    );
    expect(depth).toBe(0);
    // The pending queue should reflect the attempted work, but no substrate.
    expect(getPendingAttempts(being).length).toBe(1000);
    expect(being.practices.practices.get("gratitudePractice")!.substrate.artifacts).toHaveLength(0);
  });

  it("resolveAttempt grows depth proportional to quality", () => {
    const being = createBeing(buildBeing());
    integrate(being, { entry: { kind: "action", type: "acknowledge" } });
    const [attempt] = getPendingAttempts(being);
    expect(attempt).toBeDefined();

    const before = computeDepth(
      being.practices.practices.get("gratitudePractice")!,
      being.elapsedMs,
    );
    const resolution = resolveAttempt(being, attempt!.id, {
      quality: 0.8,
      accepted: true,
      content: { noticed: "specific thing" },
    });

    expect(resolution.accepted).toBe(true);
    expect(resolution.artifactStored).toBeDefined();
    expect(resolution.artifactStored!.quality).toBe(0.8);
    expect(resolution.depthAfter).toBeGreaterThan(before);
  });

  it("resolveAttempt with quality 0 stores no artifact", () => {
    const being = createBeing(buildBeing());
    integrate(being, { entry: { kind: "action", type: "acknowledge" } });
    const [attempt] = getPendingAttempts(being);

    const resolution = resolveAttempt(being, attempt!.id, {
      quality: 0,
      accepted: true,
      content: {},
    });
    expect(resolution.accepted).toBe(false);
    expect(resolution.artifactStored).toBeUndefined();
  });

  it("rejected attempts do not grow depth", () => {
    const being = createBeing(buildBeing());
    integrate(being, { entry: { kind: "action", type: "acknowledge" } });
    const [attempt] = getPendingAttempts(being);

    const resolution = resolveAttempt(being, attempt!.id, {
      quality: 0.9,
      accepted: false,
    });
    expect(resolution.accepted).toBe(false);
    expect(resolution.depthAfter).toBe(0);
  });

  it("resolveAttempt throws on unknown attempt id", () => {
    const being = createBeing(buildBeing());
    expect(() => resolveAttempt(being, "no-such-id", { quality: 1, accepted: true })).toThrow();
  });

  it("resolveAllPending drains the queue", async () => {
    const being = createBeing(buildBeing());
    for (let i = 0; i < 5; i++) {
      integrate(being, { entry: { kind: "action", type: "acknowledge" } });
    }
    expect(getPendingAttempts(being)).toHaveLength(5);

    await resolveAllPending(being, () => ({ quality: 0.7, accepted: true }));

    expect(getPendingAttempts(being)).toHaveLength(0);
    const depth = computeDepth(
      being.practices.practices.get("gratitudePractice")!,
      being.elapsedMs,
    );
    expect(depth).toBeGreaterThan(0);
  });

  it("pressured attempts get the pressure bonus in depth", async () => {
    // A being with low drive level so attempts are under pressure
    const config = buildBeing();
    config.drives.drives = [
      {
        id: "presence",
        name: "Presence",
        description: "t",
        tier: 1,
        weight: 1,
        initialLevel: 0.1,
        target: 0.7,
        drift: { kind: "linear", ratePerHour: 0 },
        satiatedBy: [],
      },
    ];
    const pressured = createBeing(config);
    integrate(pressured, { entry: { kind: "action", type: "acknowledge" } });
    await resolveAllPending(pressured, () => ({ quality: 0.6, accepted: true }));

    const calmConfig = buildBeing();
    const calm = createBeing(calmConfig);
    integrate(calm, { entry: { kind: "action", type: "acknowledge" } });
    await resolveAllPending(calm, () => ({ quality: 0.6, accepted: true }));

    const pDepth = computeDepth(
      pressured.practices.practices.get("gratitudePractice")!,
      pressured.elapsedMs,
    );
    const cDepth = computeDepth(calm.practices.practices.get("gratitudePractice")!, calm.elapsedMs);
    expect(pDepth).toBeGreaterThan(cDepth);
  });

  it("substrate respects capacity (FIFO eviction)", async () => {
    const being = createBeing({
      ...buildBeing(),
      practices: {
        seeds: [{ id: "gratitudePractice", overrides: { substrateCapacity: 3 } }],
      },
    });

    for (let i = 0; i < 5; i++) {
      integrate(being, { entry: { kind: "action", type: "acknowledge" } });
      await resolveAllPending(being, () => ({ quality: 0.7, accepted: true }));
    }

    const substrate = being.practices.practices.get("gratitudePractice")!.substrate;
    expect(substrate.artifacts).toHaveLength(3);
    expect(substrate.capacity).toBe(3);
  });

  it("creatorConnection requires a seed at construction", () => {
    expect(() =>
      createBeing({
        id: "x",
        name: "x",
        drives: { tierCount: 1, drives: [] },
        practices: { seeds: [{ id: "creatorConnection" }] },
        subscriptions: [],
        capabilities: [],
      }),
    ).toThrow(/seed/);
  });

  it("integrityPractice triggers only fire under pressure", () => {
    const being = createBeing({
      id: "x",
      name: "x",
      drives: {
        tierCount: 1,
        drives: [
          {
            id: "calm",
            name: "Calm",
            description: "t",
            tier: 1,
            weight: 1,
            initialLevel: 0.9,
            target: 0.7,
            drift: { kind: "linear", ratePerHour: 0 },
            satiatedBy: [],
          },
        ],
      },
      practices: { seeds: [{ id: "integrityPractice" }] },
      subscriptions: [],
      capabilities: [],
    });

    // Drive is well-satisfied: no pressure → no integrity attempts
    const r1 = integrate(being, {
      entry: { kind: "action", type: "honest-admission" },
    });
    expect(r1.pendingAttemptIds).toHaveLength(0);
  });
});
