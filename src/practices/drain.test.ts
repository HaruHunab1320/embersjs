import { describe, expect, it } from "vitest";
import { createBeing } from "../being/create.js";
import { integrate, resolveAllPending } from "../being/lifecycle.js";
import type { Being, BeingConfig, PracticeAttempt } from "../types.js";
import { computeDepth } from "./depth.js";

function buildConfig(): BeingConfig {
  return {
    id: "drain",
    name: "Drain",
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
          satiatedBy: [],
        },
      ],
    },
    // Three practices with `acknowledge`/`reflect`/`self-observe` triggers give
    // us several pending attempts from a couple of integrations.
    practices: {
      seeds: [{ id: "gratitudePractice" }, { id: "witnessPractice" }],
    },
    subscriptions: [],
    capabilities: [],
  };
}

/** Queues n pending attempts by integrating trigger-matching actions. */
function queueAttempts(being: Being): number {
  integrate(being, { entry: { kind: "action", type: "acknowledge" } });
  integrate(being, { entry: { kind: "action", type: "self-observe" } });
  return being.pendingAttempts.filter((a) => a.status === "pending").length;
}

describe("resolveAllPending — failure isolation", () => {
  it("resolves the rest when one evaluator call throws", async () => {
    const being = createBeing(buildConfig());
    const queued = queueAttempts(being);
    expect(queued).toBeGreaterThan(1);

    let call = 0;
    const result = await resolveAllPending(being, () => {
      call++;
      if (call === 1) throw new Error("model timeout");
      return { quality: 0.8, accepted: true };
    });

    expect(result.failures).toHaveLength(1);
    expect(result.resolutions).toHaveLength(queued - 1);
    expect((result.failures[0]!.error as Error).message).toBe("model timeout");
  });

  it("leaves a failed attempt pending so a later drain retries it", async () => {
    const being = createBeing(buildConfig());
    queueAttempts(being);

    let fail = true;
    await resolveAllPending(being, () => {
      if (fail) {
        fail = false;
        throw new Error("transient");
      }
      return { quality: 0.8, accepted: true };
    });

    const stillPending = being.pendingAttempts.filter((a) => a.status === "pending");
    expect(stillPending).toHaveLength(1);

    const second = await resolveAllPending(being, () => ({ quality: 0.8, accepted: true }));
    expect(second.resolutions).toHaveLength(1);
    expect(second.failures).toHaveLength(0);
    expect(being.pendingAttempts.filter((a) => a.status === "pending")).toHaveLength(0);
  });

  it("reports which practice each failure belongs to", async () => {
    const being = createBeing(buildConfig());
    queueAttempts(being);

    const result = await resolveAllPending(being, () => {
      throw new Error("down");
    });

    expect(result.resolutions).toHaveLength(0);
    for (const failure of result.failures) {
      expect(being.practices.practices.has(failure.practiceId)).toBe(true);
      expect(failure.attemptId).toBeTruthy();
    }
  });

  it("a rejected verdict is not a failure", async () => {
    const being = createBeing(buildConfig());
    const queued = queueAttempts(being);

    const result = await resolveAllPending(being, () => ({ quality: 0.1, accepted: false }));

    expect(result.failures).toHaveLength(0);
    expect(result.resolutions).toHaveLength(queued);
    expect(result.resolutions.every((r) => !r.accepted)).toBe(true);
    expect(computeDepth(being.practices.practices.get("gratitudePractice")!, being.elapsedMs)).toBe(
      0,
    );
  });

  it("returns empty for a being with nothing pending", async () => {
    const being = createBeing(buildConfig());
    const result = await resolveAllPending(being, () => ({ quality: 1, accepted: true }));
    expect(result.resolutions).toHaveLength(0);
    expect(result.failures).toHaveLength(0);
  });
});

describe("resolveAllPending — concurrency", () => {
  it("evaluates in parallel when concurrency > 1", async () => {
    const being = createBeing(buildConfig());
    const queued = queueAttempts(being);

    let inFlight = 0;
    let peak = 0;
    const result = await resolveAllPending(
      being,
      async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
        return { quality: 0.8, accepted: true };
      },
      { concurrency: queued },
    );

    expect(peak).toBeGreaterThan(1);
    expect(result.resolutions).toHaveLength(queued);
  });

  it("is serial by default", async () => {
    const being = createBeing(buildConfig());
    queueAttempts(being);

    let inFlight = 0;
    let peak = 0;
    await resolveAllPending(being, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return { quality: 0.8, accepted: true };
    });

    expect(peak).toBe(1);
  });

  it("applies substrate in attempt order regardless of evaluation order", async () => {
    const being = createBeing(buildConfig());
    const pendingBefore = being.pendingAttempts.slice();
    expect(pendingBefore).toHaveLength(0);
    queueAttempts(being);

    const order = being.pendingAttempts.filter((a) => a.status === "pending").map((a) => a.id);

    // Resolve out of order by delaying earlier attempts longer.
    const result = await resolveAllPending(
      being,
      async (attempt: PracticeAttempt) => {
        const index = order.indexOf(attempt.id);
        await new Promise((r) => setTimeout(r, (order.length - index) * 5));
        return { quality: 0.8, accepted: true };
      },
      { concurrency: order.length },
    );

    expect(result.resolutions.map((r) => r.attemptId)).toEqual(order);
  });

  it("isolates failures under concurrency too", async () => {
    const being = createBeing(buildConfig());
    const queued = queueAttempts(being);

    const result = await resolveAllPending(
      being,
      async (attempt: PracticeAttempt) => {
        if (attempt.practiceId === "witnessPractice") throw new Error("nope");
        return { quality: 0.8, accepted: true };
      },
      { concurrency: 4 },
    );

    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.resolutions.length).toBe(queued - result.failures.length);
    expect(result.failures.every((f) => f.practiceId === "witnessPractice")).toBe(true);
  });
});
