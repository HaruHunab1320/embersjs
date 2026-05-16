import { describe, expect, it } from "vitest";
import { createBeing } from "../being/create.js";
import { expirePendingAttempts, integrate, tick } from "../being/lifecycle.js";
import type { BeingConfig } from "../types.js";

const HOUR = 3_600_000;

function buildBeing(): BeingConfig {
  return {
    id: "x",
    name: "x",
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

describe("expirePendingAttempts", () => {
  it("removes attempts older than the cutoff", () => {
    const being = createBeing(buildBeing());

    integrate(being, { entry: { kind: "action", type: "acknowledge" } });
    tick(being, 6 * HOUR);
    integrate(being, { entry: { kind: "action", type: "acknowledge" } });
    tick(being, 1 * HOUR);

    // Two pending attempts: one at t=0, one at t=6h. Now at t=7h.
    expect(being.pendingAttempts).toHaveLength(2);

    // Expire anything older than 4h (the older attempt is 7h old)
    const removed = expirePendingAttempts(being, 4 * HOUR);
    expect(removed).toBe(1);
    expect(being.pendingAttempts).toHaveLength(1);
    // The remaining attempt is the more recent one (1h old)
    expect(being.elapsedMs - being.pendingAttempts[0]!.attemptedAtMs).toBe(HOUR);
  });

  it("returns 0 when nothing is old enough", () => {
    const being = createBeing(buildBeing());
    integrate(being, { entry: { kind: "action", type: "acknowledge" } });
    tick(being, HOUR);
    expect(expirePendingAttempts(being, 24 * HOUR)).toBe(0);
    expect(being.pendingAttempts).toHaveLength(1);
  });

  it("is a no-op when there are no attempts", () => {
    const being = createBeing(buildBeing());
    expect(expirePendingAttempts(being, HOUR)).toBe(0);
  });
});
