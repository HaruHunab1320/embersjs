/**
 * Self-model assembly: structured introspection drawn from witness substrate
 * and history.
 *
 * The selfModel is what the being has earned the right to refer to once
 * the witness practice has accumulated substrate. Frameworks decide whether
 * to inject it into prompts; the library never generates prose.
 *
 * "Earned the right" in v0.2 means: witness practice depth ≥ 0.5 (the
 * default threshold; configurable via metabolize options).
 */

import { computeDepth } from "../practices/depth.js";
import type { Being, SelfModel } from "../types.js";
import { recurringPatterns } from "./history.js";

const DEFAULT_RECENT_PRESSURED_CHOICES = 3;
const DEFAULT_SAMPLE_POOL = 5;

/**
 * Builds a SelfModel from the being's current state and history.
 *
 * Always returns a structure — gating on witness depth happens at the
 * `metabolize()` call site, not here.
 */
export function buildSelfModel(being: Being): SelfModel {
  const nowMs = being.elapsedMs;
  const dominationThreshold = being.drives.dominationRules.threshold;

  // Pressing drives — currently below domination threshold
  const pressingDrives: Array<{
    id: string;
    name: string;
    level: number;
    sustainedBelowMs: number;
  }> = [];
  for (const drive of being.drives.drives.values()) {
    if (drive.level < dominationThreshold) {
      const tracker = being.wear.perDrive.get(drive.id);
      pressingDrives.push({
        id: drive.id,
        name: drive.name,
        level: drive.level,
        sustainedBelowMs: tracker?.sustainedBelowMs ?? 0,
      });
    }
  }
  pressingDrives.sort((a, b) => a.level - b.level);

  // Active practices, with a sample artifact (highest-quality from last N)
  const activePractices: Array<{
    id: string;
    name: string;
    intent: string;
    depth: number;
    sampleArtifact?: import("../types.js").Artifact;
  }> = [];
  for (const practice of being.practices.practices.values()) {
    const depth = computeDepth(practice, nowMs);
    if (depth < 0.1) continue;

    const recent = practice.substrate.artifacts.slice(-DEFAULT_SAMPLE_POOL);
    let sampleArtifact = recent[0];
    for (const a of recent) {
      if (sampleArtifact === undefined || a.quality > sampleArtifact.quality) {
        sampleArtifact = a;
      }
    }

    activePractices.push({
      id: practice.id,
      name: practice.name,
      intent: practice.intent,
      depth,
      sampleArtifact,
    });
  }
  activePractices.sort((a, b) => b.depth - a.depth);

  // Recurring patterns
  const patterns = recurringPatterns(being);

  // Recent pressured choices
  const recentChoices = being.history.pressuredChoices.slice(-DEFAULT_RECENT_PRESSURED_CHOICES);

  return {
    pressingDrives,
    activePractices,
    recurringPatterns: patterns,
    recentPressuredChoices: recentChoices,
  };
}
