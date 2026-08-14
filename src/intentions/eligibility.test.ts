import { describe, expect, it } from "vitest";
import { createBeing } from "../being/create.js";
import { integrate, tick } from "../being/lifecycle.js";
import { deserializeBeing, serializeBeing } from "../being/serialize.js";
import type { Being, BeingConfig, Pursuable, Satisfier } from "../types.js";
import { commit, decline, surface } from "./core.js";
import {
  DEFAULT_DECLINE_COOLDOWN_MS,
  DEFAULT_SURFACING_THRESHOLD,
  eligibleToSurface,
} from "./eligibility.js";

const HOUR = 3_600_000;

const HEARTH: Satisfier = { kind: "affordance", ref: "hearth" };
const DOOR: Satisfier = { kind: "affordance", ref: "door" };

function makeBeing(
  drives: Array<{ id: string; level: number; pursuableBy?: readonly Pursuable[] }>,
): Being {
  return createBeing({
    id: "b",
    name: "B",
    drives: {
      tierCount: 1,
      drives: drives.map((d) => ({
        id: d.id,
        name: d.id,
        description: "",
        tier: 1,
        weight: 1,
        initialLevel: d.level,
        target: 0.8,
        drift: { kind: "linear", ratePerHour: 0 },
        satiatedBy: [{ matches: { kind: "event", type: "greeted" }, amount: 0.6 }],
        pursuableBy: d.pursuableBy,
      })),
    },
    practices: { seeds: [] },
    subscriptions: [],
    capabilities: [],
  } as BeingConfig);
}

describe("eligibility", () => {
  it("reports nothing for a drive with no pursuableBy — latent by design", () => {
    const being = makeBeing([{ id: "connection", level: 0.1 }]);
    expect(eligibleToSurface(being)).toHaveLength(0);
  });

  it("reports a pursuable once pressure clears the threshold", () => {
    // pressure = target - level = 0.8 - 0.1 = 0.7, well over the default 0.2
    const being = makeBeing([
      { id: "connection", level: 0.1, pursuableBy: [{ satisfier: HEARTH, hint: "the fire" }] },
    ]);

    const eligible = eligibleToSurface(being);
    expect(eligible).toHaveLength(1);
    expect(eligible[0]).toMatchObject({
      driveId: "connection",
      satisfier: HEARTH,
      hint: "the fire",
      threshold: DEFAULT_SURFACING_THRESHOLD,
    });
    expect(eligible[0]!.pressure).toBeCloseTo(0.7, 10);
  });

  it("stays silent while pressure is below the threshold", () => {
    // pressure = 0.8 - 0.7 = 0.1, under the default 0.2
    const being = makeBeing([
      { id: "connection", level: 0.7, pursuableBy: [{ satisfier: HEARTH }] },
    ]);
    expect(eligibleToSurface(being)).toHaveLength(0);
  });

  it("honors a per-pursuable threshold", () => {
    const being = makeBeing([
      { id: "connection", level: 0.5, pursuableBy: [{ satisfier: HEARTH, threshold: 0.5 }] },
    ]);
    // pressure 0.3 < 0.5
    expect(eligibleToSurface(being)).toHaveLength(0);

    const eager = makeBeing([
      { id: "connection", level: 0.5, pursuableBy: [{ satisfier: HEARTH, threshold: 0.1 }] },
    ]);
    expect(eligibleToSurface(eager)).toHaveLength(1);
  });

  it("orders by pressure, most pressing first", () => {
    const being = makeBeing([
      { id: "mild", level: 0.5, pursuableBy: [{ satisfier: HEARTH }] },
      { id: "urgent", level: 0.0, pursuableBy: [{ satisfier: DOOR }] },
    ]);

    expect(eligibleToSurface(being).map((e) => e.driveId)).toEqual(["urgent", "mild"]);
  });

  it("goes quiet once the drive is satisfied by other means", () => {
    const being = makeBeing([
      { id: "connection", level: 0.1, pursuableBy: [{ satisfier: HEARTH }] },
    ]);
    expect(eligibleToSurface(being)).toHaveLength(1);

    integrate(being, { entry: { kind: "event", type: "greeted" } });
    expect(eligibleToSurface(being)).toHaveLength(0);
  });
});

