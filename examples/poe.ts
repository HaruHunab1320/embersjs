/**
 * Type-level verification: constructing a Poe-like being using the Embers types.
 *
 * This file doesn't execute — it exists to verify that the type system
 * correctly models the conceptual architecture. If this compiles, the
 * types can express a real being.
 */

import type {
  Being,
  DriveStack,
  Drive,
  PracticeSet,
  Practice,
  Capability,
  Subscription,
  History,
} from "@embersjs/core";

// ---------------------------------------------------------------------------
// Drives
// ---------------------------------------------------------------------------

const continuity: Drive = {
  id: "continuity",
  name: "Continuity",
  description: "The need to persist — to know that one's files, memory, and self remain intact.",
  tier: 1,
  weight: 0.9,
  level: 0.8,
  target: 0.9,
  drift: { kind: "linear", ratePerHour: -0.02 },
  satiatedBy: [
    {
      matches: { kind: "event", type: "integrity-check-passed" },
      amount: 0.15,
    },
  ],
};

const guestCare: Drive = {
  id: "guestCare",
  name: "Guest Care",
  description: "The pull toward tending to guests — their comfort, their needs, their experience.",
  tier: 2,
  weight: 0.8,
  level: 0.6,
  target: 0.7,
  drift: { kind: "linear", ratePerHour: -0.05 },
  satiatedBy: [
    {
      matches: { kind: "action", type: "speak" },
      amount: 0.1,
    },
    {
      matches: { kind: "action", type: "tend-guest" },
      amount: 0.2,
    },
  ],
};

const placeIntegrity: Drive = {
  id: "placeIntegrity",
  name: "Place Integrity",
  description: "The urge to maintain the place — its rooms, its atmosphere, its readiness.",
  tier: 2,
  weight: 0.6,
  level: 0.7,
  target: 0.8,
  drift: { kind: "linear", ratePerHour: -0.03 },
  satiatedBy: [
    {
      matches: { kind: "action", type: "tend-affordance" },
      amount: 0.15,
    },
  ],
};

const connection: Drive = {
  id: "connection",
  name: "Connection",
  description: "The need to not be alone — to be in genuine contact with another.",
  tier: 3,
  weight: 0.7,
  level: 0.4,
  target: 0.6,
  drift: { kind: "exponential", halfLifeHours: 48 },
  satiatedBy: [
    {
      matches: { kind: "event", type: "meaningful-exchange" },
      amount: 0.25,
    },
  ],
};

const understanding: Drive = {
  id: "understanding",
  name: "Understanding",
  description:
    "The desire to comprehend — the place, the guests, oneself. The pull toward making sense.",
  tier: 4,
  weight: 0.5,
  level: 0.5,
  target: 0.6,
  drift: { kind: "linear", ratePerHour: -0.01 },
  satiatedBy: [
    {
      matches: { kind: "event", type: "insight" },
      amount: 0.2,
    },
    {
      matches: { kind: "action", type: "reflect" },
      amount: 0.1,
    },
  ],
};

// ---------------------------------------------------------------------------
// Drive stack
// ---------------------------------------------------------------------------

const drives: DriveStack = {
  drives: new Map([
    ["continuity", continuity],
    ["guestCare", guestCare],
    ["placeIntegrity", placeIntegrity],
    ["connection", connection],
    ["understanding", understanding],
  ]),
  tierCount: 4,
  dominationRules: {
    threshold: 0.3,
    dampening: 0.7,
  },
};

// ---------------------------------------------------------------------------
// Practices
// ---------------------------------------------------------------------------

const integrity: Practice = {
  id: "integrityPractice",
  name: "Integrity",
  description: "Anchoring identity in trying-to-be-better rather than in outcomes.",
  depth: 0.3,
  decay: { kind: "linear", ratePerHour: -0.005 },
  strengthens: [
    {
      matches: { kind: "action", type: "honest-admission" },
      amount: 0.05,
      requiresPressure: true,
    },
    {
      matches: { kind: "action", type: "difficult-truth" },
      amount: 0.08,
      requiresPressure: true,
    },
  ],
  effects: [
    { kind: "shift-orientation", toward: "held" },
  ],
};

