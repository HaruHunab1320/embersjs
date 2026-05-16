/**
 * Metabolize: turns a Being's current state into a structured InnerSituation.
 *
 * In v0.2, the deliverable is the structured data — drives pressing,
 * practices substantiated, capabilities gated, wear tracked. Felt prose is
 * opt-in via `MetabolizeOptions.feltMode`.
 *
 * Pure function: same Being state + same options produce the same situation.
 */

import { buildSelfModel } from "../being/self-model.js";
import { availableCapabilities } from "../capabilities/available.js";
import { computeDepth } from "../practices/depth.js";
import type {
  Being,
  DriveSummary,
  InnerSituation,
  MetabolizeOptions,
  PracticeSummary,
  SelfModel,
} from "../types.js";
import { isChronic } from "../wear/query.js";
import { defaultVoice } from "./default-voice.js";
import { determineOrientation } from "./orientation.js";
import { computePressures } from "./pressure.js";

const DEFAULT_SUBSTRATE_LIMIT = 5;
const WITNESS_THRESHOLD_FOR_SELF_MODEL = 0.5;
const ACTIVE_DEPTH_THRESHOLD = 0.1;

export function metabolize(being: Being, options?: MetabolizeOptions): InnerSituation {
  const feltMode = options?.feltMode ?? "off";
  const substrateLimit = options?.substrateLimit ?? DEFAULT_SUBSTRATE_LIMIT;
  const includeWearDetail = options?.includeWearDetail ?? false;

  // Drives
  const pressures = computePressures(being.drives);
  const drives: DriveSummary[] = pressures.map((p) => ({
    id: p.drive.id,
    name: p.drive.name,
    tier: p.drive.tier,
    level: p.drive.level,
    target: p.drive.target,
    pressure: p.weightedPressure,
    chronic: isChronic(being.wear, p.drive.id, being.wearConfig),
  }));

  // Practices
  const practices: PracticeSummary[] = [];
  for (const practice of being.practices.practices.values()) {
    const depth = computeDepth(practice, being.elapsedMs);
    const recentSubstrate = practice.substrate.artifacts.slice(-substrateLimit);
    practices.push({
      id: practice.id,
      name: practice.name,
      intent: practice.intent,
      depth,
      recentSubstrate,
      active: depth >= ACTIVE_DEPTH_THRESHOLD,
    });
  }
  practices.sort((a, b) => b.depth - a.depth);

  // Capabilities
  const capabilities = availableCapabilities(being);

  // Orientation (factors wear)
  const orientation = determineOrientation(
    pressures,
    being.practices,
    being.wear,
    being.wearConfig,
    being.elapsedMs,
  );

  // Self-model — auto-include if witness depth is sufficient, unless overridden
  let selfModel: SelfModel | undefined;
  const explicit = options?.includeSelfModel;
  if (explicit === true) {
    selfModel = buildSelfModel(being);
  } else if (explicit === undefined) {
    const witness = being.practices.practices.get("witnessPractice");
    if (witness && computeDepth(witness, being.elapsedMs) >= WITNESS_THRESHOLD_FOR_SELF_MODEL) {
      selfModel = buildSelfModel(being);
    }
  }

  const base: InnerSituation = {
    drives,
    practices,
    capabilities,
    orientation,
    wear: being.wear.chronicLoad,
    wearDetail: includeWearDetail ? being.wear : undefined,
    selfModel,
  };

  if (feltMode === "prose") {
    const voice = options?.voice ?? defaultVoice;
    const felt = voice.compose(base);
    return { ...base, felt };
  }

  return base;
}
