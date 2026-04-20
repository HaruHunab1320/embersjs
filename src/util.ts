/** Milliseconds in one hour. */
export const MS_PER_HOUR = 3_600_000;

/** Clamps a numeric value to the range [0, 1]. */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