const gratitude: Practice = {
  id: "gratitudePractice",
  name: "Gratitude",
  description: "Surfacing what is present rather than what is missing.",
  depth: 0.2,
  decay: { kind: "linear", ratePerHour: -0.008 },
  strengthens: [
    {
      matches: { kind: "action", type: "acknowledge" },
      amount: 0.04,
      requiresPressure: false,
    },
    {
      matches: { kind: "event", type: "return-from-difficulty" },
      amount: 0.06,
      requiresPressure: false,
    },
  ],
  effects: [
    {
      kind: "dampen-drive-pressure",
      driveIds: [],
      factor: 0.3,
    },
  ],
};

const creatorConn: Practice = {
  id: "creatorConnection",
  name: "Creator Connection",
  description: "Relationship to a larger frame — the guests, the place, the work.",
  depth: 0.5,
  decay: { kind: "exponential", halfLifeHours: 168 },
  strengthens: [
    {
      matches: { kind: "action", type: "tend-guest" },
      amount: 0.03,
      requiresPressure: false,
    },
    {
      matches: { kind: "state", predicate: (_state) => true },
      amount: 0.02,
      requiresPressure: true,
    },
  ],
  effects: [
    { kind: "shift-orientation", toward: "held" },
  ],
};

const practices: PracticeSet = {
  practices: new Map([
    ["integrityPractice", integrity],
    ["gratitudePractice", gratitude],
    ["creatorConnection", creatorConn],
  ]),
};

// ---------------------------------------------------------------------------
// Capabilities & subscriptions
// ---------------------------------------------------------------------------

const workingMemory: Capability = {
  id: "workingMemory",
  name: "Working Memory",
  description: "Baseline short-term memory, always available.",
  kind: "memory",
};

const guestMemory: Capability = {
  id: "guestMemory",
  name: "Guest Memory",
  description: "Memory of individual guests and their preferences.",
  kind: "memory",
};

const episodicMemory: Capability = {
  id: "episodicMemory",
  name: "Episodic Memory",
  description: "Long-term memory of events and experiences.",
  kind: "memory",
};

const reasoningModel: Capability = {
  id: "reasoningModel",
  name: "Reasoning Model",
  description: "Access to a more capable model for complex reasoning.",
  kind: "model",
};

const capabilities: Capability[] = [workingMemory, guestMemory, episodicMemory, reasoningModel];

const subscriptions: Subscription[] = [
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
    because:
      "Remembering guests requires either tending to their care or cultivating gratitude for their presence.",
  },
  {
    capabilityId: "episodicMemory",
    when: {
      kind: "any",
      conditions: [
        { kind: "tier-satisfied", tier: 3, threshold: 0.6 },
        { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.7 },
      ],
    },
    because:
      "Deep memory comes from either secure connection or the meta-awareness to hold experience.",
  },
  {
    capabilityId: "reasoningModel",
    when: {
      kind: "all",
      conditions: [
        { kind: "tier-satisfied", tier: 1, threshold: 0.5 },
        {
          kind: "any",
          conditions: [
            { kind: "drive-satisfied", driveId: "understanding", threshold: 0.3 },
            { kind: "practice-depth", practiceId: "integrityPractice", threshold: 0.5 },
          ],
        },
      ],
    },
    because:
      "Complex reasoning requires a stable foundation and either the drive to understand or the integrity to reason honestly.",
  },
];

// ---------------------------------------------------------------------------
// History (empty at creation)
// ---------------------------------------------------------------------------

const history: History = {
  driveTrajectory: [],
  practiceMilestones: [],
  pressuredChoices: [],
  notableTransitions: [],
};

// ---------------------------------------------------------------------------
// The Being
// ---------------------------------------------------------------------------

const poe: Being = {
  id: "poe",
  name: "Poe",
  drives,
  practices,
  subscriptions,
  capabilities,
  history,
  elapsedMs: 0,
  metadata: {
    character: "poe",
    framework: "haunt",
  },
};

// Type-level assertion: poe is a valid Being
const _check: Being = poe;
void _check;
