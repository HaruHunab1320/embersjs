import { describe, expect, it } from "vitest";
import { createDriveStack } from "../drives/construct.js";
import { DEFAULT_WEAR_CONFIG } from "./config.js";
import { createInitialWear } from "./construct.js";
import { tickWear } from "./tick.js";

const HOUR = 3_600_000;

function makeStack(initialLevel: number) {
  return createDriveStack({
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
  });
}

describe("tickWear", () => {
  it("zero chronicLoad for satisfied drives", () => {
    const stack = makeStack(0.7);
    let wear = createInitialWear(stack);
    wear = tickWear(wear, stack, HOUR, DEFAULT_WEAR_CONFIG);
    expect(wear.chronicLoad).toBe(0);
  });

  it("accumulates sustainedBelowMs when below criticalThreshold", () => {
    const stack = makeStack(0.1); // below critical (0.2)
    let wear = createInitialWear(stack);
    wear = tickWear(wear, stack, HOUR, DEFAULT_WEAR_CONFIG);
    expect(wear.perDrive.get("safety")!.sustainedBelowMs).toBe(HOUR);
  });

  it("chronicLoad rises with sustained deprivation", () => {
    const stack = makeStack(0.1);
    let wear = createInitialWear(stack);
    for (let i = 0; i < 24; i++) {
      wear = tickWear(wear, stack, HOUR, DEFAULT_WEAR_CONFIG);
    }
    // At tier-1 saturation (24h), full contribution
    expect(wear.chronicLoad).toBeCloseTo(1, 1);
  });

  it("hysteresis: holds steady between thresholds", () => {
    const stack = makeStack(0.3); // between critical (0.2) and recovery (0.4)
    let wear = createInitialWear(stack);
    wear = tickWear(wear, stack, HOUR, DEFAULT_WEAR_CONFIG);
    expect(wear.perDrive.get("safety")!.sustainedBelowMs).toBe(0);
    expect(wear.perDrive.get("safety")!.sustainedAboveMs).toBe(0);
  });

  it("recovery: sustainedAboveMs accumulates above recoveryThreshold", () => {
    const stackLow = makeStack(0.1);
    let wear = createInitialWear(stackLow);
    for (let i = 0; i < 4; i++) {
      wear = tickWear(wear, stackLow, HOUR, DEFAULT_WEAR_CONFIG);
    }
    expect(wear.perDrive.get("safety")!.sustainedBelowMs).toBe(4 * HOUR);

    // Drive recovers
    const stackHigh = makeStack(0.7);
    wear = tickWear(wear, stackHigh, HOUR, DEFAULT_WEAR_CONFIG);
    expect(wear.perDrive.get("safety")!.sustainedAboveMs).toBe(HOUR);
    // Below not yet cleared (recovery not complete)
    expect(wear.perDrive.get("safety")!.sustainedBelowMs).toBe(4 * HOUR);
  });

  it("full recovery (12h above) clears sustainedBelowMs", () => {
    const stackLow = makeStack(0.1);
    let wear = createInitialWear(stackLow);
    for (let i = 0; i < 24; i++) {
      wear = tickWear(wear, stackLow, HOUR, DEFAULT_WEAR_CONFIG);
    }
    const stackHigh = makeStack(0.7);
    for (let i = 0; i < 12; i++) {
      wear = tickWear(wear, stackHigh, HOUR, DEFAULT_WEAR_CONFIG);
    }
    expect(wear.perDrive.get("safety")!.sustainedBelowMs).toBe(0);
    expect(wear.chronicLoad).toBe(0);
  });

  it("recovery interrupted resets sustainedAboveMs but not sustainedBelowMs", () => {
    const stackLow = makeStack(0.1);
    let wear = createInitialWear(stackLow);
    // 24h below
    for (let i = 0; i < 24; i++) wear = tickWear(wear, stackLow, HOUR, DEFAULT_WEAR_CONFIG);
    // 6h recovery
    const stackHigh = makeStack(0.7);
    for (let i = 0; i < 6; i++) wear = tickWear(wear, stackHigh, HOUR, DEFAULT_WEAR_CONFIG);
    // Drop again
    for (let i = 0; i < 1; i++) wear = tickWear(wear, stackLow, HOUR, DEFAULT_WEAR_CONFIG);

    expect(wear.perDrive.get("safety")!.sustainedAboveMs).toBe(0);
    expect(wear.perDrive.get("safety")!.sustainedBelowMs).toBeGreaterThan(24 * HOUR);
  });

  it("higher tiers contribute less to chronicLoad", () => {
    const tier2Stack = createDriveStack({
      tierCount: 2,
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
        {
          id: "belonging",
          name: "Belonging",
          description: "t",
          tier: 2,
          weight: 1,
          initialLevel: 0.1,
          target: 0.7,
          drift: { kind: "linear", ratePerHour: 0 },
          satiatedBy: [],
        },
      ],
    });

    let wear = createInitialWear(tier2Stack);
    for (let i = 0; i < 24; i++) {
      wear = tickWear(wear, tier2Stack, HOUR, DEFAULT_WEAR_CONFIG);
    }
    // Tier-2 with safety satisfied: chronicLoad should be < 1 because tier-2 saturates slower
    expect(wear.chronicLoad).toBeLessThan(0.7);
  });
});
