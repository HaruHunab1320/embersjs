/**
 * @module @embersjs/core
 *
 * Inner architecture for AI beings — drives that press, practices cultivated
 * through evaluated engagement, capabilities gated by inner state, wear that
 * tracks chronic deprivation and the path back up.
 *
 * Five integration points:
 * - tick(being, dtMs)            advance time
 * - integrate(being, input)      process events and actions
 * - metabolize(being, opts?)     produce structured InnerSituation
 * - weightAttention(being, …)    weight attention candidates
 * - availableCapabilities(being) determine accessible capabilities
 *
 * Auxiliaries for the two-phase practice mechanic:
 * - getPendingAttempts, resolveAttempt, resolveAllPending, getSelfModel
 *
 * The library never calls a model. It signals when cognitive work is needed,
 * hands the framework rich context, and integrates the verdict.
 */

// ---------------------------------------------------------------------------
// Construction & lifecycle
// ---------------------------------------------------------------------------

export type { SerializedBeing } from "./being/index.js";
export {
  availableCapabilities,
  buildSelfModel,
  createBeing,
  describe,
  deserializeBeing,
  expirePendingAttempts,
  getPendingAttempts,
  getSelfModel,
  integrate,
  metabolize,
  recentEntries,
  recentPressuredChoices,
  recurringPatterns,
  resolveAllPending,
  resolveAttempt,
  serializeBeing,
  tick,
  trajectorySnippet,
  weightAttention,
} from "./being/index.js";

// ---------------------------------------------------------------------------
// Drives (factories + helpers)
// ---------------------------------------------------------------------------

export {
  applyDrift,
  createDrive,
  createDriveStack,
  dominantTier,
  drivePressure,
  drivesInTier,
  isTierSatisfied,
  pressingDrives,
  satiateDrives,
  tickDrives,
  topDrivesByPressure,
  weightedPressure,
} from "./drives/index.js";

// ---------------------------------------------------------------------------
// Practices (factories + helpers + two-phase mechanic primitives)
// ---------------------------------------------------------------------------

export {
  activePractices,
  averagePracticeDepth,
  CORE_PRACTICES,
  computeDepth,
  corePracticeIds,
  createCorePractice,
  createCustomPractice,
  createPracticeSet,
  DEFAULT_DEPTH_NORMALIZATION,
  DEFAULT_HARD_AGE_CAP_MS,
  DEFAULT_RECENCY_HALFLIFE_MS,
  defaultDepthFunction,
  getAttempt,
  hasPracticeAtDepth,
  PRESSURE_BONUS,
  practiceDepth,
  practicesByDepth,
  recordAttempts,
  tickPractices,
  triggerMatches,
} from "./practices/index.js";

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export type { CapabilityDiff } from "./capabilities/index.js";
export {
  capabilityDiff,
  createCapability,
  createSubscription,
  evaluateCondition,
} from "./capabilities/index.js";

// ---------------------------------------------------------------------------
// Metabolism (helpers; the main `metabolize` is exported above)
// ---------------------------------------------------------------------------

export type { DrivePressureSummary } from "./metabolism/index.js";
export {
  averagePressure,
  composeDefaultFelt,
  computePressures,
  defaultVoice,
  determineOrientation,
  dominantDrives,
  totalPressure,
} from "./metabolism/index.js";

// ---------------------------------------------------------------------------
// Wear
// ---------------------------------------------------------------------------

export {
  chronicDrives,
  createInitialWear,
  DEFAULT_WEAR_CONFIG,
  isChronic,
  isCollapsed,
  mergeWearConfig,
  sustainedBelowMs,
  tickWear,
} from "./wear/index.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type {
  AccessCondition,
  ActionMatcher,
  Artifact,
  AttemptResolution,
  AttentionCandidate,
  Being,
  BeingConfig,
  BeingState,
  Capability,
  CapabilityKind,
  ChronicTracker,
  ContextWindowSpec,
  CustomPracticeConfig,
  DepthFunction,
  DominationRules,
  DriftFunction,
  Drive,
  DriveConfig,
  DriveStack,
  DriveStackConfig,
  DriveSummary,
  DriveTrajectoryPoint,
  EventMatcher,
  History,
  InnerSituation,
  IntegrationAction,
  IntegrationEvent,
  IntegrationInput,
  IntegrationResult,
  MetabolizeOptions,
  Orientation,
  Pattern,
  Practice,
  PracticeAttempt,
  PracticeAttemptContext,
  PracticeAttemptResult,
  PracticeMilestone,
  PracticeProtocol,
  PracticeSeed,
  PracticeSet,
  PracticeSetConfig,
  PracticeSubstrate,
  PracticeSummary,
  PracticeTrigger,
  PressuredChoice,
  RecentEntry,
  SatiationBinding,
  SelfModel,
  StateMatcher,
  Subscription,
  Transition,
  VoiceModule,
  WearConfig,
  WearState,
  WeightedCandidate,
} from "./types.js";
