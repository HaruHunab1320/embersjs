/**
 * Default wear configuration and merging.
 *
 * These constants govern when chronic state begins to register, how fast it
 * accumulates, and how recovery proceeds. They are tunable per being via
 * `BeingConfig.wear`. Defaults are calibrated for a being whose simulation
 * tick is hourly.
 */

import type { WearConfig } from "../types.js";

const HOUR_MS = 3_600_000;

/**
 * Default wear configuration:
 * - Drives below 0.2 begin to accrue chronic-below time.
 * - Drives above 0.4 accrue recovery time (hysteresis between thresholds).
 * - Tier-1 reaches saturation contribution after 24h sustained below.
 * - 12h sustained above fully clears chronic state for that drive.
 * - Substrate ages 3× faster at full chronic load (1 + 1.0 × 2.0 multiplier).
 * - Above 0.6 chronic load, orientation forces toward `consumed` regardless
 *   of practice depth (the anti-stoic-marble rule).
 */
export const DEFAULT_WEAR_CONFIG: WearConfig = {
  criticalThreshold: 0.2,
  recoveryThreshold: 0.4,
  tier1SaturationMs: 24 * HOUR_MS,
  recoveryHorizonMs: 12 * HOUR_MS,
  erosionFactor: 2.0,
  orientationCollapseThreshold: 0.6,
};

export function mergeWearConfig(override?: Partial<WearConfig>): WearConfig {
  return { ...DEFAULT_WEAR_CONFIG, ...override };
}
