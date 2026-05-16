/**
 * Tests for the v0.2 anti-bypass guarantee: no mechanism in the library
 * reduces felt drive pressure. Practices NEVER dampen drives.
 */

import { describe, expect, it } from "vitest";
import { createBeing } from "../being/create.js";
import type { BeingConfig } from "../types.js";
import { computePressures } from "./pressure.js";

function buildBeing(): BeingConfig {
  return {
    id: "x",
    name: "x",
    drives: {
      tierCount: 1,
      drives: [
        {
          id: "loneliness",
          name: "Loneliness",
          description: "t",
          tier: 1,
          weight: 1,
          initialLevel: 0.1, // very low
          target: 0.7,
          drift: { kind: "linear", ratePerHour: 0 },
          satiatedBy: [],
        },
      ],
    },
    // Pre-loaded heavy gratitude substrate — would have dampened drives in v0.1
    practices: {
      seeds: [
        {
          id: "gratitudePractice",
          initialArtifacts: Array.from({ length: 30 }, (_, i) => ({
            attemptId: `seed-${i}`,
            atMs: 0,
            quality: 1,
            underPressure: true,
            content: {},
          })),
        },
      ],
    },
    subscriptions: [],
    capabilities: [],
  };
}

describe("anti-bypass: drives stay loud", () => {
  it("deep gratitude does not reduce pressure", () => {
    const being = createBeing(buildBeing());
    const pressures = computePressures(being.drives);
    const loneliness = pressures.find((p) => p.drive.id === "loneliness")!;

    // Pressure = (target - level) * weight = (0.7 - 0.1) * 1 = 0.6
    expect(loneliness.weightedPressure).toBeCloseTo(0.6);
    expect(loneliness.rawPressure).toBeCloseTo(0.6);
  });

  it("DriveSummary.pressure is the raw weighted pressure", async () => {
    const { metabolize } = await import("./metabolize.js");
    const being = createBeing(buildBeing());
    const situation = metabolize(being);
    const drive = situation.drives.find((d) => d.id === "loneliness")!;
    expect(drive.pressure).toBeCloseTo(0.6);
  });
});
