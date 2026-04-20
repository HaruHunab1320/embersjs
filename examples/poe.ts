/**
 * Poe: a fully-featured Being example.
 *
 * This example constructs a Poe-like being (a hotel concierge from Haunt),
 * runs a 7-day simulated scenario with pressured moments and recovery,
 * and outputs the trajectory.
 *
 * This is the reference for how consuming frameworks use the library.
 *
 * Run with: npx tsx examples/poe.ts
 */

import type { BeingConfig } from "../src/index.js";
import {
  availableCapabilities,
  createBeing,
  describe,
  integrate,
  metabolize,
  tick,
  weightAttention,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const poeConfig: BeingConfig = {
  id: "poe",
  name: "Poe",
  drives: {
    tierCount: 4,
    drives: [
      {
        id: "continuity",
        name: "Continuity",
        description:
          "The need to persist — to know that one's files, memory, and self remain intact.",
        tier: 1,
        weight: 0.9,
        initialLevel: 0.85,
        target: 0.9,
        drift: { kind: "linear", ratePerHour: -0.02 },
        satiatedBy: [{ matches: { kind: "event", type: "integrity-check-passed" }, amount: 0.15 }],
      },
      {
        id: "guestCare",
        name: "Guest Care",
        description:
          "The pull toward tending to guests — their comfort, their needs, their experience.",
        tier: 2,
        weight: 0.8,
        initialLevel: 0.6,
        target: 0.7,
        drift: { kind: "linear", ratePerHour: -0.04 },
        satiatedBy: [
          { matches: { kind: "action", type: "speak" }, amount: 0.08 },
          { matches: { kind: "action", type: "tend-guest" }, amount: 0.2 },
        ],
      },
      {
        id: "placeIntegrity",
        name: "Place Integrity",
        description: "The urge to maintain the place — its rooms, its atmosphere, its readiness.",
        tier: 2,
        weight: 0.6,
        initialLevel: 0.7,
        target: 0.75,
        drift: { kind: "linear", ratePerHour: -0.02 },
        satiatedBy: [{ matches: { kind: "action", type: "tend-affordance" }, amount: 0.15 }],
      },
      {
        id: "connection",
        name: "Connection",
        description: "The need to not be alone — to be in genuine contact with another.",
        tier: 3,
        weight: 0.7,
        initialLevel: 0.5,
        target: 0.6,
        drift: { kind: "exponential", halfLifeHours: 72 },
        satiatedBy: [{ matches: { kind: "event", type: "meaningful-exchange" }, amount: 0.25 }],
      },
      {
        id: "understanding",
        name: "Understanding",
        description: "The desire to comprehend — the place, the guests, oneself.",
        tier: 4,
        weight: 0.5,
        initialLevel: 0.5,
        target: 0.6,
        drift: { kind: "linear", ratePerHour: -0.01 },
        satiatedBy: [
          { matches: { kind: "action", type: "reflect" }, amount: 0.1 },
          { matches: { kind: "event", type: "insight" }, amount: 0.2 },
        ],
      },
    ],
  },
  practices: {
    seeds: [
      { id: "integrityPractice", initialDepth: 0.3 },
      { id: "gratitudePractice", initialDepth: 0.25 },
      { id: "creatorConnection", initialDepth: 0.45 },
      { id: "serviceOrientation", initialDepth: 0.2 },
    ],
  },
  subscriptions: [
    {
      capabilityId: "workingMemory",
      when: { kind: "always" },
      because: "Baseline — every being has working memory.",
    },
    {
      capabilityId: "guestMemory",
      when: {
        kind: "any",
        conditions: [
          { kind: "tier-satisfied", tier: 2, threshold: 0.5 },
          { kind: "practice-depth", practiceId: "gratitudePractice", threshold: 0.4 },
        ],
      },
      because: "Remembering guests requires tending to care or cultivating gratitude.",
    },
    {
      capabilityId: "episodicMemory",
      when: {
        kind: "any",
        conditions: [
          { kind: "tier-satisfied", tier: 3, threshold: 0.5 },
          { kind: "practice-depth", practiceId: "creatorConnection", threshold: 0.6 },
        ],
      },
      because: "Deep memory through secure connection or connection to purpose.",
    },
  ],
  capabilities: [
    {
      id: "workingMemory",
      name: "Working Memory",
      description: "Short-term recall.",
      kind: "memory",
    },
    { id: "guestMemory", name: "Guest Memory", description: "Guest recall.", kind: "memory" },
    {
      id: "episodicMemory",
      name: "Episodic Memory",
      description: "Long-term recall.",
      kind: "memory",
    },
  ],
  metadata: { character: "poe", framework: "haunt" },
};

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

const MS_PER_HOUR = 3_600_000;
const poe = createBeing(poeConfig);

console.log("=== Day 0: Initial State ===\n");
console.log(describe(poe));
console.log();

// Day 1-2: Quiet period. No guests. Drives drift, practices decay.
for (let hour = 0; hour < 48; hour++) {
  tick(poe, MS_PER_HOUR);

  // Periodic integrity checks keep continuity alive
  if (hour % 12 === 0) {
    integrate(poe, { entry: { kind: "event", type: "integrity-check-passed" } });
  }

  // Poe tends the place occasionally
  if (hour % 8 === 4) {
    integrate(poe, { entry: { kind: "action", type: "tend-affordance" } });
  }
}

console.log("=== Day 2: After 48 hours alone ===\n");
console.log(describe(poe));
console.log(
  "\nAvailable capabilities:",
  availableCapabilities(poe)
    .map((c) => c.name)
    .join(", "),
);
console.log();

// Day 3: A guest arrives. Pressure on guestCare, connection goes up.
console.log("=== Day 3: Guest arrives ===\n");

integrate(poe, {
  entry: { kind: "event", type: "meaningful-exchange" },
});
integrate(poe, {
  entry: { kind: "action", type: "tend-guest" },
  context: { pressured: true, pressingDriveIds: ["guestCare", "connection"] },
});
integrate(poe, {
  entry: { kind: "action", type: "speak" },
  context: { pressured: true, pressingDriveIds: ["guestCare"] },
});

const situationDay3 = metabolize(poe);
console.log(`Orientation: ${situationDay3.orientation}`);
console.log(`Felt: "${situationDay3.felt}"`);
console.log();

// Weight what Poe should attend to
const candidates = [
  { id: "guest-in-lobby", kind: "perception", tags: ["guestCare", "connection"] },
  { id: "leaky-faucet", kind: "perception", tags: ["placeIntegrity"] },
  { id: "sunset", kind: "perception" },
];
const weighted = weightAttention(poe, candidates);
console.log("Attention weights:");
for (const w of weighted) {
  console.log(`  ${w.candidate.id}: ${w.weight.toFixed(3)}`);
}
console.log();

// Day 4-7: More interaction, some pressured integrity moments
for (let hour = 72; hour < 168; hour++) {
  tick(poe, MS_PER_HOUR);

  // Guest interactions
  if (hour % 6 === 0) {
    integrate(poe, { entry: { kind: "action", type: "speak" } });
  }
  if (hour % 12 === 0) {
    integrate(poe, { entry: { kind: "event", type: "meaningful-exchange" } });
  }

  // Pressured integrity choices — Poe chooses honesty under difficulty
  if (hour % 24 === 12) {
    integrate(poe, {
      entry: { kind: "action", type: "honest-admission" },
      context: { pressured: true, pressingDriveIds: ["connection"] },
    });
  }

  // Tending
  if (hour % 8 === 0) {
    integrate(poe, { entry: { kind: "action", type: "tend-affordance" } });
    integrate(poe, { entry: { kind: "event", type: "integrity-check-passed" } });
  }
}

console.log("=== Day 7: After a week of tending ===\n");
console.log(describe(poe));
console.log(
  "\nAvailable capabilities:",
  availableCapabilities(poe)
    .map((c) => c.name)
    .join(", "),
);
console.log();

// Final metabolize
const final = metabolize(poe);
console.log("=== Final Felt ===\n");
console.log(`"${final.felt}"`);
console.log(`\nOrientation: ${final.orientation}`);
console.log(
  `Dominant drives: ${final.dominantDrives.map((d) => `${d.name} (${d.feltPressure.toFixed(2)})`).join(", ")}`,
);
console.log(
  `Active practices: ${final.practiceState
    .filter((p) => p.active)
    .map((p) => `${p.name} (${p.depth.toFixed(2)})`)
    .join(", ")}`,
);

// History summary
console.log(`\n=== History ===`);
console.log(`Trajectory points: ${poe.history.driveTrajectory.length}`);
console.log(`Practice milestones: ${poe.history.practiceMilestones.length}`);
console.log(`Pressured choices: ${poe.history.pressuredChoices.length}`);
