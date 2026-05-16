/**
 * Factory functions for creating Practices and PracticeSets.
 *
 * Practices in v0.2 are protocol + substrate. There is no `depth` field —
 * depth is derived from substrate at read time. Authors who want a being
 * to start with prior cultivation supply `initialArtifacts` rather than
 * an `initialDepth`.
 */

import type {
  CustomPracticeConfig,
  Practice,
  PracticeProtocol,
  PracticeSeed,
  PracticeSet,
  PracticeSetConfig,
} from "../types.js";
import { CORE_PRACTICES, corePracticeIds } from "./core.js";

const DEFAULT_SUBSTRATE_CAPACITY = 50;

/**
 * Creates a Practice from a core practice seed.
 *
 * Looks up the core practice by id, applies any overrides, and seeds
 * substrate with `initialArtifacts` (if any).
 *
 * Throws on unknown core ids. Throws if `creatorConnection` is seeded
 * without a `seed` value (the practice is meaningless without an authored
 * frame).
 */
export function createCorePractice(seed: PracticeSeed): Practice {
  const defaults = CORE_PRACTICES[seed.id];
  if (!defaults) {
    throw new Error(
      `Unknown core practice id: "${seed.id}". ` +
        `Known core practices: ${corePracticeIds().join(", ")}`,
    );
  }

  if (seed.id === "creatorConnection" && seed.seed === undefined) {
    throw new Error(
      `Practice "creatorConnection" requires an authored seed (frame and contemplative questions). ` +
        `See docs/design/v0.2/foundation.md for the seed shape.`,
    );
  }

  const overrides = seed.overrides ?? {};
  const protocol = mergeProtocol(defaults.protocol, overrides.protocol);
  const capacity = overrides.substrateCapacity ?? defaults.substrateCapacity;

  return {
    id: seed.id,
    name: defaults.name,
    description: overrides.description ?? defaults.description,
    intent: overrides.intent ?? defaults.intent,
    protocol,
    substrate: {
      artifacts: seed.initialArtifacts ?? [],
      capacity,
    },
    seed: seed.seed,
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
    intent: config.intent,
    protocol: config.protocol,
    substrate: {
      artifacts: config.initialArtifacts ?? [],
      capacity: config.substrateCapacity ?? DEFAULT_SUBSTRATE_CAPACITY,
    },
    seed: config.seed,
  };
}

/**
 * Creates a PracticeSet from a configuration object.
 *
 * Validates that no duplicate practice ids exist between seeds and custom.
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

function mergeProtocol(
  base: PracticeProtocol,
  override: Partial<PracticeProtocol> | undefined,
): PracticeProtocol {
  if (!override) return base;
  return {
    triggers: override.triggers ?? base.triggers,
    contextWindow: override.contextWindow ?? base.contextWindow,
    depthFunction: override.depthFunction ?? base.depthFunction,
    artifactMaxAgeMs: override.artifactMaxAgeMs ?? base.artifactMaxAgeMs,
  };
}

export { corePracticeIds };
