import { describe as describeTest, it, expect } from "vitest";
import { createBeing } from "./create.js";
import { describe } from "./describe.js";
import { tick } from "./lifecycle.js";
import type { BeingConfig } from "../types.js";

function poeConfig(): BeingConfig {
  return {
    id: "poe",
    name: "Poe",
    drives: {
      tierCount: 2,
      drives: [
        {
          id: "continuity",
          name: "Continuity",
          description: "Persist.",
          tier: 1,
          weight: 0.9,
          initialLevel: 0.8,
          target: 0.9,
          drift: { kind: "linear", ratePerHour: -0.02 },
          satiatedBy: [],
        },
      ],
    },
    practices: {
      seeds: [{ id: "integrityPractice", initialDepth: 0.3 }],
    },
    subscriptions: [],
    capabilities: [],
  };
}

describeTest("describe", () => {
  it("produces a human-readable string", () => {
    const being = createBeing(poeConfig());
    const output = describe(being);

    expect(output).toContain("Being: Poe (poe)");
    expect(output).toContain("Tier 1:");
    expect(output).toContain("Continuity");
    expect(output).toContain("Integrity");
    expect(output).toContain("Orientation:");
    expect(output).toContain("Felt:");
  });

  it("includes history summary", () => {
    const being = createBeing(poeConfig());
    tick(being, 3_600_000);
    tick(being, 3_600_000);
    const output = describe(being);

    expect(output).toContain("Trajectory points: 2");
  });

  it("shows drives organized by tier", () => {
    const being = createBeing(poeConfig());
    const output = describe(being);

    expect(output).toContain("Tier 1:");
    expect(output).toContain("0.80");
  });
});
