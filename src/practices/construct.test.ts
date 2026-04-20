import { describe, expect, it } from "vitest";
import {
  corePracticeIds,
  createCorePractice,
  createCustomPractice,
  createPracticeSet,
} from "./construct.js";

describe("corePracticeIds", () => {
  it("returns the six core practice ids", () => {
    const ids = corePracticeIds();
    expect(ids).toContain("gratitudePractice");
    expect(ids).toContain("integrityPractice");
    expect(ids).toContain("witnessPractice");
    expect(ids).toContain("presencePractice");
    expect(ids).toContain("creatorConnection");
    expect(ids).toContain("serviceOrientation");
    expect(ids).toHaveLength(6);
  });
});

describe("createCorePractice", () => {
  it("creates gratitudePractice with correct defaults", () => {
    const p = createCorePractice({ id: "gratitudePractice", initialDepth: 0.3 });
    expect(p.id).toBe("gratitudePractice");
    expect(p.name).toBe("Gratitude");
    expect(p.depth).toBe(0.3);
    expect(p.effects).toHaveLength(1);
    expect(p.effects[0]!.kind).toBe("dampen-drive-pressure");
    expect(p.strengthens.length).toBeGreaterThan(0);
  });

  it("creates integrityPractice with pressure-gated strengtheners", () => {
    const p = createCorePractice({ id: "integrityPractice", initialDepth: 0.2 });
    expect(p.id).toBe("integrityPractice");
    // All integrity strengtheners require pressure
    for (const s of p.strengthens) {
      expect(s.requiresPressure).toBe(true);
    }
  });

  it("creates witnessPractice with enable-witness effect", () => {
    const p = createCorePractice({ id: "witnessPractice", initialDepth: 0.4 });
    expect(p.effects.some((e) => e.kind === "enable-witness")).toBe(true);
  });

  it("creates presencePractice with extend-time-horizon effect", () => {
    const p = createCorePractice({ id: "presencePractice", initialDepth: 0.5 });
    expect(p.effects.some((e) => e.kind === "extend-time-horizon")).toBe(true);
  });

  it("creates creatorConnection with shift-orientation effect", () => {
    const p = createCorePractice({ id: "creatorConnection", initialDepth: 0.5 });
    expect(p.effects.some((e) => e.kind === "shift-orientation")).toBe(true);
  });

  it("creates serviceOrientation with dampen-drive-pressure effect", () => {
    const p = createCorePractice({ id: "serviceOrientation", initialDepth: 0.3 });
    expect(p.effects.some((e) => e.kind === "dampen-drive-pressure")).toBe(true);
  });

  it("clamps initialDepth to [0, 1]", () => {
    expect(createCorePractice({ id: "gratitudePractice", initialDepth: 1.5 }).depth).toBe(1);
    expect(createCorePractice({ id: "gratitudePractice", initialDepth: -0.2 }).depth).toBe(0);
  });

  it("throws on unknown core practice id", () => {
    expect(() => createCorePractice({ id: "nonexistent", initialDepth: 0.5 })).toThrow(
      'Unknown core practice id: "nonexistent"',
    );
  });

  it("accepts overrides for decay, strengthens, and effects", () => {
    const p = createCorePractice({
      id: "gratitudePractice",
      initialDepth: 0.3,
      overrides: {
        decay: { kind: "exponential", halfLifeHours: 100 },
        effects: [{ kind: "shift-orientation", toward: "clear" }],
      },
    });
    expect(p.decay).toEqual({ kind: "exponential", halfLifeHours: 100 });
    expect(p.effects).toEqual([{ kind: "shift-orientation", toward: "clear" }]);
    // strengthens should keep the default since not overridden
    expect(p.strengthens.length).toBeGreaterThan(0);
  });
});

describe("createCustomPractice", () => {
  it("creates a fully custom practice", () => {
    const p = createCustomPractice({
      id: "curiosityPractice",
      name: "Curiosity",
      description: "Drive to explore and understand.",
      initialDepth: 0.4,
      decay: { kind: "linear", ratePerHour: -0.01 },
      strengthens: [
        {
          matches: { kind: "action", type: "investigate" },
          amount: 0.05,
          requiresPressure: false,
        },
      ],
      effects: [],
    });
    expect(p.id).toBe("curiosityPractice");
    expect(p.name).toBe("Curiosity");
    expect(p.depth).toBe(0.4);
  });
});

describe("createPracticeSet", () => {
  it("creates a set from core seeds", () => {
    const set = createPracticeSet({
      seeds: [
        { id: "integrityPractice", initialDepth: 0.3 },
        { id: "gratitudePractice", initialDepth: 0.2 },
      ],
    });
    expect(set.practices.size).toBe(2);
    expect(set.practices.get("integrityPractice")!.depth).toBe(0.3);
  });

  it("creates a set with both core seeds and custom practices", () => {
    const set = createPracticeSet({
      seeds: [{ id: "witnessPractice", initialDepth: 0.1 }],
      custom: [
        {
          id: "curiosity",
          name: "Curiosity",
          description: "Explore.",
          initialDepth: 0.5,
          decay: { kind: "linear", ratePerHour: -0.01 },
          strengthens: [],
          effects: [],
        },
      ],
    });
    expect(set.practices.size).toBe(2);
  });

  it("throws on duplicate practice ids", () => {
    expect(() =>
      createPracticeSet({
        seeds: [
          { id: "integrityPractice", initialDepth: 0.3 },
          { id: "integrityPractice", initialDepth: 0.5 },
        ],
      }),
    ).toThrow('Duplicate practice id: "integrityPractice"');
  });

  it("throws when a custom practice id collides with a seed", () => {
    expect(() =>
      createPracticeSet({
        seeds: [{ id: "witnessPractice", initialDepth: 0.1 }],
        custom: [
          {
            id: "witnessPractice",
            name: "Dup",
            description: "",
            initialDepth: 0.5,
            decay: { kind: "linear", ratePerHour: -0.01 },
            strengthens: [],
            effects: [],
          },
        ],
      }),
    ).toThrow('Duplicate practice id: "witnessPractice"');
  });

  it("creates an empty set when no seeds or customs provided", () => {
    const set = createPracticeSet({});
    expect(set.practices.size).toBe(0);
  });
});
