import { describe, expect, it } from "vitest";
import { createBeing } from "../being/create.js";
import { integrate, tick } from "../being/lifecycle.js";
import { deserializeBeing, serializeBeing } from "../being/serialize.js";
import type { Being, BeingConfig, Satisfier, SurfacingTrigger } from "../types.js";
import {
  commit,
  currentIntentions,
  decline,
  end,
  MAX_COMMITTED_INTENTIONS,
  pendingCandidates,
  recentDeclines,
  recordAction,
  sourcePressure,
  surface,
  urgency,
} from "./core.js";

const HOUR = 3_600_000;

const HEARTH: Satisfier = { kind: "affordance", ref: "hearth", params: { actionId: "light" } };
const QUIET: SurfacingTrigger = { kind: "quiet" };

function makeBeing(levels: Record<string, number> = { connection: 0.3 }): Being {
  return createBeing({
    id: "b",
    name: "B",
    drives: {
      tierCount: 1,
      drives: Object.entries(levels).map(([id, level]) => ({
        id,
        name: id,
        description: "",
        tier: 1,
        weight: 1,
        initialLevel: level,
        target: 0.8,
        drift: { kind: "linear", ratePerHour: 0 },
        satiatedBy: [{ matches: { kind: "event", type: "greeted" }, amount: 0.5 }],
      })),
    },
    practices: { seeds: [] },
    subscriptions: [],
    capabilities: [],
  } as BeingConfig);
}

function surfaceOne(being: Being, driveId = "connection", aim = "tend the fire") {
  return surface(being, { sourceDriveId: driveId, satisfier: HEARTH, aim, trigger: QUIET });
}

describe("surfacing", () => {
  it("records a candidate with the framework's aim and the drive's satisfier", () => {
    const being = makeBeing();
    const candidate = surfaceOne(being);

    expect(candidate.aim).toBe("tend the fire");
    expect(candidate.satisfier).toEqual(HEARTH);
    expect(candidate.sourceDriveId).toBe("connection");
    expect(candidate.trigger).toEqual(QUIET);
    expect(being.history.intentionLog).toHaveLength(1);
  });

  it("stamps the candidate with being-time", () => {
    const being = makeBeing();
    tick(being, 5 * HOUR);
    expect(surfaceOne(being).surfacedAtMs).toBe(5 * HOUR);
  });

  it("rejects a candidate for an unknown drive", () => {
    const being = makeBeing();
    expect(() =>
      surface(being, { sourceDriveId: "nope", satisfier: HEARTH, aim: "x", trigger: QUIET }),
    ).toThrow(/unknown drive/i);
  });

  it("surfacing alone commits to nothing", () => {
    const being = makeBeing();
    surfaceOne(being);

    expect(currentIntentions(being)).toHaveLength(0);
    expect(pendingCandidates(being)).toHaveLength(1);
  });
});

