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

export type { SerializedBeing } from "./being/index.js";
export {
  availableCapabilities,
  createBeing,
  describe,
  deserializeBeing,
  integrate,
  metabolize,
  serializeBeing,
  tick,
  weightAttention,
} from "./being/index.js";

// ---------------------------------------------------------------------------
// Core types — the library's public contract
// ---------------------------------------------------------------------------

export type {
  AccessCondition,
  ActionMatcher,
  // Attention types
  AttentionCandidate,
  // Being
  Being,
  BeingConfig,
  BeingState,
  // Capability & subscription types
  Capability,
  CapabilityKind,
  CustomPracticeConfig,
  DecayFunction,
  DominationRules,
  DriftFunction,
  // Drive types
  Drive,
  // Configuration types
  DriveConfig,
  DriveStack,
  DriveStackConfig,
  DriveSummary,
  // History detail types
  DriveTrajectoryPoint,
  EventMatcher,
  History,
  // Metabolism output types
  InnerSituation,
  IntegrationAction,
  // Integration types
  IntegrationEvent,
  IntegrationInput,
  IntegrationResult,
  Orientation,
  // Practice types
  Practice,
  PracticeEffect,
  PracticeMilestone,
  PracticeSeed,
  PracticeSet,
  PracticeSetConfig,
  PracticeStrengthener,
  PracticeSummary,
  PressuredChoice,
  SatiationBinding,
  StateMatcher,
  Subscription,
  Transition,
  WeightedCandidate,
} from "./types.js";
