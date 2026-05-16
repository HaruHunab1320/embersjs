import { describe, expect, it } from "vitest";
import { createBeing } from "../being/create.js";
import { tick } from "../being/lifecycle.js";
import type { BeingConfig } from "../types.js";
import { metabolize } from "./metabolize.js";

const HOUR = 3_600_000;

function buildBeing(initialLevel: number): BeingConfig {
  return {
    id: "x",
    name: "x",
    drives: {
      tierCount: 1,
      drives: [
        {
          id: "safety",
          name: "Safety",
          description: "t",
          tier: 1,
          weight: 1,
          initialLevel,
          target: 0.7,
          drift: { kind: "linear", ratePerHour: 0 },
          satiatedBy: [],
        },
      ],
    },
    practices: { seeds: [] },
    subscriptions: [],
    capabilities: [],
  };
}

describe("orientation", () => {
  it("clear when drives are satisfied", () => {
    const being = createBeing(buildBeing(0.8));
    expect(metabolize(being).orientation).toBe("clear");
  });

  it("consumed when drives are unmet and no practice", () => {
    const being = createBeing(buildBeing(0.05));
    expect(metabolize(being).orientation).toBe("consumed");
  });

  it("wear above collapse threshold forces orientation to consumed", () => {
    // Even with high practice, sustained deprivation should override
    const config = buildBeing(0.05);
    config.practices = {
      seeds: [
        {
          id: "presencePractice",
          initialArtifacts: Array.from({ length: 30 }, (_, i) => ({
            attemptId: `p-${i}`,
            atMs: 0,
            quality: 1,
            underPressure: true,
            content: {},
          })),
        },
      ],
    };
    const being = createBeing(config);

    // Tick enough hours to push wear above 0.6
    for (let i = 0; i < 30; i++) tick(being, HOUR);

    const situation = metabolize(being);
    expect(being.wear.chronicLoad).toBeGreaterThanOrEqual(0.6);
    expect(situation.orientation).toBe("consumed");
  });
});
