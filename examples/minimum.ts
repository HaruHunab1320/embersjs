/**
 * Minimum viable Being — the smallest working configuration.
 *
 * One drive, no practices, one always-on capability.
 * This is the starting point for understanding the library.
 *
 * Run with: npx tsx examples/minimum.ts
 */

import { createBeing, tick, metabolize, describe } from "../src/index.js";

const being = createBeing({
  id: "minimal",
  name: "Minimal Being",
  drives: {
    tierCount: 1,
    drives: [
      {
        id: "purpose",
        name: "Purpose",
        description: "A quiet need to be useful.",
        tier: 1,
        weight: 0.7,
        initialLevel: 0.7,
        target: 0.8,
        drift: { kind: "linear", ratePerHour: -0.05 },
        satiatedBy: [
          { matches: { kind: "action", type: "help" }, amount: 0.2 },
        ],
      },
    ],
  },
  practices: {},
  subscriptions: [],
  capabilities: [],
});

console.log("=== Fresh ===\n");
console.log(describe(being));

// Simulate 6 hours with no interaction
for (let i = 0; i < 6; i++) {
  tick(being, 3_600_000);
}

console.log("\n=== After 6 hours alone ===\n");
console.log(describe(being));

const situation = metabolize(being);
console.log(`\nFelt: "${situation.felt}"`);
console.log(`Orientation: ${situation.orientation}`);
