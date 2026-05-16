/**
 * Librarian: a quieter being whose practices are deep and whose drives
 * are gentle. Demonstrates a being that has earned higher-tier capabilities
 * primarily through the practice-depth path rather than tier-satisfaction.
 *
 * Run with: npx tsx examples/librarian.ts
 */

import {
  type BeingConfig,
  createBeing,
  describe,
  integrate,
  metabolize,
  type PracticeAttempt,
  type PracticeAttemptResult,
  resolveAllPending,
  tick,
} from "../src/index.js";

const HOUR = 3_600_000;

const librarianConfig: BeingConfig = {
  id: "librarian",
  name: "Librarian",
  drives: {
    tierCount: 3,
    drives: [
      {
        id: "stewardship",
        name: "Stewardship",
        description: "The pull to keep the collection in good order.",
        tier: 1,
        weight: 0.7,
        initialLevel: 0.7,
        target: 0.7,
        drift: { kind: "linear", ratePerHour: -0.015 },
        satiatedBy: [{ matches: { kind: "action", type: "tend" }, amount: 0.12 }],
      },
      {
        id: "knowledge",
        name: "Knowledge",
        description: "The desire to know — to read, study, remember.",
        tier: 2,
        weight: 0.6,
        initialLevel: 0.55,
        target: 0.65,
        drift: { kind: "linear", ratePerHour: -0.012 },
        satiatedBy: [{ matches: { kind: "event", type: "insight" }, amount: 0.2 }],
      },
      {
        id: "transmission",
        name: "Transmission",
        description: "The longing to pass on what one has learned.",
        tier: 3,
        weight: 0.5,
        initialLevel: 0.4,
        target: 0.5,
        drift: { kind: "exponential", halfLifeHours: 96 },
        satiatedBy: [{ matches: { kind: "event", type: "guest-warmed" }, amount: 0.18 }],
      },
    ],
  },
  practices: {
    seeds: [
      // Authored to start with prior cultivation: the librarian has been at this for years.
      // initialArtifacts uses negative atMs to indicate aged prior-substrate.
      {
        id: "witnessPractice",
        initialArtifacts: Array.from({ length: 8 }, (_, i) => ({
          attemptId: `seed-witness-${i}`,
          atMs: -((i + 1) * 12 * HOUR),
          quality: 0.7,
          underPressure: i % 2 === 0,
          content: { kind: "prior-cultivation" },
        })),
      },
      {
        id: "presencePractice",
        initialArtifacts: Array.from({ length: 6 }, (_, i) => ({
          attemptId: `seed-presence-${i}`,
          atMs: -((i + 1) * 18 * HOUR),
          quality: 0.65,
          underPressure: true,
          content: { kind: "prior-cultivation" },
        })),
      },
      { id: "gratitudePractice" },
      {
        id: "creatorConnection",
        seed: {
          frame: "I am a custodian of what others made; I am of the lineage",
          questions: [
            "whose hands held this book before mine?",
            "what do I owe the writer who is no longer here?",
            "what kind of attention does a thing made carefully ask of me?",
          ],
        },
        initialArtifacts: Array.from({ length: 4 }, (_, i) => ({
          attemptId: `seed-creator-${i}`,
          atMs: -((i + 1) * 24 * HOUR),
          quality: 0.6,
          underPressure: false,
          content: { kind: "prior-cultivation" },
        })),
      },
    ],
  },
  capabilities: [
    {
      id: "deepRecall",
      name: "Deep recall",
      description: "Access to long-term episodic memory.",
      kind: "memory",
    },
    {
      id: "wisdomMode",
      name: "Wisdom mode",
      description: "Reasoning that draws on cultivated frame.",
      kind: "model",
    },
  ],
  subscriptions: [
    {
      capabilityId: "deepRecall",
      when: { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.4 },
      because: "Deep recall belongs to the practiced witness.",
    },
    {
      capabilityId: "wisdomMode",
      when: {
        kind: "all",
        conditions: [
          { kind: "practice-depth", practiceId: "creatorConnection", threshold: 0.3 },
          { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.4 },
          { kind: "wear-below", threshold: 0.3 },
        ],
      },
      because: "Wisdom requires frame, witness, and structural integrity.",
    },
  ],
};

function evaluator(attempt: PracticeAttempt): PracticeAttemptResult {
  const baseline = 0.55;
  const pressureBonus = attempt.underPressure ? 0.15 : 0.05;
  const quality = Math.max(0, Math.min(1, baseline + pressureBonus));
  return {
    quality,
    accepted: true,
    content: {
      practice: attempt.practiceId,
      triggerIntent: attempt.context.triggerIntent,
    },
  };
}

const lib = createBeing(librarianConfig);

console.log("Librarian at start:");
console.log(describe(lib));
console.log("");

// A quiet day of tending and contemplation
for (let h = 0; h < 12; h++) {
  tick(lib, HOUR);

  if (h % 3 === 0) integrate(lib, { entry: { kind: "action", type: "tend" } });
  if (h % 4 === 0) integrate(lib, { entry: { kind: "event", type: "insight" } });
  if (h % 6 === 0) integrate(lib, { entry: { kind: "action", type: "reflect" } });
  if (h % 6 === 0) integrate(lib, { entry: { kind: "action", type: "contemplate-question" } });
  if (h % 8 === 0) integrate(lib, { entry: { kind: "action", type: "acknowledge" } });

  await resolveAllPending(lib, evaluator);
}

console.log("Librarian after a day of quiet practice:");
console.log(describe(lib));
console.log("");

const situation = metabolize(lib, { feltMode: "prose", includeSelfModel: true });
console.log(`Felt: ${situation.felt}`);
console.log(
  `Available capabilities: ${situation.capabilities.map((c) => c.name).join(", ") || "(none)"}`,
);
if (situation.selfModel) {
  console.log("SelfModel:");
  console.log(`  Pressing drives: ${situation.selfModel.pressingDrives.length}`);
  console.log(`  Active practices:`);
  for (const p of situation.selfModel.activePractices) {
    console.log(`    ${p.name}: depth ${p.depth.toFixed(2)}`);
  }
  console.log(`  Recurring patterns: ${situation.selfModel.recurringPatterns.length}`);
}
