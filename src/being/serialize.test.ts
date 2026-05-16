import { describe, expect, it } from "vitest";
import type { BeingConfig } from "../types.js";
import { createBeing } from "./create.js";
import { integrate, resolveAllPending, tick } from "./lifecycle.js";
import { deserializeBeing, serializeBeing } from "./serialize.js";

const HOUR = 3_600_000;

function buildConfig(): BeingConfig {
  return {
    id: "ser",
    name: "Ser",
    drives: {
      tierCount: 1,
      drives: [
        {
          id: "presence",
          name: "Presence",
          description: "t",
          tier: 1,
          weight: 1,
          initialLevel: 0.5,
          target: 0.6,
          drift: { kind: "linear", ratePerHour: -0.05 },
          satiatedBy: [{ matches: { kind: "event", type: "ping" }, amount: 0.1 }],
        },
      ],
    },
    practices: { seeds: [{ id: "gratitudePractice" }] },
    subscriptions: [],
    capabilities: [],
  };
}

describe("serialize / deserialize", () => {
  it("roundtrips an empty being", () => {
    const being = createBeing(buildConfig());
    const round = deserializeBeing(JSON.parse(JSON.stringify(serializeBeing(being))));
    expect(round.id).toBe(being.id);
    expect(round.elapsedMs).toBe(being.elapsedMs);
    expect(round.drives.drives.size).toBe(being.drives.drives.size);
  });

  it("preserves drive levels, practices, wear, history", async () => {
    const being = createBeing(buildConfig());

    // Simulate some activity
    for (let i = 0; i < 5; i++) {
      tick(being, HOUR);
      integrate(being, { entry: { kind: "action", type: "acknowledge" } });
      await resolveAllPending(being, () => ({ quality: 0.7, accepted: true }));
    }

    const data = JSON.parse(JSON.stringify(serializeBeing(being)));
    const round = deserializeBeing(data);

    expect(round.elapsedMs).toBe(being.elapsedMs);
    expect(round.drives.drives.get("presence")!.level).toBeCloseTo(
      being.drives.drives.get("presence")!.level,
    );

    const origSubstrate = being.practices.practices.get("gratitudePractice")!.substrate.artifacts;
    const roundSubstrate = round.practices.practices.get("gratitudePractice")!.substrate.artifacts;
    expect(roundSubstrate.length).toBe(origSubstrate.length);

    expect(round.wear.chronicLoad).toBe(being.wear.chronicLoad);
    expect(round.history.recentEntries.length).toBe(being.history.recentEntries.length);
  });

  it("preserves pendingAttempts", () => {
    const being = createBeing(buildConfig());
    integrate(being, { entry: { kind: "action", type: "acknowledge" } });
    const data = JSON.parse(JSON.stringify(serializeBeing(being)));
    const round = deserializeBeing(data);
    expect(round.pendingAttempts.length).toBe(being.pendingAttempts.length);
  });
});
