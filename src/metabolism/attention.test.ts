import { describe, expect, it } from "vitest";
import { createBeing } from "../being/create.js";
import type { BeingConfig } from "../types.js";
import { weightAttention } from "./attention.js";

function buildBeing(): BeingConfig {
  return {
    id: "x",
    name: "x",
    drives: {
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
          id: "connection",
          name: "Connection",
          description: "t",
          tier: 2,
          weight: 1,
          initialLevel: 0.2,
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

describe("weightAttention", () => {
  it("returns empty for empty candidates", () => {
    const being = createBeing(buildBeing());
    expect(weightAttention(being, [])).toEqual([]);
  });

  it("boosts candidates whose tags match pressing drives", () => {
    const being = createBeing(buildBeing());
    const result = weightAttention(being, [
      { id: "1", kind: "x", tags: ["connection"] },
      { id: "2", kind: "x", tags: ["unrelated"] },
    ]);
    expect(result[0]!.candidate.id).toBe("1");
    expect(result[0]!.weight).toBeGreaterThanOrEqual(result[1]!.weight);
  });

  it("tier domination dampens attention to higher tiers (not pressure)", () => {
    const config = buildBeing();
    config.drives.drives = [
      {
        id: "safety",
        name: "Safety",
        description: "t",
        tier: 1,
        weight: 1,
        initialLevel: 0.1, // below domination threshold (0.3)
        target: 0.7,
        drift: { kind: "linear", ratePerHour: 0 },
        satiatedBy: [],
      },
      {
        id: "transcendence",
        name: "Transcendence",
        description: "t",
        tier: 2,
        weight: 1,
        initialLevel: 0.1,
        target: 0.7,
        drift: { kind: "linear", ratePerHour: 0 },
        satiatedBy: [],
      },
    ];
    const being = createBeing(config);

    const result = weightAttention(being, [
      { id: "safety-thing", kind: "x", tags: ["safety"] },
      { id: "transcendence-thing", kind: "x", tags: ["transcendence"] },
    ]);
    const byId = Object.fromEntries(result.map((r) => [r.candidate.id, r.weight]));
    expect(byId["safety-thing"]).toBeGreaterThan(byId["transcendence-thing"]!);
  });
});
