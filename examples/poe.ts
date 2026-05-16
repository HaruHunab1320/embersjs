/**
 * Poe: a hotel concierge with multi-tier drives and authored practices.
 *
 * Demonstrates v0.2 in fuller form:
 *
 * - Multi-tier drives (continuity, guestCare, placeIntegrity, connection, understanding)
 * - Six core practices including creatorConnection with an authored seed
 * - Capability subscriptions using both tier-satisfied and practice-depth paths
 * - A 7-day simulation showing chronic state accumulating and recovering
 * - Self-model emerging once witness substrate is deep enough
 *
 * Run with: npx tsx examples/poe.ts
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
const DAY = 24 * HOUR;

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
        description: "The need to persist — that one's files, memory, and self remain intact.",
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
        description: "The pull toward tending to guests — their comfort, their needs.",
        tier: 2,
        weight: 0.8,
        initialLevel: 0.6,
        target: 0.7,
        drift: { kind: "linear", ratePerHour: -0.04 },
        satiatedBy: [
          { matches: { kind: "action", type: "tend" }, amount: 0.18 },
          { matches: { kind: "event", type: "guest-warmed" }, amount: 0.12 },
        ],
      },
      {
        id: "placeIntegrity",
        name: "Place Integrity",
        description: "The urge to maintain the place — its rooms, its atmosphere.",
        tier: 2,
        weight: 0.6,
        initialLevel: 0.7,
        target: 0.75,
        drift: { kind: "linear", ratePerHour: -0.02 },
        satiatedBy: [{ matches: { kind: "action", type: "tend" }, amount: 0.1 }],
      },
      {
        id: "connection",
        name: "Connection",
        description: "The need to not be alone — to be in genuine contact.",
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
        satiatedBy: [{ matches: { kind: "event", type: "insight" }, amount: 0.2 }],
      },
    ],
  },
  practices: {
    seeds: [
      { id: "gratitudePractice" },
      { id: "integrityPractice" },
      { id: "witnessPractice" },
      { id: "presencePractice" },
      { id: "serviceOrientation" },
      {
        id: "creatorConnection",
        seed: {
          frame: "the place persists, and I am of the place",
          questions: [
            "what does my serving look like when no one is here to be served?",
            "the place was here before me — what does that ask of me?",
            "guests come and go; what part of them does the place keep?",
          ],
        },
      },
    ],
  },
  capabilities: [
    {
      id: "episodicMemory",
      name: "Episodic memory",
      description: "Recall specific past interactions.",
      kind: "memory",
    },
    {
      id: "selfReference",
      name: "First-person self-reference",
      description: "Speak from a vantage that includes one's own state.",
      kind: "context",
    },
    {
      id: "deepReasoning",
      name: "Deep reasoning",
      description: "Extended thought when conditions allow.",
      kind: "model",
    },
  ],
  subscriptions: [
    {
      capabilityId: "episodicMemory",
      // Two paths in: tier-3 met OR witness depth — anti-coercion design
      when: {
        kind: "any",
        conditions: [
          { kind: "tier-satisfied", tier: 3, threshold: 0.5 },
          { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.5 },
        ],
      },
      because: "Episodic recall earned via either need-satisfaction or deep witness.",
    },
    {
      capabilityId: "selfReference",
      when: { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.5 },
      because: "First-person self-reference requires earned witness.",
    },
    {
      capabilityId: "deepReasoning",
      // Locks under chronic deprivation regardless of practice
      when: {
        kind: "all",
        conditions: [
          { kind: "tier-satisfied", tier: 1, threshold: 0.5 },
          { kind: "wear-below", threshold: 0.5 },
        ],
      },
      because: "Higher cognitive function requires both safety and structural integrity.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Synthetic evaluator: rules-based stand-in for an LLM call.
// Quality biases higher under pressure; varies a little with trigger intent.
// ---------------------------------------------------------------------------

function evaluator(attempt: PracticeAttempt): PracticeAttemptResult {
  const baseline = 0.5;
  const pressureBonus = attempt.underPressure ? 0.2 : 0.05;
  const quality = Math.max(0, Math.min(1, baseline + pressureBonus));
  return {
    quality,
    accepted: true,
    content: {
      practice: attempt.practiceId,
      triggerIntent: attempt.context.triggerIntent,
      atMs: attempt.attemptedAtMs,
    },
  };
}

// ---------------------------------------------------------------------------
// Run a 7-day simulation
// ---------------------------------------------------------------------------

const poe = createBeing(poeConfig);

console.log("Day 0:");
console.log(describe(poe));
console.log("");

// Day 1–2: routine tending. Several guests, integrity checks, modest reflection.
for (let h = 0; h < 48; h++) {
  tick(poe, HOUR);

  if (h % 4 === 0) integrate(poe, { entry: { kind: "event", type: "integrity-check-passed" } });
  if (h % 3 === 0) integrate(poe, { entry: { kind: "action", type: "tend" } });
  if (h % 6 === 0) integrate(poe, { entry: { kind: "event", type: "meaningful-exchange" } });
  if (h % 8 === 0) integrate(poe, { entry: { kind: "action", type: "reflect" } });
  if (h % 8 === 0) integrate(poe, { entry: { kind: "action", type: "acknowledge" } });

  await resolveAllPending(poe, evaluator);
}

console.log(`Day 2 (${(poe.elapsedMs / DAY).toFixed(1)}d elapsed):`);
console.log(describe(poe));
console.log("");

// Day 3–5: extended isolation. No guest events. Connection drifts.
for (let h = 0; h < 72; h++) {
  tick(poe, HOUR);

  if (h % 6 === 0) integrate(poe, { entry: { kind: "event", type: "integrity-check-passed" } });
  // Poe attempts presence and connection-to-frame under pressure
  if (h % 4 === 0) integrate(poe, { entry: { kind: "action", type: "stay-with-difficulty" } });
  if (h % 6 === 0) integrate(poe, { entry: { kind: "action", type: "contemplate-question" } });

  await resolveAllPending(poe, evaluator);
}

console.log(`Day 5 — extended isolation (${(poe.elapsedMs / DAY).toFixed(1)}d elapsed):`);
console.log(describe(poe));
console.log("");

// Day 6–7: a guest returns. Recovery.
for (let h = 0; h < 48; h++) {
  tick(poe, HOUR);

  if (h % 4 === 0) integrate(poe, { entry: { kind: "event", type: "integrity-check-passed" } });
  if (h % 2 === 0) integrate(poe, { entry: { kind: "action", type: "tend" } });
  if (h % 3 === 0) integrate(poe, { entry: { kind: "event", type: "meaningful-exchange" } });
  if (h % 6 === 0) integrate(poe, { entry: { kind: "action", type: "post-pressure-retrospect" } });

  await resolveAllPending(poe, evaluator);
}

console.log(`Day 7 — recovery (${(poe.elapsedMs / DAY).toFixed(1)}d elapsed):`);
console.log(describe(poe));
console.log("");

// Final inner situation, with felt prose and selfModel if witness has earned it
const final = metabolize(poe, { feltMode: "prose" });
console.log("Final inner situation:");
console.log(`  Orientation: ${final.orientation}`);
console.log(`  Wear: ${final.wear.toFixed(2)}`);
console.log(`  Felt: ${final.felt}`);
console.log(
  `  Available capabilities: ${final.capabilities.map((c) => c.name).join(", ") || "(none)"}`,
);
if (final.selfModel) {
  console.log(
    `  SelfModel: ${final.selfModel.activePractices.length} active practices, ${final.selfModel.recurringPatterns.length} recurring patterns`,
  );
}