describe("adjudication", () => {
  it("commits a candidate into a live intention", () => {
    const being = makeBeing();
    const candidate = surfaceOne(being);
    const intention = commit(being, candidate.id);

    expect(intention.aim).toBe("tend the fire");
    expect(intention.fromCandidateId).toBe(candidate.id);
    expect(intention.attempts).toBe(0);
    expect(currentIntentions(being).map((i) => i.id)).toEqual([intention.id]);
    expect(pendingCandidates(being)).toHaveLength(0);
  });

  it("declining leaves the being shaped but not pursuing", () => {
    const being = makeBeing();
    const candidate = surfaceOne(being);
    decline(being, candidate.id, "already holding something more pressing");

    expect(currentIntentions(being)).toHaveLength(0);
    expect(pendingCandidates(being)).toHaveLength(0);
    // The pressure is untouched — a decline is not a discharge.
    expect(being.drives.drives.get("connection")!.level).toBe(0.3);

    const declines = recentDeclines(being);
    expect(declines).toHaveLength(1);
    expect(declines[0]!.reason).toMatch(/more pressing/);
    expect(declines[0]!.candidate.aim).toBe("tend the fire");
  });

  it("refuses to resolve the same candidate twice", () => {
    const being = makeBeing();
    const candidate = surfaceOne(being);
    commit(being, candidate.id);

    expect(() => commit(being, candidate.id)).toThrow(/already committed or declined/);
    expect(() => decline(being, candidate.id, "x")).toThrow(/already committed or declined/);
  });

  it("refuses an unknown candidate", () => {
    const being = makeBeing();
    expect(() => commit(being, "ghost")).toThrow(/unknown candidate/i);
    expect(() => decline(being, "ghost", "x")).toThrow(/unknown candidate/i);
  });

  it("supersedes the least urgent pursuit at the cap rather than refusing", () => {
    // Distinct drives so urgency ordering is unambiguous: pressure = target - level.
    const being = makeBeing({ a: 0.1, b: 0.3, c: 0.5, d: 0.0 });
    commit(being, surfaceOne(being, "a", "a").id);
    commit(being, surfaceOne(being, "b", "b").id);
    const weakest = commit(being, surfaceOne(being, "c", "c").id);

    expect(currentIntentions(being).map((i) => i.aim)).toEqual(["a", "b", "c"]);

    const incoming = commit(being, surfaceOne(being, "d", "d").id);

    // "c" was least urgent and yielded; the cap is respected without a throw.
    expect(currentIntentions(being)).toHaveLength(MAX_COMMITTED_INTENTIONS);
    expect(currentIntentions(being).map((i) => i.aim)).toEqual(["d", "a", "b"]);

    // And the displacement is in the log, not smuggled through an exception.
    expect(being.history.intentionLog).toContainEqual(
      expect.objectContaining({
        kind: "ended",
        intentionId: weakest.id,
        end: { kind: "superseded", byIntentionId: incoming.id },
      }),
    );
  });

  it("lets a framework decline instead, by inspecting what would be displaced", () => {
    const being = makeBeing({ a: 0.1, b: 0.3, c: 0.5 });
    commit(being, surfaceOne(being, "a", "a").id);
    commit(being, surfaceOne(being, "b", "b").id);
    commit(being, surfaceOne(being, "c", "c").id);

    const wouldDisplace = currentIntentions(being).at(-1)!;
    expect(wouldDisplace.aim).toBe("c");

    // Framework's call: not worth displacing anything.
    const extra = surfaceOne(being, "a", "one too many");
    decline(being, extra.id, `not worth displacing "${wouldDisplace.aim}"`);

    expect(currentIntentions(being).map((i) => i.aim)).toEqual(["a", "b", "c"]);
  });
});

describe("the fold", () => {
  it("counts actions taken toward a commitment", () => {
    const being = makeBeing();
    const intention = commit(being, surfaceOne(being).id);

    recordAction(being, intention.id);
    recordAction(being, intention.id);

    expect(currentIntentions(being)[0]!.attempts).toBe(2);
  });

  it("removes an intention when it ends, with the reason preserved in the log", () => {
    const being = makeBeing();
    const intention = commit(being, surfaceOne(being).id);
    end(being, intention.id, { kind: "satisfied" });

    expect(currentIntentions(being)).toHaveLength(0);
    expect(being.history.intentionLog.at(-1)).toMatchObject({
      kind: "ended",
      end: { kind: "satisfied" },
    });
  });

  it("refuses to act on or end something not currently committed", () => {
    const being = makeBeing();
    const intention = commit(being, surfaceOne(being).id);
    end(being, intention.id, { kind: "expired" });

    expect(() => recordAction(being, intention.id)).toThrow(/not currently committed/);
    expect(() => end(being, intention.id, { kind: "expired" })).toThrow(/not currently committed/);
  });

  it("is a pure function of the log — replay reconstructs the same view", () => {
    const being = makeBeing();
    const a = commit(being, surfaceOne(being, "connection", "a").id);
    commit(being, surfaceOne(being, "connection", "b").id);
    recordAction(being, a.id);
    end(being, a.id, { kind: "abandoned", reason: "changed my mind" });

    const replayed = makeBeing();
    replayed.history.intentionLog = [...being.history.intentionLog];

    expect(currentIntentions(replayed).map((i) => i.aim)).toEqual(
      currentIntentions(being).map((i) => i.aim),
    );
  });

  it("declines never enter the live set however many accumulate", () => {
    const being = makeBeing();
    for (let i = 0; i < 10; i++) {
      decline(being, surfaceOne(being, "connection", `aim ${i}`).id, "no");
    }
    expect(currentIntentions(being)).toHaveLength(0);
    expect(recentDeclines(being)).toHaveLength(10);
  });
});

