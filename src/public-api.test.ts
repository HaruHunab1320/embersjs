/**
 * The public API surface.
 *
 * Every other test imports from the module that defines a symbol, which means
 * none of them can see whether it is actually reachable from the package root.
 * A symbol implemented, tested and documented but never re-exported passes the
 * entire suite and is invisible to consumers — exactly what happened to
 * `expireStalePursuits`, which shipped in a release commit exported only from
 * its submodule.
 *
 * `tsc` cannot catch it either: nothing inside the package references the root
 * barrel, so an omission there is not a type error anywhere.
 *
 * This file imports the barrel the way a consumer does.
 */

import { describe, expect, it } from "vitest";
import * as api from "./index.js";

/**
 * Symbols the intention layer promises. Adding one here before exporting it is
 * the intended workflow — the test fails until the barrel is updated.
 */
const INTENTION_EXPORTS = [
  // recording
  "surface",
  "commit",
  "decline",
  "recordAction",
  "end",
  "expireStalePursuits",
  // reading
  "currentIntentions",
  "pendingCandidates",
  "recentDeclines",
  "eligibleToSurface",
  // derived measures
  "urgency",
  "sourcePressure",
  // policy constants
  "MAX_COMMITTED_INTENTIONS",
  "DEFAULT_URGENCY_FLOOR",
  "DEFAULT_MAX_ATTEMPTS",
  "DEFAULT_SURFACING_THRESHOLD",
  "DEFAULT_DECLINE_COOLDOWN_MS",
] as const;

/** A representative slice of the pre-existing surface, so a barrel edit cannot quietly drop it. */
const CORE_EXPORTS = [
  "createBeing",
  "tick",
  "integrate",
  "metabolize",
  "resolveAttempt",
  "resolveAllPending",
  "getPendingAttempts",
  "expirePendingAttempts",
  "availableCapabilities",
  "weightAttention",
  "computeDepth",
  "serializeBeing",
  "deserializeBeing",
  "applyState",
  "wearZone",
  "tickWear",
] as const;

describe("public API", () => {
  it.each(INTENTION_EXPORTS)("exports %s", (name) => {
    expect(api).toHaveProperty(name);
    expect((api as Record<string, unknown>)[name]).toBeDefined();
  });

  it.each(CORE_EXPORTS)("still exports %s", (name) => {
    expect(api).toHaveProperty(name);
    expect((api as Record<string, unknown>)[name]).toBeDefined();
  });

  it("exposes the intention lifecycle as callable functions", () => {
    for (const name of [
      "surface",
      "commit",
      "decline",
      "recordAction",
      "end",
      "expireStalePursuits",
      "currentIntentions",
      "eligibleToSurface",
      "urgency",
    ]) {
      expect(typeof (api as Record<string, unknown>)[name]).toBe("function");
    }
  });

  it("exposes policy constants as numbers", () => {
    expect(api.MAX_COMMITTED_INTENTIONS).toBeTypeOf("number");
    expect(api.DEFAULT_URGENCY_FLOOR).toBeTypeOf("number");
    expect(api.DEFAULT_MAX_ATTEMPTS).toBeTypeOf("number");
    expect(api.DEFAULT_SURFACING_THRESHOLD).toBeTypeOf("number");
    expect(api.DEFAULT_DECLINE_COOLDOWN_MS).toBeTypeOf("number");
  });

  it("drives the whole intention lifecycle through the barrel alone", () => {
    // The consumer's path end to end. If any step is unreachable from the
    // root, this fails rather than a submodule test passing in isolation.
    const being = api.createBeing({
      id: "surface-check",
      name: "Surface Check",
      drives: {
        tierCount: 1,
        drives: [
          {
            id: "connection",
            name: "Connection",
            description: "",
            tier: 1,
            weight: 1,
            initialLevel: 0.1,
            target: 0.8,
            drift: { kind: "linear", ratePerHour: 0 },
            satiatedBy: [{ matches: { kind: "event", type: "greeted" }, amount: 0.9 }],
            pursuableBy: [{ satisfier: { kind: "affordance", ref: "hearth" } }],
          },
        ],
      },
      practices: { seeds: [] },
      subscriptions: [],
      capabilities: [],
    });

    const eligible = api.eligibleToSurface(being);
    expect(eligible).toHaveLength(1);

    const candidate = api.surface(being, {
      sourceDriveId: eligible[0]!.driveId,
      satisfier: eligible[0]!.satisfier,
      aim: "tend the fire",
      trigger: { kind: "quiet" },
    });

    const intention = api.commit(being, candidate.id);
    expect(api.currentIntentions(being)).toHaveLength(1);
    expect(api.urgency(being, intention)).toBeGreaterThan(0);

    api.recordAction(being, intention.id);
    expect(api.currentIntentions(being)[0]!.attempts).toBe(1);

    // Satisfied by other means; expiry should reap it.
    api.integrate(being, { entry: { kind: "event", type: "greeted" } });
    expect(api.expireStalePursuits(being)).toHaveLength(1);
    expect(api.currentIntentions(being)).toHaveLength(0);
  });
});
