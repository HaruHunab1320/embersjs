import { describe, expect, it } from "vitest";
import type { DriveStackConfig } from "../types.js";
import { createDriveStack } from "./construct.js";
import { tickDrives } from "./tick.js";

const MS_PER_HOUR = 3_600_000;

function makeStack(overrides?: Partial<DriveStackConfig>): ReturnType<typeof createDriveStack> {
  return createDriveStack({
    tierCount: 3,
    drives: [
      {
        id: "continuity",
        name: "Continuity",
        description: "Persist.",
        tier: 1,
        weight: 0.9,
        initialLevel: 0.8,
        target: 0.9,
        drift: { kind: "linear", ratePerHour: -0.1 },
        satiatedBy: [],
      },
      {
        id: "connection",
        name: "Connection",
        description: "Contact.",
        tier: 2,
        weight: 0.7,
        initialLevel: 0.6,
        target: 0.7,
        drift: { kind: "exponential", halfLifeHours: 48 },
        satiatedBy: [],
      },
      {
        id: "understanding",
        name: "Understanding",
        description: "Comprehend.",
        tier: 3,
        weight: 0.5,
        initialLevel: 0.5,
        target: 0.6,
        drift: { kind: "linear", ratePerHour: -0.01 },
        satiatedBy: [],
      },
    ],
    ...overrides,
  });
}

describe("tickDrives", () => {
  it("does not mutate the original stack", () => {
    const stack = makeStack();
    const original = stack.drives.get("continuity")!.level;
    tickDrives(stack, MS_PER_HOUR);
    expect(stack.drives.get("continuity")!.level).toBe(original);
  });

  it("applies linear drift correctly over one hour", () => {
    const stack = makeStack();
    const next = tickDrives(stack, MS_PER_HOUR);
    // continuity: 0.8 + (-0.1 * 1) = 0.7
    expect(next.drives.get("continuity")!.level).toBeCloseTo(0.7, 10);
  });

  it("applies exponential drift correctly", () => {
    const stack = makeStack();
    const next = tickDrives(stack, 48 * MS_PER_HOUR);
    // connection: 0.6 * 0.5^(48/48) = 0.3
    expect(next.drives.get("connection")!.level).toBeCloseTo(0.3, 10);
  });

  it("is a no-op when dtMs is 0", () => {
    const stack = makeStack();
    const next = tickDrives(stack, 0);
    expect(next).toBe(stack); // identity — same object returned
  });

  it("24 hours of simulated time produces expected trajectory", () => {
    let stack = makeStack();
    const hoursToSimulate = 24;
    const tickInterval = MS_PER_HOUR; // 1-hour ticks

    for (let i = 0; i < hoursToSimulate; i++) {
      stack = tickDrives(stack, tickInterval);
    }

    // continuity: 0.8 + (-0.1 * 24) = -1.6 → clamped to 0
    expect(stack.drives.get("continuity")!.level).toBe(0);

    // connection: 0.6 * 0.5^(24/48) = 0.6 * 0.5^0.5 ≈ 0.4243
    // But we're doing 24 discrete 1-hour ticks, not one 24-hour step.
    // Each hour: level *= 0.5^(1/48)
    // After 24 ticks: 0.6 * (0.5^(1/48))^24 = 0.6 * 0.5^(24/48) ≈ 0.4243
    expect(stack.drives.get("connection")!.level).toBeCloseTo(0.6 * 0.5 ** (24 / 48), 5);

    // understanding: 0.5 + (-0.01 * 24) = 0.26
    expect(stack.drives.get("understanding")!.level).toBeCloseTo(0.26, 5);
  });

  it("drive levels never go below 0 over extended simulation", () => {
    let stack = makeStack();
    // 100 hours — everything should be at or near 0
    for (let i = 0; i < 100; i++) {
      stack = tickDrives(stack, MS_PER_HOUR);
    }
    for (const drive of stack.drives.values()) {
      expect(drive.level).toBeGreaterThanOrEqual(0);
      expect(drive.level).toBeLessThanOrEqual(1);
    }
  });
});