describe("urgency", () => {
  it("reads the drive's current pressure, not the pressure at formation", () => {
    const being = makeBeing({ connection: 0.3 });
    const intention = commit(being, surfaceOne(being).id);

    const before = urgency(being, intention);
    expect(before).toBeGreaterThan(0);

    // Satisfied by other means — the commitment should decay, not persist.
    integrate(being, { entry: { kind: "event", type: "greeted" } });

    const after = urgency(being, currentIntentions(being)[0]!);
    expect(after).toBeLessThan(before);
    expect(sourcePressure(being, intention)).toBeCloseTo(0, 10);
  });

  it("decays with age", () => {
    const being = makeBeing();
    const intention = commit(being, surfaceOne(being).id);
    const fresh = urgency(being, intention);

    tick(being, 6 * HOUR); // one half-life
    const aged = urgency(being, currentIntentions(being)[0]!);

    expect(aged).toBeCloseTo(fresh * 0.5, 6);
  });

  it("decays with repeated attempts", () => {
    const being = makeBeing();
    const intention = commit(being, surfaceOne(being).id);
    const before = urgency(being, intention);

    recordAction(being, intention.id);
    const after = urgency(being, currentIntentions(being)[0]!);

    expect(after).toBeCloseTo(before * 0.8, 6);
  });

  it("orders current intentions most urgent first", () => {
    const being = makeBeing({ connection: 0.1, esteem: 0.7 });
    const urgent = commit(being, surfaceOne(being, "connection", "urgent").id);
    commit(being, surfaceOne(being, "esteem", "mild").id);

    expect(currentIntentions(being).map((i) => i.aim)).toEqual(["urgent", "mild"]);
    expect(urgency(being, urgent)).toBeGreaterThan(0);
  });

  it("is zero when the source drive no longer exists", () => {
    const being = makeBeing();
    const intention = commit(being, surfaceOne(being).id);
    being.drives.drives.delete("connection");

    expect(urgency(being, intention)).toBe(0);
    expect(sourcePressure(being, intention)).toBe(0);
  });
});

describe("serialization", () => {
  it("round-trips the log and reconstructs live intentions", () => {
    const being = makeBeing();
    const intention = commit(being, surfaceOne(being).id);
    recordAction(being, intention.id);
    decline(being, surfaceOne(being, "connection", "declined one").id, "not now");

    const restored = deserializeBeing(JSON.parse(JSON.stringify(serializeBeing(being))));

    expect(restored.history.intentionLog).toEqual(being.history.intentionLog);
    expect(currentIntentions(restored).map((i) => i.aim)).toEqual(["tend the fire"]);
    expect(currentIntentions(restored)[0]!.attempts).toBe(1);
    expect(recentDeclines(restored)).toHaveLength(1);
  });

  it("tolerates a payload written before intentions existed", () => {
    const being = makeBeing();
    const serialized = JSON.parse(JSON.stringify(serializeBeing(being)));
    delete serialized.history.intentionLog;

    const restored = deserializeBeing(serialized);
    expect(restored.history.intentionLog).toEqual([]);
    expect(() => surfaceOne(restored)).not.toThrow();
  });
});
