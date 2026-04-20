/**
 * @module @embersjs/core
 *
 * Inner architecture for AI beings — drives, practices, and capabilities
 * that shape how a being meets its experience.
 */

// Core primitives
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
