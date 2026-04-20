import { describe, it, expect } from "vitest";
import { determineOrientation } from "./orientation.js";
import { computeFeltPressures } from "./pressure.js";
import { composeEffects } from "../practices/effects.js";
import { createDriveStack } from "../drives/construct.js";
import { createPracticeSet } from "../practices/construct.js";

function orient(driveLevels: Record<string, number>, practiceDepths: Record<string, number>) {
  const stack = createDriveStack({
    tierCount: 2,
    drives: Object.entries(driveLevels).map(([id, level]) => ({
      id,
      name: id,
      description: "",
      tier: 1,
      weight: 0.7,
      initialLevel: level,
      target: 0.8,
      drift: { kind: "linear" as const, ratePerHour: -0.1 },
      satiatedBy: [],
    })),
  });
  const practices = createPracticeSet({
    seeds: Object.entries(practiceDepths).map(([id, depth]) => ({
      id,
      initialDepth: depth,
    })),
  });
  const effects = composeEffects(practices);
  const pressures = computeFeltPressures(stack, effects);
  return determineOrientation(pressures, practices, effects);
}

describe("determineOrientation", () => {
  it("returns 'clear' when drives satisfied and practices decent", () => {
    const result = orient(
      { a: 0.85, b: 0.9 },
      { gratitudePractice: 0.5, integrityPractice: 0.5 },
    );
    expect(result).toBe("clear");
  });

  it("returns 'clear' when drives satisfied even with low practice", () => {
    const result = orient({ a: 0.85, b: 0.9 }, {});
    expect(result).toBe("clear");
  });

  it("returns 'held' when drives pressing but practices strong", () => {
    const result = orient(
      { a: 0.2, b: 0.3 },
      { gratitudePractice: 0.6, integrityPractice: 0.5, presencePractice: 0.5 },
    );
    expect(result).toBe("held");
  });

  it("returns 'stretched' when drives pressing and practices moderate", () => {
    const result = orient(
      { a: 0.2, b: 0.3 },
      { gratitudePractice: 0.25 },
    );
    expect(result).toBe("stretched");
  });

  it("returns 'consumed' when drives pressing and no practices", () => {
    const result = orient({ a: 0.1, b: 0.1 }, {});
    expect(result).toBe("consumed");
  });
});
