/**
 * Attention weighting: ranks candidates by relevance to current inner state.
 *
 * Tier domination is applied HERE in v0.2 (not in pressure): when a lower
 * tier is dominating, candidates relevant to higher tiers receive a
 * reduced boost. This is where Maslow-flavored urgency lives.
 *
 * Practice depth (averaged) distributes attention more evenly — pulling
 * extreme weights toward the mean.
 */

import { dominantTier } from "../drives/query.js";
import { averagePracticeDepth } from "../practices/query.js";
import type { AttentionCandidate, Being, WeightedCandidate } from "../types.js";
import { computePressures } from "./pressure.js";

/**
 * Weights attention candidates. Pure function. Returns sorted descending.
 */
export function weightAttention(
  being: Being,
  candidates: readonly AttentionCandidate[],
): WeightedCandidate[] {
  if (candidates.length === 0) return [];

  const pressures = computePressures(being.drives);
  const domTier = dominantTier(being.drives);
  const attentionDamp = being.drives.dominationRules.attentionDampening;

  // Build tag → adjusted pressure map. Drives above the dominating tier have
  // their attention contribution reduced (lower-tier urgency dominates focus).
  const tagPressure = new Map<string, number>();
  for (const p of pressures) {
    if (p.weightedPressure <= 0) continue;
    let contrib = p.weightedPressure;
    if (domTier !== undefined && p.drive.tier > domTier) {
      contrib = contrib * (1 - attentionDamp);
    }
    tagPressure.set(p.drive.id, contrib);
    tagPressure.set(p.drive.name.toLowerCase(), contrib);
  }

  const weighted = candidates.map((candidate): WeightedCandidate => {
    let weight = 0.5;
    if (candidate.tags) {
      for (const tag of candidate.tags) {
        const pressure = tagPressure.get(tag);
        if (pressure !== undefined) weight += pressure;
      }
    }
    return { candidate, weight };
  });

  // Practice depth pulls weights toward the mean (distributes attention).
  const avgDepth = averagePracticeDepth(being.practices, being.elapsedMs);
  if (avgDepth > 0.2 && weighted.length > 1) {
    const factor = Math.min(avgDepth, 0.8);
    const mean = weighted.reduce((s, w) => s + w.weight, 0) / weighted.length;
    for (let i = 0; i < weighted.length; i++) {
      const w = weighted[i]!;
      const adjusted = w.weight + (mean - w.weight) * factor * 0.5;
      weighted[i] = { candidate: w.candidate, weight: adjusted };
    }
  }

  // Normalize to [0, 1]
  const maxWeight = Math.max(...weighted.map((w) => w.weight));
  if (maxWeight > 0) {
    for (let i = 0; i < weighted.length; i++) {
      const w = weighted[i]!;
      weighted[i] = { candidate: w.candidate, weight: w.weight / maxWeight };
    }
  }

  weighted.sort((a, b) => b.weight - a.weight);
  return weighted;
}
