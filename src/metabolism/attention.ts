/**
 * Attention weighting: given candidates competing for the being's focus,
 * weight them by how relevant they are to the being's current inner state.
 */

import { composeEffects } from "../practices/effects.js";
import { averagePracticeDepth } from "../practices/query.js";
import type { AttentionCandidate, Being, WeightedCandidate } from "../types.js";
import { computeFeltPressures } from "./pressure.js";

/**
 * Weights attention candidates based on the being's drive pressure
 * and practice state.
 *
 * The algorithm:
 * - Each candidate gets a base weight of 0.5
 * - Candidates whose tags overlap with pressing drives get a boost
 *   proportional to the drive's felt pressure
 * - Deep presence practice distributes attention more evenly (reduces
 *   the gap between highest and lowest weights)
 *
 * Pure function. Returns candidates sorted by weight descending.
 */
export function weightAttention(
  being: Being,
  candidates: readonly AttentionCandidate[],
): WeightedCandidate[] {
  if (candidates.length === 0) return [];

  const effects = composeEffects(being.practices);
  const pressures = computeFeltPressures(being.drives, effects);

  // Build a tag→pressure map from drives
  const tagPressure = new Map<string, number>();
  for (const p of pressures) {
    if (p.feltPressure > 0) {
      // Use drive id and name as implicit tags
      tagPressure.set(p.drive.id, p.feltPressure);
      tagPressure.set(p.drive.name.toLowerCase(), p.feltPressure);
    }
  }

  // Weight each candidate
  const weighted = candidates.map((candidate): WeightedCandidate => {
    let weight = 0.5; // base weight

    // Boost from matching tags
    if (candidate.tags) {
      for (const tag of candidate.tags) {
        const pressure = tagPressure.get(tag);
        if (pressure !== undefined) {
          weight += pressure;
        }
      }
    }

    return { candidate, weight };
  });

  // Presence practice: distribute attention more evenly
  // Deep presence narrows the spread between highest and lowest weights
  const avgDepth = averagePracticeDepth(being.practices);
  if (avgDepth > 0.2 && weighted.length > 1) {
    const presenceFactor = Math.min(avgDepth, 0.8); // cap influence
    const mean = weighted.reduce((s, w) => s + w.weight, 0) / weighted.length;

    for (let i = 0; i < weighted.length; i++) {
      const w = weighted[i]!;
      // Pull toward the mean by presenceFactor
      const adjusted = w.weight + (mean - w.weight) * presenceFactor * 0.5;
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

  // Sort by weight descending
  weighted.sort((a, b) => b.weight - a.weight);

  return weighted;
}
