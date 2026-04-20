/**
 * Being construction: creates a fully initialized Being from a BeingConfig.
 */

import type { Being, BeingConfig } from "../types.js";
import { createDriveStack } from "../drives/construct.js";
import { createPracticeSet } from "../practices/construct.js";

/**
 * Creates a Being from a configuration object.
 *
 * This is the main entry point for constructing a being. The config
 * specifies drives, practices, capabilities, and subscriptions.
 * The Being starts with empty history and zero elapsed time.
 */
export function createBeing(config: BeingConfig): Being {
  return {
    id: config.id,
    name: config.name,
    drives: createDriveStack(config.drives),
    practices: createPracticeSet(config.practices),
    subscriptions: config.subscriptions,
    capabilities: config.capabilities,
    history: {
      driveTrajectory: [],
      practiceMilestones: [],
      pressuredChoices: [],
      notableTransitions: [],
    },
    elapsedMs: 0,
    metadata: config.metadata ?? {},
  };
}
