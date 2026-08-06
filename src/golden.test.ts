/**
 * Golden trajectory tests.
 *
 * These pin the *current* numeric behavior of drive drift, satiation and wear
 * so that folding that state over an event log (v0.3) can be proven
 * behavior-preserving. They are deliberately written against exact values
 * rather than properties: a golden test that tolerates drift cannot detect it.
 *
 * If one of these fails after a refactor, the refactor changed behavior. That
 * is a bug until someone decides otherwise and updates the constant with a
 * comment explaining why.
 *
 * Two classes of behavior are pinned here that a naive reimplementation is
 * likely to get wrong, both of them consequences of clamping to [0,1]:
 *
 *   1. **Order dependence.** Satiation and drift both clamp after every step,
 *      so near a bound they do not commute.
 *   2. **Tick granularity.** Whether a span is advanced in one step or many
 *      changes the result once clamping bites, and changes wear regardless.
 *
 * See docs/design/v0.3/intention.md, "The drive-state refactor".
 */

import { describe, expect, it } from "vitest";
import { createBeing } from "./being/create.js";
import { integrate, tick } from "./being/lifecycle.js";
import { applyDrift } from "./drives/drift.js";
import { satiateDrives } from "./drives/satiate.js";
import { tickDrives } from "./drives/tick.js";
import type { Being, BeingConfig, DriftFunction, DriveStack } from "./types.js";
import { DEFAULT_WEAR_CONFIG } from "./wear/config.js";
import { tickWear } from "./wear/tick.js";

const HOUR = 3_600_000;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function driveConfig(overrides: {
  id?: string;
  tier?: number;
  initialLevel: number;
  drift: DriftFunction;
  satiationAmount?: number;
}) {
  return {
    id: overrides.id ?? "connection",
    name: "Connection",
    description: "The need to be met.",
    tier: overrides.tier ?? 1,
    weight: 1,
    initialLevel: overrides.initialLevel,
    target: 0.8,
    drift: overrides.drift,
    satiatedBy: [
      {
        matches: { kind: "event" as const, type: "greeted" },
        amount: overrides.satiationAmount ?? 0.1,
      },
    ],
  };
}

function makeBeing(config: Partial<BeingConfig> & { drives: BeingConfig["drives"] }): Being {
  return createBeing({
    id: "golden",
    name: "Golden",
    practices: { seeds: [] },
    subscriptions: [],
    capabilities: [],
    ...config,
  } as BeingConfig);
}

function singleDriveBeing(initialLevel: number, ratePerHour: number, tier = 1): Being {
  return makeBeing({
    drives: {
      tierCount: Math.max(tier, 1),
      drives: [driveConfig({ initialLevel, tier, drift: { kind: "linear", ratePerHour } })],
    },
  });
}

function levelOf(being: Being, id = "connection"): number {
  return being.drives.drives.get(id)!.level;
}

/** Rounds to 10 decimal places so float noise doesn't make goldens brittle. */
function round(n: number): number {
  return Math.round(n * 1e10) / 1e10;
}

// ---------------------------------------------------------------------------
// Drift
// ---------------------------------------------------------------------------

