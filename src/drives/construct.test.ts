import { describe, expect, it } from "vitest";
import type { DriveConfig, DriveStackConfig } from "../types.js";
import { createDrive, createDriveStack } from "./construct.js";

describe("createDrive", () => {
  const config: DriveConfig = {
    id: "test",
    name: "Test",
    description: "A test drive.",
    tier: 1,
    weight: 0.8,
    initialLevel: 0.6,
    target: 0.7,
    drift: { kind: "linear", ratePerHour: -0.1 },
    satiatedBy: [],
  };

  it("creates a drive with correct properties", () => {
    const drive = createDrive(config);
    expect(drive.id).toBe("test");
    expect(drive.name).toBe("Test");
    expect(drive.level).toBe(0.6);
    expect(drive.target).toBe(0.7);
    expect(drive.tier).toBe(1);
    expect(drive.weight).toBe(0.8);
  });

  it("clamps initialLevel to [0, 1]", () => {
    expect(createDrive({ ...config, initialLevel: 1.5 }).level).toBe(1);
    expect(createDrive({ ...config, initialLevel: -0.3 }).level).toBe(0);
  });

  it("clamps target to [0, 1]", () => {
    expect(createDrive({ ...config, target: 2 }).target).toBe(1);
    expect(createDrive({ ...config, target: -1 }).target).toBe(0);
  });
});

describe("createDriveStack", () => {
  const stackConfig: DriveStackConfig = {
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
        drift: { kind: "linear", ratePerHour: -0.02 },
        satiatedBy: [],
      },
      {
        id: "connection",
        name: "Connection",
        description: "Contact.",
        tier: 2,
        weight: 0.7,
        initialLevel: 0.5,
        target: 0.6,
        drift: { kind: "linear", ratePerHour: -0.05 },
        satiatedBy: [],
      },
    ],
  };

  it("creates a stack with the correct number of drives", () => {
    const stack = createDriveStack(stackConfig);
    expect(stack.drives.size).toBe(2);
    expect(stack.tierCount).toBe(3);
  });

  it("applies default domination rules", () => {
    const stack = createDriveStack(stackConfig);
    expect(stack.dominationRules.threshold).toBe(0.3);
    expect(stack.dominationRules.dampening).toBe(0.7);
  });

  it("accepts partial domination rule overrides", () => {
    const stack = createDriveStack({
      ...stackConfig,
      dominationRules: { threshold: 0.4 },
    });
    expect(stack.dominationRules.threshold).toBe(0.4);
    expect(stack.dominationRules.dampening).toBe(0.7);
  });

  it("throws on duplicate drive ids", () => {
    expect(() =>
      createDriveStack({
        tierCount: 2,
        drives: [
          {
            id: "same",
            name: "A",
            description: "",
            tier: 1,
            weight: 0.5,
            initialLevel: 0.5,
            target: 0.5,
            drift: { kind: "linear", ratePerHour: -0.1 },
            satiatedBy: [],
          },
          {
            id: "same",
            name: "B",
            description: "",
            tier: 1,
            weight: 0.5,
            initialLevel: 0.5,
            target: 0.5,
            drift: { kind: "linear", ratePerHour: -0.1 },
            satiatedBy: [],
          },
        ],
      }),
    ).toThrow('Duplicate drive id: "same"');
  });

  it("throws when a drive's tier exceeds tierCount", () => {
    expect(() =>
      createDriveStack({
        tierCount: 2,
        drives: [
          {
            id: "high",
            name: "High",
            description: "",
            tier: 3,
            weight: 0.5,
            initialLevel: 0.5,
            target: 0.5,
            drift: { kind: "linear", ratePerHour: -0.1 },
            satiatedBy: [],
          },
        ],
      }),
    ).toThrow('Drive "high" has tier 3, but tierCount is 2');
  });

  it("throws when a drive's tier is less than 1", () => {
    expect(() =>
      createDriveStack({
        tierCount: 2,
        drives: [
          {
            id: "low",
            name: "Low",
            description: "",
            tier: 0,
            weight: 0.5,
            initialLevel: 0.5,
            target: 0.5,
            drift: { kind: "linear", ratePerHour: -0.1 },
            satiatedBy: [],
          },
        ],
      }),
    ).toThrow('Drive "low" has tier 0, but tierCount is 2');
  });
});
