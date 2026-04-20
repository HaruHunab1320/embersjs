/**
 * @module @embersjs/core
 *
 * Inner architecture for AI beings — drives, practices, and capabilities
 * that shape how a being meets its experience.
 *
 * Five integration points:
 * - `tick(being, dtMs)` — advance time
 * - `integrate(being, input)` — process events and actions
 * - `metabolize(being)` — produce prompt-ready inner situation
 * - `weightAttention(being, candidates)` — weight attention candidates
 * - `availableCapabilities(being)` — determine accessible capabilities
 */

// ---------------------------------------------------------------------------
// Public API — the five integration points + construction
// ---------------------------------------------------------------------------

export {
  createBeing,
  tick,
  integrate,
  metabolize,
  weightAttention,
  availableCapabilities,
  describe,
  serializeBeing,
  deserializeBeing,
} from "./being/index.js";

export type { SerializedBeing } from "./being/index.js";

// ---------------------------------------------------------------------------
// Core types — the library's public contract
// ---------------------------------------------------------------------------

export type {
  // Drive types
  Drive,
  DriveStack,
  DriftFunction,
  DominationRules,
  SatiationBinding,
  EventMatcher,
  ActionMatcher,
  StateMatcher,

  // Practice types
  Practice,
  PracticeSet,
  DecayFunction,
  PracticeStrengthener,
  PracticeEffect,

  // Capability & subscription types
  Capability,
  CapabilityKind,
  Subscription,
  AccessCondition,

  // Being
  Being,
  BeingState,
  History,

  // History detail types
  DriveTrajectoryPoint,
  PracticeMilestone,
  PressuredChoice,
  Transition,

  // Integration types
  IntegrationEvent,
  IntegrationAction,
  IntegrationInput,
  IntegrationResult,

  // Metabolism output types
  InnerSituation,
  Orientation,
  DriveSummary,
  PracticeSummary,

  // Attention types
  AttentionCandidate,
  WeightedCandidate,

  // Configuration types
  DriveConfig,
  DriveStackConfig,
  PracticeSeed,
  CustomPracticeConfig,
  PracticeSetConfig,
  BeingConfig,
} from "./types.js";
