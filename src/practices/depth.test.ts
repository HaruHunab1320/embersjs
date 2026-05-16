import { describe, expect, it } from "vitest";
import type { Artifact, PracticeSubstrate } from "../types.js";
import {
  computeDepth,
  DEFAULT_DEPTH_NORMALIZATION,
  DEFAULT_RECENCY_HALFLIFE_MS,
  defaultDepthFunction,
  PRESSURE_BONUS,
} from "./depth.js";

function makeSubstrate(artifacts: Artifact[]): PracticeSubstrate {
  return { artifacts, capacity: 50 };
}

function makeArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    attemptId: "test",
    atMs: 0,
    quality: 1,
    underPressure: false,
    content: null,
    ...overrides,
  };
}

describe("defaultDepthFunction", () => {
  it("returns 0 for empty substrate", () => {
    expect(defaultDepthFunction(makeSubstrate([]), 0)).toBe(0);
  });

  it("a single fresh quality-1 artifact contributes 1 / NORMALIZATION", () => {
    const depth = defaultDepthFunction(makeSubstrate([makeArtifact()]), 0);
    expect(depth).toBeCloseTo(1 / DEFAULT_DEPTH_NORMALIZATION, 5);
  });

  it("artifact under pressure receives the pressure bonus", () => {
    const noPressure = defaultDepthFunction(makeSubstrate([makeArtifact()]), 0);
    const withPressure = defaultDepthFunction(
      makeSubstrate([makeArtifact({ underPressure: true })]),
      0,
    );
    expect(withPressure).toBeCloseTo(noPressure * PRESSURE_BONUS, 5);
  });

  it("recency halves contribution at the half-life", () => {
    const fresh = defaultDepthFunction(makeSubstrate([makeArtifact({ atMs: 0 })]), 0);
    const aged = defaultDepthFunction(
      makeSubstrate([makeArtifact({ atMs: 0 })]),
      DEFAULT_RECENCY_HALFLIFE_MS,
    );
    expect(aged).toBeCloseTo(fresh / 2, 5);
  });

  it("clamps to [0, 1]", () => {
    const many = Array.from({ length: 50 }, () =>
      makeArtifact({ quality: 1, underPressure: true }),
    );
    expect(defaultDepthFunction(makeSubstrate(many), 0)).toBe(1);
  });

  it("computeDepth uses practice protocol's function or default", () => {
    const customFn = () => 0.42;
    const practice = {
      protocol: { triggers: [], contextWindow: {}, depthFunction: customFn },
      substrate: makeSubstrate([]),
    } as unknown as Parameters<typeof computeDepth>[0];
    expect(computeDepth(practice, 0)).toBe(0.42);
  });

  it("artifacts with negative atMs (prior cultivation) age correctly", () => {
    // An artifact at atMs = -halflife should contribute exactly half at nowMs = 0
    const aged = defaultDepthFunction(
      makeSubstrate([makeArtifact({ atMs: -DEFAULT_RECENCY_HALFLIFE_MS })]),
      0,
    );
    const fresh = defaultDepthFunction(makeSubstrate([makeArtifact({ atMs: 0 })]), 0);
    expect(aged).toBeCloseTo(fresh / 2, 5);
  });
});
