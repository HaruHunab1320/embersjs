/**
 * Depth derivation: practice depth is computed from accumulated substrate.
 *
 * The default depth function combines artifact quality, recency
 * (exponential decay over a half-life), and a pressure-tested bonus.
 *
 * Properties:
 * - Decay is automatic — old artifacts age out via recency factor; no
 *   separate decay clock is needed.
 * - Pressure-tested cultivation compounds: artifacts produced under drive
 *   pressure receive a bonus multiplier.
 * - Quality is multiplicative; rejected attempts add no artifact and
 *   therefore contribute nothing.
 */

import type { DepthFunction, Practice, PracticeSubstrate } from "../types.js";
import { clamp01 } from "../util.js";

/** Recency half-life for artifact contribution. ~7 days. */
export const DEFAULT_RECENCY_HALFLIFE_MS = 7 * 24 * 3_600_000;

/**
 * Normalization divisor for default depth. Tunes how rich substrate must be
 * to reach depth 1.0. Roughly: 5 perfect-quality, recent, pressured artifacts
 * = depth 1.0.
 */
export const DEFAULT_DEPTH_NORMALIZATION = 5;

/** Multiplier applied to artifacts produced under drive pressure. */
export const PRESSURE_BONUS = 1.5;

/**
 * The default depth function: depth = clamp01( Σ(quality × recency × pressureBonus) / N ).
 *
 * Pure function.
 */
export const defaultDepthFunction: DepthFunction = (
  substrate: PracticeSubstrate,
  nowMs: number,
): number => {
  let total = 0;
  for (const artifact of substrate.artifacts) {
    const ageMs = Math.max(0, nowMs - artifact.atMs);
    const recency = 0.5 ** (ageMs / DEFAULT_RECENCY_HALFLIFE_MS);
    const pressureBonus = artifact.underPressure ? PRESSURE_BONUS : 1;
    total += artifact.quality * recency * pressureBonus;
  }
  return clamp01(total / DEFAULT_DEPTH_NORMALIZATION);
};

/**
 * Computes the current depth of a practice using its protocol's depth
 * function (or the default).
 */
export function computeDepth(practice: Practice, nowMs: number): number {
  const fn = practice.protocol.depthFunction ?? defaultDepthFunction;
  return fn(practice.substrate, nowMs);
}
