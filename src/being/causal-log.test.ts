/**
 * Causal logs for drives and wear.
 *
 * These record the *discontinuities* in drive state — satiations, and crossings
 * between wear zones. Drift is deliberately absent: it is continuous, derivable
 * from the drift parameters and elapsed time, and "it drifted" explains nothing
 * worth storing. Together with the sampled `driveTrajectory` they answer "why is
 * this drive here" without a record per tick.
 *
 * See docs/design/v0.3/intention.md, "The drive-state refactor".
 */

import { describe, expect, it } from "vitest";
import type { Being, BeingConfig, DriftFunction } from "../types.js";
import { DEFAULT_WEAR_CONFIG } from "../wear/config.js";
import { wearZone } from "../wear/query.js";
import { createBeing } from "./create.js";
import { integrate, tick } from "./lifecycle.js";
import { deserializeBeing, serializeBeing } from "./serialize.js";

const HOUR = 3_600_000;

function makeBeing(initialLevel: number, ratePerHour: number): Being {
  return createBeing({
    id: "causal",
    name: "Causal",
    drives: {
      tierCount: 1,
      drives: [
        {
          id: "connection",
          name: "Connection",
          description: "The need to be met.",
          tier: 1,
          weight: 1,
          initialLevel,
          target: 0.8,
          drift: { kind: "linear", ratePerHour } as DriftFunction,
          satiatedBy: [{ matches: { kind: "event", type: "greeted" }, amount: 0.1 }],
        },
      ],
    },
    practices: { seeds: [] },
    subscriptions: [],
    capabilities: [],
  } as BeingConfig);
}

const greeted = { kind: "event", type: "greeted" } as const;

describe("satiation log", () => {
  it("records a caused change with its entry", () => {
    const being = makeBeing(0.5, 0);
    integrate(being, { entry: greeted });

    expect(being.history.satiations).toHaveLength(1);
    const record = being.history.satiations[0]!;
    expect(record.driveId).toBe("connection");
    expect(record.before).toBeCloseTo(0.5, 10);
    expect(record.after).toBeCloseTo(0.6, 10);
    expect(record.requested).toBeCloseTo(0.1, 10);
    expect(record.entry).toEqual(greeted);
  });

  it("stamps the record with being-time, not wall time", () => {
    const being = makeBeing(0.5, 0);
    tick(being, 3 * HOUR);
    integrate(being, { entry: greeted });

    expect(being.history.satiations[0]!.atMs).toBe(3 * HOUR);
  });

  it("records nothing when no binding matches", () => {
    const being = makeBeing(0.5, 0);
    integrate(being, { entry: { kind: "event", type: "ignored" } });

    expect(being.history.satiations).toHaveLength(0);
  });

  it("exposes clamping loss — requested exceeds what landed", () => {
    // At 0.95 a 0.1 satiation only has 0.05 of room. The surplus is discarded,
    // and being able to see that is the point of recording `requested`.
    const being = makeBeing(0.95, 0);
    integrate(being, { entry: greeted });

    const record = being.history.satiations[0]!;
    expect(record.requested).toBeCloseTo(0.1, 10);
    expect(record.after - record.before).toBeCloseTo(0.05, 10);
    expect(record.requested).toBeGreaterThan(record.after - record.before);
  });

  it("requested equals what landed when there is room", () => {
    const being = makeBeing(0.5, 0);
    integrate(being, { entry: greeted });

    const record = being.history.satiations[0]!;
    expect(record.requested).toBeCloseTo(record.after - record.before, 10);
  });

  it("does not record drift", () => {
    const being = makeBeing(0.8, -0.02);
    for (let h = 0; h < 24; h++) tick(being, HOUR);

    expect(being.history.satiations).toHaveLength(0);
    // ...but the level moved, and the trajectory shows it.
    expect(being.drives.drives.get("connection")!.level).toBeLessThan(0.8);
    expect(being.history.driveTrajectory.length).toBe(24);
  });

  it("is a bounded ring buffer", () => {
    const being = makeBeing(0.5, 0);
    for (let i = 0; i < 250; i++) integrate(being, { entry: greeted });

    expect(being.history.satiations).toHaveLength(200);
  });
});

