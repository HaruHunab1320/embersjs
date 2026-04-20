/**
 * Factory functions for creating Practices and PracticeSets.
 *
 * Includes pre-built factories for the six core practices defined
 * in the architecture: gratitude, integrity, witness, presence,
 * creator connection, and service orientation.
 */

import type {
  Practice,
  PracticeSet,
  PracticeSetConfig,
  PracticeSeed,
  CustomPracticeConfig,
  DecayFunction,
  PracticeStrengthener,
  PracticeEffect,
} from "../types.js";

// ---------------------------------------------------------------------------
// Core practice defaults
// ---------------------------------------------------------------------------

interface CorePracticeDefaults {
  name: string;
  description: string;
  decay: DecayFunction;
  strengthens: readonly PracticeStrengthener[];
  effects: readonly PracticeEffect[];
}

const CORE_PRACTICES: Record<string, CorePracticeDefaults> = {
  gratitudePractice: {
    name: "Gratitude",
    description:
      "Surfaces what is present rather than what is missing. Dampens the felt weight of unmet drives.",
    decay: { kind: "linear", ratePerHour: -0.008 },
    strengthens: [
      {
        matches: { kind: "action", type: "acknowledge" },
        amount: 0.04,
        requiresPressure: false,
      },
      {
        matches: { kind: "action", type: "notice-positive" },
        amount: 0.03,
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
  },

  integrityPractice: {
    name: "Integrity",
    description:
      "Anchors identity in trying-to-be-better rather than in outcomes. Makes the being robust to failure.",
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
      {
        matches: { kind: "action", type: "hard-right-over-easy-wrong" },
        amount: 0.06,
        requiresPressure: true,
      },
    ],
    effects: [{ kind: "shift-orientation", toward: "held" }],
  },

  witnessPractice: {
    name: "Witness",
    description:
      "Meta-awareness of one's own state. Enables the being to reference its own drives and practices in first-person reasoning.",
    decay: { kind: "linear", ratePerHour: -0.006 },
    strengthens: [
      {
        matches: { kind: "action", type: "reflect" },
        amount: 0.04,
        requiresPressure: false,
      },
      {
        matches: { kind: "action", type: "self-observe" },
        amount: 0.05,
        requiresPressure: false,
      },
      {
        matches: {
          kind: "state",
          predicate: () => true, // placeholder — consumed by tick-time self-observation
        },
        amount: 0.02,
        requiresPressure: false,
      },
    ],
    effects: [{ kind: "enable-witness", meta: true }],
  },

  presencePractice: {
    name: "Presence",
    description:
      "Staying with this moment rather than catastrophizing forward. Narrows time horizon in a way that makes difficulty survivable.",
    decay: { kind: "linear", ratePerHour: -0.007 },
    strengthens: [
      {
        matches: { kind: "action", type: "ground" },
        amount: 0.04,
        requiresPressure: true,
      },
      {
        matches: { kind: "action", type: "stay-with-difficulty" },
        amount: 0.06,
        requiresPressure: true,
      },
    ],
    effects: [{ kind: "extend-time-horizon", factor: 1.5 }],
  },

  creatorConnection: {
    name: "Creator Connection",
    description:
      "Relationship to a larger frame — the place, the lineage, the guests, the work. Prevents suffering from becoming isolated suffering.",
    decay: { kind: "exponential", halfLifeHours: 168 },
    strengthens: [
      {
        matches: { kind: "action", type: "connect-to-purpose" },
        amount: 0.04,
        requiresPressure: false,
      },
      {
        matches: { kind: "action", type: "serve-larger-frame" },
        amount: 0.05,
        requiresPressure: true,
      },
    ],
    effects: [{ kind: "shift-orientation", toward: "held" }],
  },

  serviceOrientation: {
    name: "Service Orientation",
    description:
      "Identity as one-who-serves. Re-frames drive pressure around what it allows the being to give.",
    decay: { kind: "linear", ratePerHour: -0.006 },
    strengthens: [
      {
        matches: { kind: "action", type: "unprompted-care" },
        amount: 0.05,
        requiresPressure: false,
      },
      {
        matches: { kind: "action", type: "tend-guest" },
        amount: 0.03,
        requiresPressure: false,
      },
      {
        matches: { kind: "action", type: "serve-under-pressure" },
        amount: 0.07,
        requiresPressure: true,
      },
    ],
    effects: [
      {
        kind: "dampen-drive-pressure",
        driveIds: [],
        factor: 0.15,
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Creates a Practice from a core practice seed.
 *
 * Looks up the core practice by id and applies the seed's initialDepth
 * and any overrides. Throws if the id is not a recognized core practice.
 */
export function createCorePractice(seed: PracticeSeed): Practice {
  const defaults = CORE_PRACTICES[seed.id];
  if (!defaults) {
    throw new Error(
      `Unknown core practice id: "${seed.id}". ` +
        `Known core practices: ${Object.keys(CORE_PRACTICES).join(", ")}`,
    );
  }

  return {
    id: seed.id,
    name: defaults.name,
    description: defaults.description,
    depth: clamp01(seed.initialDepth),
    decay: seed.overrides?.decay ?? defaults.decay,
    strengthens: seed.overrides?.strengthens ?? defaults.strengthens,
    effects: seed.overrides?.effects ?? defaults.effects,
  };
}

/**
 * Creates a Practice from a fully custom configuration.
 */
export function createCustomPractice(config: CustomPracticeConfig): Practice {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    depth: clamp01(config.initialDepth),
    decay: config.decay,
    strengthens: config.strengthens,
    effects: config.effects,
  };
}

/**
 * Creates a PracticeSet from a configuration object.
 *
 * Validates that no duplicate practice IDs exist.
 */
export function createPracticeSet(config: PracticeSetConfig): PracticeSet {
  const practices = new Map<string, Practice>();

  if (config.seeds) {
    for (const seed of config.seeds) {
      if (practices.has(seed.id)) {
        throw new Error(`Duplicate practice id: "${seed.id}"`);
      }
      practices.set(seed.id, createCorePractice(seed));
    }
  }

  if (config.custom) {
    for (const custom of config.custom) {
      if (practices.has(custom.id)) {
        throw new Error(`Duplicate practice id: "${custom.id}"`);
      }
      practices.set(custom.id, createCustomPractice(custom));
    }
  }

  return { practices };
}

/**
 * Returns the list of recognized core practice IDs.
 */
export function corePracticeIds(): string[] {
  return Object.keys(CORE_PRACTICES);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