describe("golden: drift", () => {
  it("linear drift is exact over whole hours", () => {
    const drift: DriftFunction = { kind: "linear", ratePerHour: -0.02 };
    expect(round(applyDrift(drift, 0.8, 1 * HOUR))).toBe(0.78);
    expect(round(applyDrift(drift, 0.8, 5 * HOUR))).toBe(0.7);
    expect(round(applyDrift(drift, 0.8, 24 * HOUR))).toBe(0.32);
  });

  it("linear drift is exact over partial hours", () => {
    const drift: DriftFunction = { kind: "linear", ratePerHour: -0.02 };
    expect(round(applyDrift(drift, 0.5, HOUR / 2))).toBe(0.49);
    expect(round(applyDrift(drift, 0.5, HOUR / 4))).toBe(0.495);
  });

  it("linear drift clamps at both bounds", () => {
    expect(applyDrift({ kind: "linear", ratePerHour: -0.5 }, 0.1, 10 * HOUR)).toBe(0);
    expect(applyDrift({ kind: "linear", ratePerHour: 0.5 }, 0.9, 10 * HOUR)).toBe(1);
  });

  it("exponential drift is half-life decay toward zero", () => {
    const drift: DriftFunction = { kind: "exponential", halfLifeHours: 6 };
    expect(round(applyDrift(drift, 1.0, 6 * HOUR))).toBe(0.5);
    expect(round(applyDrift(drift, 1.0, 12 * HOUR))).toBe(0.25);
    expect(round(applyDrift(drift, 0.8, 3 * HOUR))).toBe(round(0.8 * 0.5 ** 0.5));
  });

  it("non-positive dt is a no-op for every kind", () => {
    expect(applyDrift({ kind: "linear", ratePerHour: -0.02 }, 0.5, 0)).toBe(0.5);
    expect(applyDrift({ kind: "linear", ratePerHour: -0.02 }, 0.5, -HOUR)).toBe(0.5);
    expect(applyDrift({ kind: "exponential", halfLifeHours: 6 }, 0.5, 0)).toBe(0.5);
  });

  it("custom drift output is clamped like the built-ins", () => {
    const drift: DriftFunction = { kind: "custom", compute: () => 5 };
    expect(applyDrift(drift, 0.5, HOUR)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tick granularity — the property a fold is most likely to break
// ---------------------------------------------------------------------------

describe("golden: tick granularity", () => {
  it("exponential drift composes exactly across sub-ticks", () => {
    const drift: DriftFunction = { kind: "exponential", halfLifeHours: 6 };
    const coarse = applyDrift(drift, 1.0, 12 * HOUR);

    let fine = 1.0;
    for (let i = 0; i < 12; i++) fine = applyDrift(drift, fine, HOUR);

    expect(round(coarse)).toBe(round(fine));
  });

  it("linear drift composes exactly while it stays off the bounds", () => {
    const drift: DriftFunction = { kind: "linear", ratePerHour: -0.02 };
    const coarse = applyDrift(drift, 0.8, 10 * HOUR);

    let fine = 0.8;
    for (let i = 0; i < 10; i++) fine = applyDrift(drift, fine, HOUR);

    expect(round(coarse)).toBe(round(fine));
    expect(round(coarse)).toBe(0.6);
  });

  it("linear drift is granularity-invariant even through a clamp", () => {
    // Both paths saturate at 0 and stay there; no information is recoverable
    // either way, so this one is safe. Pinned because the fold must not
    // "improve" it into a negative carry.
    const drift: DriftFunction = { kind: "linear", ratePerHour: -0.5 };
    const coarse = applyDrift(drift, 0.1, 4 * HOUR);

    let fine = 0.1;
    for (let i = 0; i < 4; i++) fine = applyDrift(drift, fine, HOUR);

    expect(coarse).toBe(0);
    expect(fine).toBe(0);
  });

  it("wear IS granularity-sensitive at the recovery horizon", () => {
    // tickTracker checks `newAboveMs >= recoveryHorizonMs` per call, so a
    // single coarse tick can clear chronic state that many fine ticks reach
    // by exactly the same elapsed time. Pinned as current behavior, not as
    // desirable behavior.
    const drives = singleDriveBeing(0.9, 0).drives;
    const worn = {
      perDrive: new Map([["connection", { sustainedBelowMs: 20 * HOUR, sustainedAboveMs: 0 }]]),
      chronicLoad: 0.8,
    };

    const coarse = tickWear(worn, drives, 12 * HOUR, DEFAULT_WEAR_CONFIG);

    let fine = worn;
    for (let i = 0; i < 12; i++) {
      fine = tickWear(fine, drives, HOUR, DEFAULT_WEAR_CONFIG);
    }

    expect(coarse.perDrive.get("connection")!.sustainedBelowMs).toBe(0);
    expect(fine.perDrive.get("connection")!.sustainedBelowMs).toBe(0);
    expect(coarse.chronicLoad).toBe(fine.chronicLoad);
  });
});

// ---------------------------------------------------------------------------
// Order dependence — the F1 case
// ---------------------------------------------------------------------------

describe("golden: clamped operations do not commute", () => {
  function stackAt(level: number): DriveStack {
    return singleDriveBeing(level, -0.02).drives;
  }

  it("satiate-then-drift differs from drift-then-satiate near the ceiling", () => {
    const greeted = { kind: "event" as const, type: "greeted" };

    // Start high enough that satiation clamps.
    const satiateFirst = tickDrives(satiateDrives(stackAt(0.95), greeted).stack, HOUR);
    const driftFirst = satiateDrives(tickDrives(stackAt(0.95), HOUR), greeted).stack;

    const a = round(satiateFirst.drives.get("connection")!.level);
    const b = round(driftFirst.drives.get("connection")!.level);

    // satiate: 0.95 + 0.1 -> clamped to 1.0, then drift -> 0.98
    expect(a).toBe(0.98);
    // drift: 0.95 -> 0.93, then satiate -> 1.03 -> clamped to 1.0
    expect(b).toBe(1);
    expect(a).not.toBe(b);
  });

  it("order does not matter away from the bounds", () => {
    const greeted = { kind: "event" as const, type: "greeted" };

    const satiateFirst = tickDrives(satiateDrives(stackAt(0.5), greeted).stack, HOUR);
    const driftFirst = satiateDrives(tickDrives(stackAt(0.5), HOUR), greeted).stack;

    expect(round(satiateFirst.drives.get("connection")!.level)).toBe(
      round(driftFirst.drives.get("connection")!.level),
    );
  });

  it("multiple matching bindings sum before clamping", () => {
    const being = makeBeing({
      drives: {
        tierCount: 1,
        drives: [
          {
            ...driveConfig({ initialLevel: 0.5, drift: { kind: "linear", ratePerHour: 0 } }),
            satiatedBy: [
              { matches: { kind: "event", type: "greeted" }, amount: 0.1 },
              { matches: { kind: "event", type: "greeted" }, amount: 0.25 },
            ],
          },
        ],
      },
    });

    const { stack, changes } = satiateDrives(being.drives, {
      kind: "event",
      type: "greeted",
    });

    expect(round(stack.drives.get("connection")!.level)).toBe(0.85);
    expect(changes).toHaveLength(1);
    expect(round(changes[0]!.after)).toBe(0.85);
  });
});

// ---------------------------------------------------------------------------
// Wear
// ---------------------------------------------------------------------------

describe("golden: wear", () => {
  it("accumulates below-time only under the critical threshold", () => {
    const below = singleDriveBeing(0.1, 0).drives; // < 0.2
    const between = singleDriveBeing(0.3, 0).drives; // between 0.2 and 0.4
    const above = singleDriveBeing(0.9, 0).drives; // > 0.4

    const empty = { perDrive: new Map(), chronicLoad: 0 };

    expect(tickWear(empty, below, HOUR, DEFAULT_WEAR_CONFIG).perDrive.get("connection")).toEqual({
      sustainedBelowMs: HOUR,
      sustainedAboveMs: 0,
    });

    // Hysteresis hold: neither tracker moves between the thresholds.
    expect(tickWear(empty, between, HOUR, DEFAULT_WEAR_CONFIG).perDrive.get("connection")).toEqual({
      sustainedBelowMs: 0,
      sustainedAboveMs: 0,
    });

    expect(tickWear(empty, above, HOUR, DEFAULT_WEAR_CONFIG).perDrive.get("connection")).toEqual({
      sustainedBelowMs: 0,
      sustainedAboveMs: HOUR,
    });
  });

  it("dropping below critical resets accumulated recovery", () => {
    const above = singleDriveBeing(0.9, 0).drives;
    const below = singleDriveBeing(0.1, 0).drives;

    let wear = { perDrive: new Map(), chronicLoad: 0 };
    wear = tickWear(wear, above, 4 * HOUR, DEFAULT_WEAR_CONFIG);
    expect(wear.perDrive.get("connection")!.sustainedAboveMs).toBe(4 * HOUR);

    wear = tickWear(wear, below, HOUR, DEFAULT_WEAR_CONFIG);
    expect(wear.perDrive.get("connection")).toEqual({
      sustainedBelowMs: HOUR,
      sustainedAboveMs: 0,
    });
  });

  it("chronicLoad reaches 1.0 for a tier-1 drive at exactly 24h below", () => {
    const below = singleDriveBeing(0.1, 0).drives;
    const wear = tickWear(
      { perDrive: new Map(), chronicLoad: 0 },
      below,
      24 * HOUR,
      DEFAULT_WEAR_CONFIG,
    );
    expect(wear.chronicLoad).toBe(1);
  });

  it("higher tiers saturate proportionally slower", () => {
    // tierSaturationMs = tier1SaturationMs * (1 + (tier - 1) * 0.5)
    // tier 2 -> 36h, so 24h below gives 24/36 = 0.666...
    const tier2 = singleDriveBeing(0.1, 0, 2).drives;
    const wear = tickWear(
      { perDrive: new Map(), chronicLoad: 0 },
      tier2,
      24 * HOUR,
      DEFAULT_WEAR_CONFIG,
    );
    expect(round(wear.chronicLoad)).toBe(round(24 / 36));
  });

  it("recovery is asymmetric — partial recovery scales contribution down", () => {
    const below = singleDriveBeing(0.1, 0).drives;
    const above = singleDriveBeing(0.9, 0).drives;

    let wear = tickWear(
      { perDrive: new Map(), chronicLoad: 0 },
      below,
      24 * HOUR,
      DEFAULT_WEAR_CONFIG,
    );
    expect(wear.chronicLoad).toBe(1);

    // 6h above = half the 12h recovery horizon -> contribution halves.
    wear = tickWear(wear, above, 6 * HOUR, DEFAULT_WEAR_CONFIG);
    expect(round(wear.chronicLoad)).toBe(0.5);

    // The remaining 6h completes recovery and clears below-time entirely.
    wear = tickWear(wear, above, 6 * HOUR, DEFAULT_WEAR_CONFIG);
    expect(wear.chronicLoad).toBe(0);
  });

  it("weights drives by inverse tier", () => {
    // Tier 1 weight 1, tier 2 weight 0.5. Only tier 1 is deprived and
    // saturated, so load = (1 * 1 + 0 * 0.5) / 1.5.
    const being = makeBeing({
      drives: {
        tierCount: 2,
        drives: [
          driveConfig({
            id: "t1",
            tier: 1,
            initialLevel: 0.1,
            drift: { kind: "linear", ratePerHour: 0 },
          }),
          driveConfig({
            id: "t2",
            tier: 2,
            initialLevel: 0.9,
            drift: { kind: "linear", ratePerHour: 0 },
          }),
        ],
      },
    });

    const wear = tickWear(
      { perDrive: new Map(), chronicLoad: 0 },
      being.drives,
      24 * HOUR,
      DEFAULT_WEAR_CONFIG,
    );
    expect(round(wear.chronicLoad)).toBe(round(1 / 1.5));
  });
});

// ---------------------------------------------------------------------------
// Integrated trajectory
// ---------------------------------------------------------------------------

describe("golden: integrated being trajectory", () => {
  it("pins a 48-hour hourly-ticked decline", () => {
    const being = singleDriveBeing(0.8, -0.02);
    const samples: number[] = [];

    for (let h = 1; h <= 48; h++) {
      tick(being, HOUR);
      if (h % 12 === 0) samples.push(round(levelOf(being)));
    }

    expect(samples).toEqual([0.56, 0.32, 0.08, 0]);
    expect(being.elapsedMs).toBe(48 * HOUR);

    // 19 hours below critical, not 18. The drive crosses 0.2 at hour 30 rather
    // than hour 31 because incremental float accumulation lands just under the
    // threshold. See "incremental accumulation is load-bearing" below — this
    // number is the observable consequence of that.
    expect(round(being.wear.chronicLoad)).toBe(round(19 / 24));
  });

  it("pins a decline interrupted by satiation", () => {
    const being = singleDriveBeing(0.8, -0.02);

    for (let h = 0; h < 10; h++) tick(being, HOUR);
    expect(round(levelOf(being))).toBe(0.6);

    integrate(being, { entry: { kind: "event", type: "greeted" } });
    expect(round(levelOf(being))).toBe(0.7);

    for (let h = 0; h < 10; h++) tick(being, HOUR);
    expect(round(levelOf(being))).toBe(0.5);
  });

  it("wear ticks against post-drift levels, not pre-drift", () => {
    // lifecycle.tick advances drives before wear. A drive crossing below
    // critical inside the tick accrues wear for that whole tick.
    const being = singleDriveBeing(0.21, -0.02);

    tick(being, HOUR); // 0.21 -> 0.19, now under the 0.2 critical threshold
    expect(round(levelOf(being))).toBe(0.19);
    expect(being.wear.perDrive.get("connection")!.sustainedBelowMs).toBe(HOUR);
  });

  it("incremental accumulation is load-bearing at threshold crossings", () => {
    // THE CONSTRAINT ON THE v0.3 FOLD.
    //
    // Drive level is currently produced by repeated `level + rate*hours`, and
    // the accumulated float error is not cosmetic: after 30 hourly steps from
    // 0.8 at -0.02/h the level is 0.19999999999999959, which is BELOW the 0.2
    // critical threshold. The closed-form equivalent, 0.8 - 0.02*30, is
    // 0.20000000000000007, which is ABOVE it.
    //
    // A fold that reconstructs level from the log in closed form therefore
    // crosses into chronic state one hour later than the current
    // implementation, and every downstream wear number shifts with it.
    //
    // The fold must replay step-by-step, or the divergence must be accepted
    // deliberately and this test updated with the reason.
    let incremental = 0.8;
    for (let h = 0; h < 30; h++)
      incremental = applyDrift({ kind: "linear", ratePerHour: -0.02 }, incremental, HOUR);
    const closedForm = applyDrift({ kind: "linear", ratePerHour: -0.02 }, 0.8, 30 * HOUR);

    expect(incremental).toBeLessThan(0.2);
    expect(closedForm).toBeGreaterThan(0.2);
    expect(incremental).not.toBe(closedForm);

    // They agree to 10dp — this is invisible to any tolerance-based test, which
    // is why the goldens here compare exact threshold behavior rather than
    // rounded levels.
    expect(round(incremental)).toBe(round(closedForm));
  });

  it("a zero-length tick changes nothing", () => {
    const being = singleDriveBeing(0.8, -0.02);
    tick(being, HOUR);
    const level = levelOf(being);
    const elapsed = being.elapsedMs;

    tick(being, 0);

    expect(levelOf(being)).toBe(level);
    expect(being.elapsedMs).toBe(elapsed);
  });
});
