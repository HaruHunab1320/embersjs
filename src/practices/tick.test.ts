import { describe, expect, it } from "vitest";
import type { Artifact, PracticeSet, WearState } from "../types.js";
import { createCorePractice } from "./construct.js";
import { CORE_PRACTICES } from "./core.js";
import { tickPractices } from "./tick.js";

const HOUR = 3_600_000;

function makeWear(load: number): WearState {
  return { perDrive: new Map(), chronicLoad: load };
}

function fillSubstrate(set: PracticeSet, practiceId: string, ages: number[]): void {
  const practice = set.practices.get(practiceId)!;
  const artifacts: Artifact[] = ages.map((age, i) => ({
    attemptId: `a-${i}`,
    atMs: -age, // age (older = more negative)
    quality: 1,
    underPressure: false,
    content: null,
  }));
  practice.substrate = { artifacts, capacity: 50 };
}

describe("tickPractices housekeeping", () => {
  it("evicts artifacts older than artifactMaxAgeMs", () => {
    const set: PracticeSet = {
      practices: new Map([
        [
          "gratitudePractice",
          createCorePractice({
            id: "gratitudePractice",
            overrides: {
              protocol: {
                ...CORE_PRACTICES.gratitudePractice!.protocol,
                artifactMaxAgeMs: 24 * HOUR,
              },
            },
          }),
        ],
      ]),
    };

    fillSubstrate(set, "gratitudePractice", [1 * HOUR, 10 * HOUR, 30 * HOUR, 48 * HOUR]);

    tickPractices(set, 0, makeWear(0), 2.0);

    const remaining = set.practices.get("gratitudePractice")!.substrate.artifacts;
    expect(remaining).toHaveLength(2); // 1h and 10h survive; 30h and 48h evicted
  });

  it("wear accelerates eviction", () => {
    const set: PracticeSet = {
      practices: new Map([
        [
          "gratitudePractice",
          createCorePractice({
            id: "gratitudePractice",
            overrides: {
              protocol: {
                ...CORE_PRACTICES.gratitudePractice!.protocol,
                artifactMaxAgeMs: 24 * HOUR,
              },
            },
          }),
        ],
      ]),
    };

    fillSubstrate(set, "gratitudePractice", [6 * HOUR, 10 * HOUR, 18 * HOUR, 22 * HOUR]);

    // Full chronic load with erosionFactor 2.0 => effective cap = 24h / 3 = 8h
    tickPractices(set, 0, makeWear(1.0), 2.0);

    const remaining = set.practices.get("gratitudePractice")!.substrate.artifacts;
    // Only 6h survives (< 8h)
    expect(remaining).toHaveLength(1);
  });
});
