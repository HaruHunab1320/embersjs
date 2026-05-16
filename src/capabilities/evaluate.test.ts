import { describe, expect, it } from "vitest";
import { createBeing } from "../being/create.js";
import type { AccessCondition, BeingConfig } from "../types.js";
import { evaluateCondition } from "./evaluate.js";

function makeBeing(overrides: Partial<BeingConfig> = {}) {
  const config: BeingConfig = {
    id: "test",
    name: "Test",
    drives: {
      tierCount: 1,
      drives: [
        {
          id: "safety",
          name: "Safety",
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
    ...overrides,
  };
  return createBeing(config);
}

describe("evaluateCondition", () => {
  it("always", () => {
    expect(evaluateCondition(makeBeing(), { kind: "always" })).toBe(true);
  });

  it("never", () => {
    expect(evaluateCondition(makeBeing(), { kind: "never" })).toBe(false);
  });

  it("tier-satisfied", () => {
    const being = makeBeing();
    expect(evaluateCondition(being, { kind: "tier-satisfied", tier: 1, threshold: 0.5 })).toBe(
      true,
    );
    expect(evaluateCondition(being, { kind: "tier-satisfied", tier: 1, threshold: 0.9 })).toBe(
      false,
    );
  });

  it("drive-satisfied returns false for unknown drive", () => {
    const being = makeBeing();
    expect(
      evaluateCondition(being, {
        kind: "drive-satisfied",
        driveId: "no-such",
        threshold: 0.5,
      }),
    ).toBe(false);
  });

  it("practice-depth uses derived depth", () => {
    const being = makeBeing();
    // Fresh practice has 0 depth (no substrate)
    expect(
      evaluateCondition(being, {
        kind: "practice-depth",
        practiceId: "gratitudePractice",
        threshold: 0.1,
      }),
    ).toBe(false);
  });

  it("wear-below: passes when chronicLoad below threshold", () => {
    const being = makeBeing();
    expect(evaluateCondition(being, { kind: "wear-below", threshold: 0.5 })).toBe(true);
    being.wear = { ...being.wear, chronicLoad: 0.6 };
    expect(evaluateCondition(being, { kind: "wear-below", threshold: 0.5 })).toBe(false);
  });

  it("any composite", () => {
    const being = makeBeing();
    const cond: AccessCondition = {
      kind: "any",
      conditions: [{ kind: "never" }, { kind: "tier-satisfied", tier: 1, threshold: 0.5 }],
    };
    expect(evaluateCondition(being, cond)).toBe(true);
  });

  it("all composite", () => {
    const being = makeBeing();
    const cond: AccessCondition = {
      kind: "all",
      conditions: [{ kind: "always" }, { kind: "wear-below", threshold: 0.1 }],
    };
    expect(evaluateCondition(being, cond)).toBe(true);
  });
});
