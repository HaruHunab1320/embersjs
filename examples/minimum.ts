/**
 * Minimum: the smallest possible Embers Being.
 *
 * One drive. One practice. Demonstrates the v0.2 lifecycle:
 *
 *   tick → drives drift, wear updates
 *   integrate → drive may satiate; practice attempts get recorded as pending
 *   resolveAllPending → framework supplies quality verdicts; substrate grows
 *   metabolize → returns the structured InnerSituation
 *
 * Run with: npx tsx examples/minimum.ts
 */

import {
  createBeing,
  integrate,
  metabolize,
  type PracticeAttempt,
  type PracticeAttemptResult,
  resolveAllPending,
  tick,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// Construct a tiny being
// ---------------------------------------------------------------------------

const being = createBeing({
  id: "min",
  name: "Minimal",
  drives: {
    tierCount: 1,
    drives: [
      {
        id: "presence",
        name: "Presence",
        description: "The need to be engaged with the world.",
        tier: 1,
        weight: 1,
        initialLevel: 0.7,
        target: 0.6,
        drift: { kind: "linear", ratePerHour: -0.05 },
        satiatedBy: [{ matches: { kind: "event", type: "interaction" }, amount: 0.2 }],
      },
    ],
  },
  practices: {
    seeds: [{ id: "gratitudePractice" }],
  },
  subscriptions: [],
  capabilities: [],
});

// ---------------------------------------------------------------------------
// A synthetic evaluator (stand-in for an LLM call or rule check).
// Real consumers wire this to whatever cognitive tooling they have.
// ---------------------------------------------------------------------------

function evaluator(attempt: PracticeAttempt): PracticeAttemptResult {
  // Slightly higher quality under pressure (cultivation under pressure is real).
  const baseline = 0.5;
  const pressureBonus = attempt.underPressure ? 0.2 : 0;
  const quality = Math.min(1, baseline + pressureBonus);
  return {
    quality,
    accepted: true,
    content: { trigger: attempt.context.triggerIntent, atMs: attempt.attemptedAtMs },
    reasons: ["synthetic acceptance for example"],
  };
}

// ---------------------------------------------------------------------------
// Run a few hours
// ---------------------------------------------------------------------------

const HOUR = 3_600_000;

for (let h = 0; h < 4; h++) {
  tick(being, HOUR);

  // Every other hour, an interaction (satiates presence)
  if (h % 2 === 0) {
    integrate(being, { entry: { kind: "event", type: "interaction" } });
  }

  // The being acknowledges something present (gratitude attempt)
  integrate(being, { entry: { kind: "action", type: "acknowledge" } });

  // Resolve all attempts created so far
  await resolveAllPending(being, evaluator);
}

// ---------------------------------------------------------------------------
// Inspect the inner situation
// ---------------------------------------------------------------------------

const situation = metabolize(being, { feltMode: "prose" });

console.log(`After ${(being.elapsedMs / HOUR).toFixed(1)}h of simulation:`);
console.log(`  Orientation: ${situation.orientation}`);
console.log(`  Wear: ${situation.wear.toFixed(2)}`);
console.log(`  Felt: ${situation.felt}`);
console.log("");
console.log("Drives:");
for (const d of situation.drives) {
  console.log(`  ${d.name}: level=${d.level.toFixed(2)}, pressure=${d.pressure.toFixed(2)}`);
}
console.log("");
console.log("Practices:");
for (const p of situation.practices) {
  console.log(`  ${p.name}: depth=${p.depth.toFixed(2)}, ${p.recentSubstrate.length} artifacts`);
}
