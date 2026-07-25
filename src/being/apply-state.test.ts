import { describe, expect, it } from "vitest";
import type { BeingConfig } from "../types.js";
import { applyState } from "./apply-state.js";
import { createBeing } from "./create.js";
import { integrate, resolveAllPending, tick } from "./lifecycle.js";
import { deserializeBeing, serializeBeing } from "./serialize.js";

const HOUR = 3_600_000;

function buildConfig(): BeingConfig {
  return {
    id: "app",
    name: "App",
    drives: {
      tierCount: 1,
      drives: [
        {
          id: "presence",
          name: "Presence",
          description: "t",
          tier: 1,
          weight: 1,
          initialLevel: 0.5,
          target: 0.6,
          drift: { kind: "linear", ratePerHour: -0.05 },
          satiatedBy: [{ matches: { kind: "event", type: "ping" }, amount: 0.1 }],
        },
      ],
    },
    practices: { seeds: [{ id: "gratitudePractice" }] },
    subscriptions: [],
    capabilities: [],
  };
}

/** Runs a being through activity so it accumulates state worth persisting. */
async function exercise(being: ReturnType<typeof createBeing>): Promise<void> {
  for (let i = 0; i < 5; i++) {
    tick(being, HOUR);
    integrate(being, { entry: { kind: "action", type: "acknowledge" } });
    await resolveAllPending(being, () => ({ quality: 0.7, accepted: true }));
  }
}

/** serialize → JSON → deserialize, as a consumer would persist and reload. */
function roundtrip(being: ReturnType<typeof createBeing>): ReturnType<typeof createBeing> {
  return deserializeBeing(JSON.parse(JSON.stringify(serializeBeing(being))));
}

describe("applyState", () => {
  it("transplants state onto a fresh being", async () => {
    const original = createBeing(buildConfig());
    await exercise(original);

    const fresh = createBeing(buildConfig());
    const result = applyState(fresh, roundtrip(original));

    expect(fresh.elapsedMs).toBe(original.elapsedMs);
    expect(fresh.drives.drives.get("presence")!.level).toBeCloseTo(
      original.drives.drives.get("presence")!.level,
    );
    expect(fresh.practices.practices.get("gratitudePractice")!.substrate.artifacts.length).toBe(
      original.practices.practices.get("gratitudePractice")!.substrate.artifacts.length,
    );
    expect(fresh.wear.chronicLoad).toBe(original.wear.chronicLoad);
    expect(fresh.history.recentEntries.length).toBe(original.history.recentEntries.length);

    expect(result.drivesApplied).toEqual(["presence"]);
    expect(result.practicesApplied).toEqual(["gratitudePractice"]);
    expect(result.skippedDrives).toEqual([]);
    expect(result.skippedPractices).toEqual([]);
  });

  it("restores live satiation predicates that deserialization strips", () => {
    const original = createBeing(buildConfig());
    original.drives.drives.get("presence")!.level = 0.4;

    const restored = roundtrip(original);
    const fresh = createBeing(buildConfig());
    applyState(fresh, restored);

    // Both start from the same persisted level.
    expect(fresh.drives.drives.get("presence")!.level).toBeCloseTo(0.4);

    integrate(restored, { entry: { kind: "event", type: "ping" } });
    integrate(fresh, { entry: { kind: "event", type: "ping" } });

    // The rebuilt being satiates; the raw deserialized one is the control.
    expect(fresh.drives.drives.get("presence")!.level).toBeCloseTo(0.5);
    expect(fresh.drives.drives.get("presence")!.level).toBeGreaterThan(0.4);
  });

  it("preserves the target's drift function rather than the snapshot's", () => {
    const original = createBeing(buildConfig());
    tick(original, HOUR);

    const slower = buildConfig();
    slower.drives.drives[0]!.drift = { kind: "linear", ratePerHour: -0.01 };
    const fresh = createBeing(slower);
    applyState(fresh, roundtrip(original));

    const before = fresh.drives.drives.get("presence")!.level;
    tick(fresh, HOUR);
    const after = fresh.drives.drives.get("presence")!.level;

    // Target's -0.01/hr, not the snapshot's -0.05/hr.
    expect(before - after).toBeCloseTo(0.01);
  });

  it("skips and reports entities the target config no longer defines", async () => {
    const original = createBeing(buildConfig());
    await exercise(original);

    const reduced = buildConfig();
    reduced.drives.drives[0]!.id = "renamed";
    reduced.practices = { seeds: [{ id: "witnessPractice" }] };

    const fresh = createBeing(reduced);
    const result = applyState(fresh, roundtrip(original));

    expect(result.skippedDrives).toEqual(["presence"]);
    expect(result.skippedPractices).toEqual(["gratitudePractice"]);
    expect(result.drivesApplied).toEqual([]);
    expect(result.practicesApplied).toEqual([]);
    // The renamed drive keeps its configured initial level.
    expect(fresh.drives.drives.get("renamed")!.level).toBeCloseTo(0.5);
  });

  it("drops pending attempts whose practice no longer exists", () => {
    const original = createBeing(buildConfig());
    integrate(original, { entry: { kind: "action", type: "acknowledge" } });
    expect(original.pendingAttempts.length).toBeGreaterThan(0);

    const reduced = buildConfig();
    reduced.practices = { seeds: [{ id: "witnessPractice" }] };
    const fresh = createBeing(reduced);
    const result = applyState(fresh, roundtrip(original));

    expect(result.skippedAttempts).toBe(original.pendingAttempts.length);
    expect(fresh.pendingAttempts.length).toBe(0);
  });

  it("truncates substrate to the target's capacity", async () => {
    const original = createBeing(buildConfig());
    await exercise(original);

    const fresh = createBeing(buildConfig());
    const practice = fresh.practices.practices.get("gratitudePractice")!;
    practice.substrate = { artifacts: [], capacity: 2 };

    applyState(fresh, roundtrip(original));

    const substrate = fresh.practices.practices.get("gratitudePractice")!.substrate;
    expect(substrate.capacity).toBe(2);
    expect(substrate.artifacts.length).toBe(2);
    // Keeps the most recent artifacts.
    const originalArtifacts =
      original.practices.practices.get("gratitudePractice")!.substrate.artifacts;
    expect(substrate.artifacts[1]!.attemptId).toBe(
      originalArtifacts[originalArtifacts.length - 1]!.attemptId,
    );
  });

  it("does not mutate the source", async () => {
    const original = createBeing(buildConfig());
    await exercise(original);

    const source = roundtrip(original);
    const sourceLevel = source.drives.drives.get("presence")!.level;
    const sourceElapsed = source.elapsedMs;

    const fresh = createBeing(buildConfig());
    applyState(fresh, source);
    tick(fresh, HOUR);

    expect(source.drives.drives.get("presence")!.level).toBe(sourceLevel);
    expect(source.elapsedMs).toBe(sourceElapsed);
  });
});