describe("wear transition log", () => {
  it("records the crossing below the critical threshold", () => {
    // 0.21 -> 0.19 in one hour crosses the 0.2 critical threshold.
    const being = makeBeing(0.21, -0.02);
    tick(being, HOUR);

    expect(being.history.wearTransitions).toHaveLength(1);
    const t = being.history.wearTransitions[0]!;
    expect(t.driveId).toBe("connection");
    expect(t.from).toBe("between");
    expect(t.to).toBe("below");
    expect(t.level).toBeCloseTo(0.19, 10);
    expect(t.atMs).toBe(HOUR);
  });

  it("records above -> between -> below as two separate crossings", () => {
    const being = makeBeing(0.42, -0.02);

    tick(being, HOUR); // 0.42 -> 0.40, no longer strictly above
    tick(being, 10 * HOUR); // 0.40 -> 0.20... and past
    for (let h = 0; h < 12; h++) tick(being, HOUR);

    const kinds = being.history.wearTransitions.map((t) => `${t.from}->${t.to}`);
    expect(kinds).toEqual(["above->between", "between->below"]);
  });

  it("records nothing while a drive stays in one zone", () => {
    const being = makeBeing(0.9, 0);
    for (let h = 0; h < 24; h++) tick(being, HOUR);

    expect(being.history.wearTransitions).toHaveLength(0);
  });

  it("attributes an upward crossing to the satiation that caused it", () => {
    const being = makeBeing(0.19, 0); // below
    expect(wearZone(0.19, DEFAULT_WEAR_CONFIG)).toBe("below");

    // Three satiations lift it to 0.49, past the 0.4 recovery line. Each
    // boundary is crossed separately, so two records rather than one jump.
    integrate(being, { entry: greeted }); // 0.29 — below -> between
    integrate(being, { entry: greeted }); // 0.39 — no crossing
    integrate(being, { entry: greeted }); // 0.49 — between -> above

    expect(being.history.wearTransitions.map((t) => `${t.from}->${t.to}`)).toEqual([
      "below->between",
      "between->above",
    ]);

    // Recorded during integrate, with no tick needed — the crossing belongs to
    // its cause, not to whichever tick happens next.
    expect(being.history.wearTransitions.every((t) => t.atMs === 0)).toBe(true);
  });

  it("does not record a crossing for a zero-length tick", () => {
    const being = makeBeing(0.21, -0.02);
    tick(being, 0);

    expect(being.history.wearTransitions).toHaveLength(0);
  });
});

describe("serialization", () => {
  it("round-trips both logs", () => {
    const being = makeBeing(0.21, -0.02);
    integrate(being, { entry: greeted });
    tick(being, 5 * HOUR);

    const restored = deserializeBeing(JSON.parse(JSON.stringify(serializeBeing(being))));

    expect(restored.history.satiations).toEqual(being.history.satiations);
    expect(restored.history.wearTransitions).toEqual(being.history.wearTransitions);
  });

  it("tolerates a payload written before the logs existed", () => {
    // A blind cast would leave these undefined and the next push would throw —
    // a crash on load rather than a degraded read.
    const being = makeBeing(0.5, 0);
    const serialized = JSON.parse(JSON.stringify(serializeBeing(being)));
    delete serialized.history.satiations;
    delete serialized.history.wearTransitions;

    const restored = deserializeBeing(serialized);
    expect(restored.history.satiations).toEqual([]);
    expect(restored.history.wearTransitions).toEqual([]);

    expect(() => integrate(restored, { entry: greeted })).not.toThrow();
    expect(restored.history.satiations).toHaveLength(1);
  });
});

describe("wearZone", () => {
  it("matches the branch structure of the wear tracker", () => {
    expect(wearZone(0.19, DEFAULT_WEAR_CONFIG)).toBe("below");
    expect(wearZone(0.2, DEFAULT_WEAR_CONFIG)).toBe("between"); // not strictly below
    expect(wearZone(0.3, DEFAULT_WEAR_CONFIG)).toBe("between");
    expect(wearZone(0.4, DEFAULT_WEAR_CONFIG)).toBe("between"); // not strictly above
    expect(wearZone(0.41, DEFAULT_WEAR_CONFIG)).toBe("above");
  });
});