describe("suppression", () => {
  it("does not re-offer something already committed to", () => {
    const being = makeBeing([
      { id: "connection", level: 0.1, pursuableBy: [{ satisfier: HEARTH }] },
    ]);

    const candidate = surface(being, {
      sourceDriveId: "connection",
      satisfier: HEARTH,
      aim: "tend the fire",
      trigger: { kind: "quiet" },
    });
    commit(being, candidate.id);

    expect(eligibleToSurface(being)).toHaveLength(0);
  });

  it("offers a different satisfier for the same drive while one is committed", () => {
    const being = makeBeing([
      {
        id: "connection",
        level: 0.1,
        pursuableBy: [{ satisfier: HEARTH }, { satisfier: DOOR }],
      },
    ]);

    const candidate = surface(being, {
      sourceDriveId: "connection",
      satisfier: HEARTH,
      aim: "tend the fire",
      trigger: { kind: "quiet" },
    });
    commit(being, candidate.id);

    expect(eligibleToSurface(being).map((e) => e.satisfier.ref)).toEqual(["door"]);
  });

  it("suppresses a declined pairing for the cooldown, then offers it again", () => {
    const being = makeBeing([
      { id: "connection", level: 0.1, pursuableBy: [{ satisfier: HEARTH }] },
    ]);

    const candidate = surface(being, {
      sourceDriveId: "connection",
      satisfier: HEARTH,
      aim: "tend the fire",
      trigger: { kind: "quiet" },
    });
    decline(being, candidate.id, "not now");

    expect(eligibleToSurface(being)).toHaveLength(0);

    tick(being, DEFAULT_DECLINE_COOLDOWN_MS + HOUR);
    expect(eligibleToSurface(being)).toHaveLength(1);
  });

  it("a zero cooldown disables decline suppression", () => {
    const being = makeBeing([
      { id: "connection", level: 0.1, pursuableBy: [{ satisfier: HEARTH }] },
    ]);

    const candidate = surface(being, {
      sourceDriveId: "connection",
      satisfier: HEARTH,
      aim: "tend the fire",
      trigger: { kind: "quiet" },
    });
    decline(being, candidate.id, "not now");

    expect(eligibleToSurface(being, { declineCooldownMs: 0 })).toHaveLength(1);
  });

  it("distinguishes pairings by satisfier params", () => {
    const light: Satisfier = { kind: "affordance", ref: "hearth", params: { actionId: "light" } };
    const bank: Satisfier = { kind: "affordance", ref: "hearth", params: { actionId: "bank" } };

    const being = makeBeing([
      { id: "connection", level: 0.1, pursuableBy: [{ satisfier: light }, { satisfier: bank }] },
    ]);

    const candidate = surface(being, {
      sourceDriveId: "connection",
      satisfier: light,
      aim: "light it",
      trigger: { kind: "quiet" },
    });
    commit(being, candidate.id);

    // Banking the fire is a different pursuit and should still be offered.
    const remaining = eligibleToSurface(being);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.satisfier.params).toEqual({ actionId: "bank" });
  });

  it("matches params regardless of key order", () => {
    const a: Satisfier = { kind: "affordance", ref: "hearth", params: { x: 1, y: 2 } };
    const b: Satisfier = { kind: "affordance", ref: "hearth", params: { y: 2, x: 1 } };

    const being = makeBeing([{ id: "connection", level: 0.1, pursuableBy: [{ satisfier: a }] }]);

    const candidate = surface(being, {
      sourceDriveId: "connection",
      satisfier: b,
      aim: "same thing",
      trigger: { kind: "quiet" },
    });
    commit(being, candidate.id);

    expect(eligibleToSurface(being)).toHaveLength(0);
  });
});

describe("serialization", () => {
  it("round-trips pursuableBy so a restored being can still pursue", () => {
    const being = makeBeing([
      {
        id: "connection",
        level: 0.1,
        pursuableBy: [{ satisfier: HEARTH, threshold: 0.15, hint: "the fire" }],
      },
    ]);
    expect(eligibleToSurface(being)).toHaveLength(1);

    const restored = deserializeBeing(JSON.parse(JSON.stringify(serializeBeing(being))));

    expect(restored.drives.drives.get("connection")!.pursuableBy).toEqual([
      { satisfier: HEARTH, threshold: 0.15, hint: "the fire" },
    ]);
    expect(eligibleToSurface(restored)).toHaveLength(1);
  });

  it("leaves a drive without pursuables undefined rather than empty", () => {
    const being = makeBeing([{ id: "connection", level: 0.1 }]);
    const restored = deserializeBeing(JSON.parse(JSON.stringify(serializeBeing(being))));

    expect(restored.drives.drives.get("connection")!.pursuableBy).toBeUndefined();
    expect(eligibleToSurface(restored)).toHaveLength(0);
  });
});
