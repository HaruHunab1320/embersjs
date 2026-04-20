export {
  createCorePractice,
  createCustomPractice,
  createPracticeSet,
  corePracticeIds,
} from "./construct.js";
export { applyDecay } from "./decay.js";
export { tickPractices } from "./tick.js";
export { strengthenPractices } from "./strengthen.js";
export {
  practiceDepth,
  hasPracticeAtDepth,
  practicesByDepth,
  activePractices,
  averagePracticeDepth,
} from "./query.js";
export { composeEffects } from "./effects.js";
export type { ComposedEffects } from "./effects.js";
