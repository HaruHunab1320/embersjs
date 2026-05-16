/**
 * Being construction: creates a fully initialized Being from a BeingConfig.
 */

import { createDriveStack } from "../drives/construct.js";
import { createPracticeSet } from "../practices/construct.js";
import type { Being, BeingConfig } from "../types.js";
import { mergeWearConfig } from "../wear/config.js";
import { createInitialWear } from "../wear/construct.js";

/**
 * Creates a Being from a configuration object.
 *
 * The Being starts with empty history, zero elapsed time, no pending
 * attempts, and zero chronic load.
 */
export function createBeing(config: BeingConfig): Being {
  const drives = createDriveStack(config.drives);
  const wearConfig = mergeWearConfig(config.wear);
  const wear = createInitialWear(drives);

  return {
    id: config.id,
    name: config.name,
    drives,
    practices: createPracticeSet(config.practices),
    subscriptions: config.subscriptions,
    capabilities: config.capabilities,
    wear,
    pendingAttempts: [],
    wearConfig,
    history: {
      driveTrajectory: [],
      recentEntries: [],
      practiceMilestones: [],
      pressuredChoices: [],
      notableTransitions: [],
    },
    elapsedMs: 0,
    metadata: config.metadata ?? {},
  };
}
