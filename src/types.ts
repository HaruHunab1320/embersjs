/**
 * @module types
 *
 * Core type definitions for the Embers library.
 *
 * Every type here corresponds to a primitive from the architecture:
 * Being, Drive, DriveStack, Practice, PracticeSet, Capability,
 * Subscription, History, and the Metabolism output types.
 *
 * These types are the library's public contract. Changes are breaking
 * for every consumer.
 */

// ---------------------------------------------------------------------------
// Drive types
// ---------------------------------------------------------------------------

/**
 * How a drive's satisfaction level changes over time absent external input.
 *
 * - `linear`: level changes by a fixed rate per hour (negative = decays toward need).
 * - `exponential`: level half-lives toward 0 over the given period.
 * - `custom`: caller-supplied pure function.
 */
export type DriftFunction =
  | { readonly kind: "linear"; readonly ratePerHour: number }
  | { readonly kind: "exponential"; readonly halfLifeHours: number }
  | { readonly kind: "custom"; readonly compute: (current: number, dtMs: number) => number };

/**
 * Matches an event or action for satiation and practice-strengthening purposes.
 *
 * Matchers are intentionally loose — the consuming framework defines what
 * events and actions look like. The library only needs to know whether
 * something matches.
 */
export interface EventMatcher {
  readonly kind: "event";
  /** The event type to match (e.g., "guest-arrived", "message-received"). */
  readonly type: string;
  /** Optional predicate for finer-grained matching. */
  readonly predicate?: (event: IntegrationEvent) => boolean;
}

export interface ActionMatcher {
  readonly kind: "action";
  /** The action type to match (e.g., "speak", "tend-affordance"). */
  readonly type: string;
  /** Optional predicate for finer-grained matching. */
  readonly predicate?: (action: IntegrationAction) => boolean;
}

/**
 * Matches against the being's current state rather than an event or action.
 * Used by practice strengtheners that fire based on internal conditions
 * (e.g., "the being paused to observe itself during a tick").
 */
export interface StateMatcher {
  readonly kind: "state";
  /** Pure predicate evaluated against the being's current state. */
  readonly predicate: (state: BeingState) => boolean;
}

/**
 * A binding that describes what satiates a drive and by how much.
 */
export interface SatiationBinding {
  /** What event or action satisfies this drive. */
  readonly matches: EventMatcher | ActionMatcher;
  /** How much satisfaction this provides, 0–1. Clamped to [0, 1] at application time. */
  readonly amount: number;
}

/**
 * A named, persistent need with a current satisfaction level, a homeostatic
 * set point, and dynamics that govern how it changes over time.
 *
 * A drive's `level` represents *satisfaction*, not *need*.
 * - `1` = fully met
 * - `0` = dire, completely unmet
 *
 * Pressure is computed as `max(0, target - level)`.
 */
export interface Drive {
  /** Unique identifier within the being. */
  readonly id: string;
  /** Human-readable name (e.g., "connection", "continuity"). */
  readonly name: string;
  /** Description used in prompts and debug output. */
  readonly description: string;
  /** Tier in the drive stack. 1 = most foundational; higher = more self-actualizing. */
  readonly tier: number;
  /** Within-tier importance weight, 0–1. */
  readonly weight: number;
  /** Current satisfaction level, 0–1. Mutable during tick and integration. */
  level: number;
  /** Homeostatic set point the drive tends toward wanting, 0–1. */
  readonly target: number;
  /** How the level changes over time absent input. */
  readonly drift: DriftFunction;
  /** What events or actions satisfy this drive. */
  readonly satiatedBy: readonly SatiationBinding[];
}

/**
 * Rules governing how unsatisfied lower-tier drives dominate higher-tier activity.
 *
 * When any drive in a lower tier falls below `threshold`, all higher-tier
 * drives have their *felt* weight multiplied by `(1 - dampening)`.
 * Practices can modulate this — see Metabolism.
 */
export interface DominationRules {
  /**
   * Below this satisfaction level, a drive's tier "dominates."
   * @default 0.3
   */
  readonly threshold: number;
  /**
   * How much higher-tier felt weight is reduced when dominated, 0–1.
   * @default 0.7
   */
  readonly dampening: number;
}

/**
 * A tiered organization of a being's drives.
 *
 * Lower tiers are more foundational. When a lower tier is sufficiently
 * unsatisfied, it dampens higher-tier activity (modulated by practices).
 */
export interface DriveStack {
  /** All drives, keyed by their id. */
  readonly drives: Map<string, Drive>;
  /** Number of tiers in this stack. */
  readonly tierCount: number;
  /** Rules for how lower-tier deprivation affects higher tiers. */
  readonly dominationRules: DominationRules;
}

// ---------------------------------------------------------------------------
// Practice types
// ---------------------------------------------------------------------------

/**
 * How a practice decays over time when untended.
 *
 * - `linear`: depth drops by a fixed rate per hour.
 * - `exponential`: depth half-lives toward 0.
 * - `custom`: caller-supplied pure function.
 */
export type DecayFunction =
  | { readonly kind: "linear"; readonly ratePerHour: number }
  | { readonly kind: "exponential"; readonly halfLifeHours: number }
  | { readonly kind: "custom"; readonly compute: (current: number, dtMs: number) => number };

/**
 * Defines what kinds of events, actions, or states develop a practice,
 * and whether development requires the being to be under drive pressure.
 */
export interface PracticeStrengthener {
  /** What matches to trigger strengthening. */
  readonly matches: EventMatcher | ActionMatcher | StateMatcher;
  /** How much depth this adds per match, 0–1. Clamped at application time. */
  readonly amount: number;
  /**
   * When true, this strengthener only fires if the being is currently
   * under drive pressure. Choosing integrity when it's easy doesn't
   * develop integrityPractice — pressure is required.
   */
  readonly requiresPressure: boolean;
}

/**
 * The concrete effects a practice has on a being's metabolism.
 *
 * Practices modify how drives are *felt*, not whether they exist.
 * A practice never changes a drive's level directly.
 */
export type PracticeEffect =
  | {
      /** Dampens the felt pressure of specific drives. */
      readonly kind: "dampen-drive-pressure";
      /** Which drives are affected. Empty array means all drives. */
      readonly driveIds: readonly string[];
      /** Dampening factor, 0–1. Applied proportionally to practice depth. */
      readonly factor: number;
    }
  | {
      /** Narrows perceived time horizon, making crisis feel more local. */
      readonly kind: "extend-time-horizon";
      /** Factor by which the time horizon perception is extended. */
      readonly factor: number;
    }
  | {
      /** Enables the being to reference its own state in first-person reasoning. */
      readonly kind: "enable-witness";
      readonly meta: true;
    }
  | {
      /** Shifts the being's overall orientation toward a specific state. */
      readonly kind: "shift-orientation";
      readonly toward: "clear" | "held" | "stretched";
    };

/**
 * A cultivated orientation the being maintains.
 *
 * Practices aren't needs (not felt as pressure) and aren't capabilities
 * (not resources). They're commitments that shape how the being
 * metabolizes experience.
 *
 * Key properties:
 * - Develop through chosen practice under pressure, not passive accumulation
 * - Decay if untended
 * - Modify metabolism, not drives directly
 */
export interface Practice {
  /** Unique identifier (e.g., "gratitudePractice", "integrityPractice"). */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** Description used in prompts and debug output. */
  readonly description: string;
  /** Current depth, 0–1. 0 = absent, 1 = fully developed. Mutable. */
  depth: number;
  /** How quickly this practice erodes if untended. */
  readonly decay: DecayFunction;
  /** What kinds of events/actions/states develop this practice. */
  readonly strengthens: readonly PracticeStrengthener[];
  /** How this practice modifies metabolism when active. */
  readonly effects: readonly PracticeEffect[];
}

/**
 * The set of all practices a being maintains.
 */
export interface PracticeSet {
  /** All practices, keyed by their id. */
  readonly practices: Map<string, Practice>;
}

// ---------------------------------------------------------------------------
// Capability & subscription types
// ---------------------------------------------------------------------------

/**
 * The kind of resource a capability represents.
 *
 * The library doesn't know what to *do* with a capability —
 * it tells the consuming framework which ones are currently available.
 */
export type CapabilityKind =
  | "memory"
  | "model"
  | "tool"
  | "compute"
  | "context"
  | "action-kind"
  | (string & {});

/**
 * A resource the being may have access to, contingent on its inner state.
 *
 * Capabilities are data. The consuming framework wires them to real resources.
 */
export interface Capability {
  /** Unique identifier. */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** Description of what this capability provides. */
  readonly description: string;
  /** The kind of resource. */
  readonly kind: CapabilityKind;
  /** Framework-specific configuration. */
  readonly payload?: Readonly<Record<string, unknown>>;
}

/**
 * A condition that must be met for a capability to be available.
 *
 * Conditions compose via `any` (OR) and `all` (AND), enabling
 * nuanced gating. The `any` composite is what prevents coercion:
 * a being can earn access through drive satisfaction *or* practice depth.
 */
export type AccessCondition =
  | {
      /** Available when all drives in a tier meet a satisfaction threshold. */
      readonly kind: "tier-satisfied";
      readonly tier: number;
      readonly threshold: number;
    }
  | {
      /** Available when a specific drive meets a satisfaction threshold. */
      readonly kind: "drive-satisfied";
      readonly driveId: string;
      readonly threshold: number;
    }
  | {
      /** Available when a practice reaches a depth threshold. */
      readonly kind: "practice-depth";
      readonly practiceId: string;
      readonly threshold: number;
    }
  | {
      /** Available when *any* sub-condition is met. */
      readonly kind: "any";
      readonly conditions: readonly AccessCondition[];
    }
  | {
      /** Available when *all* sub-conditions are met. */
      readonly kind: "all";
      readonly conditions: readonly AccessCondition[];
    }
  | {
      /** Always available. */
      readonly kind: "always";
    }
  | {
      /** Never available (placeholder or disabled). */
      readonly kind: "never";
    };

/**
 * Binds a capability to the conditions under which it becomes available.
 */
export interface Subscription {
  /** The capability this subscription governs. */
  readonly capabilityId: string;
  /** When this capability becomes available. */
  readonly when: AccessCondition;
  /** Human-readable rationale, shown in debug output. */
  readonly because?: string;
}

// ---------------------------------------------------------------------------
// History types
// ---------------------------------------------------------------------------

/**
 * A snapshot of all drive levels at a point in time.
 * Used for trajectory tracking.
 */
export interface DriveTrajectoryPoint {
  /** Milliseconds since being creation (simulation time, not wall-clock). */
  readonly atMs: number;
  /** Drive levels at this point, keyed by drive id. */
  readonly levels: Readonly<Record<string, number>>;
}

/**
 * Records when a practice crossed a notable depth threshold.
 */
export interface PracticeMilestone {
  readonly practiceId: string;
  readonly depth: number;
  readonly atMs: number;
  readonly direction: "deepened" | "eroded";
}

/**
 * Records a choice made while the being was under drive pressure.
 * These are the moments that develop (or fail to develop) practices.
 */
export interface PressuredChoice {
  readonly atMs: number;
  /** Which drives were pressing when this choice was made. */
  readonly pressingDriveIds: readonly string[];
  /** The action taken. */
  readonly action: IntegrationAction;
  /** Which practices were strengthened as a result, if any. */
  readonly practicesStrengthened: readonly string[];
}

/**
 * Records a notable state transition — orientation changes, capability
 * shifts, practice milestones.
 */
export interface Transition {
  readonly atMs: number;
  readonly description: string;
  readonly from: string;
  readonly to: string;
}

/**
 * The record of a being's trajectory over time.
 *
 * In v0.1, history is recorded but not read by the library itself.
 * It's available for debugging and for future emergent-behavior features.
 */
export interface History {
  /** Ring buffer of drive states over time. Default capacity: 1000. */
  driveTrajectory: DriveTrajectoryPoint[];
  /** Notable practice depth crossings. */
  practiceMilestones: PracticeMilestone[];
  /** Choices made under drive pressure. */
  pressuredChoices: PressuredChoice[];
  /** Notable state transitions. */
  notableTransitions: Transition[];
}

// ---------------------------------------------------------------------------
// Integration types (events and actions from the consuming framework)
// ---------------------------------------------------------------------------

/**
 * An event from the external world that the being experiences.
 * The structure is intentionally loose — frameworks define their own events.
 */
export interface IntegrationEvent {
  readonly kind: "event";
  readonly type: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

/**
 * An action the being has taken.
 * The structure is intentionally loose — frameworks define their own actions.
 */
export interface IntegrationAction {
  readonly kind: "action";
  readonly type: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

/**
 * The input to `integrate()` — either an event that happened to the being,
 * or an action the being took.
 */
export interface IntegrationInput {
  /** The event or action. */
  readonly entry: IntegrationEvent | IntegrationAction;
  /** Context about the being's state when this occurred. */
  readonly context?: {
    /** Whether the being was under drive pressure at the time. */
    readonly pressured?: boolean;
    /** Which drives were pressing, by id. */
    readonly pressingDriveIds?: readonly string[];
  };
}

/**
 * The result of an `integrate()` call — what changed.
 */
export interface IntegrationResult {
  /** Drives whose levels changed, with before/after. */
  readonly driveChanges: ReadonlyArray<{
    readonly driveId: string;
    readonly before: number;
    readonly after: number;
  }>;
  /** Practices whose depth changed, with before/after. */
  readonly practiceChanges: ReadonlyArray<{
    readonly practiceId: string;
    readonly before: number;
    readonly after: number;
  }>;
}

// ---------------------------------------------------------------------------
// Metabolism output types
// ---------------------------------------------------------------------------

/**
 * Summary of a single drive's current state, for inclusion in metabolism output.
 */
export interface DriveSummary {
  readonly id: string;
  readonly name: string;
  /** Raw satisfaction level, 0–1. */
  readonly level: number;
  /** Felt pressure after practice modulation, 0–1. */
  readonly feltPressure: number;
  /** A brief prose description of how this drive feels right now. */
  readonly felt: string;
}

/**
 * Summary of a single practice's current state.
 */
export interface PracticeSummary {
  readonly id: string;
  readonly name: string;
  /** Current depth, 0–1. */
  readonly depth: number;
  /** Whether this practice is actively shaping metabolism (depth > some minimum). */
  readonly active: boolean;
}

/**
 * The overall orientation of a being — a synthesis of drive and practice state.
 *
 * - `clear`: drives satisfied, practices decent — the being is present and free.
 * - `held`: drives pressing but practices holding — difficulty met with resource.
 * - `stretched`: drives pressing, practices stretched thin — coping but strained.
 * - `consumed`: drives pressing, practices absent — overwhelmed.
 */
export type Orientation = "clear" | "stretched" | "consumed" | "held";

/**
 * The full output of metabolism: the being's felt inner situation.
 *
 * This is the main output of the library. The `felt` string goes into
 * prompts; the structured data informs attention-weighting and capability access.
 */
export interface InnerSituation {
  /** The most pressing drives, sorted by felt pressure descending. */
  readonly dominantDrives: readonly DriveSummary[];
  /** Current state of all practices. */
  readonly practiceState: readonly PracticeSummary[];
  /**
   * Prose description of the being's current experience.
   * This is what goes into the prompt. It should read like a being
   * noticing itself, not like a status report.
   */
  readonly felt: string;
  /** Overall orientation synthesized from drives and practices. */
  readonly orientation: Orientation;
}

// ---------------------------------------------------------------------------
// Attention types
// ---------------------------------------------------------------------------

/**
 * Something competing for the being's attention — a perception, event,
 * or internal signal that the consuming framework wants weighted.
 */
export interface AttentionCandidate {
  readonly id: string;
  /** What kind of thing this is (framework-defined). */
  readonly kind: string;
  /** Optional tags for drive/practice matching (e.g., ["guest", "care"]). */
  readonly tags?: readonly string[];
  /** Framework-specific payload. */
  readonly payload?: Readonly<Record<string, unknown>>;
}

/**
 * An attention candidate with its computed weight.
 */
export interface WeightedCandidate {
  readonly candidate: AttentionCandidate;
  /** Computed weight, 0–1. Higher = more relevant to the being right now. */
  readonly weight: number;
}

// ---------------------------------------------------------------------------
// Being state (read-only snapshot for matchers)
// ---------------------------------------------------------------------------

/**
 * A read-only snapshot of the being's current state, passed to
 * state matchers in practice strengtheners.
 */
export interface BeingState {
  readonly drives: DriveStack;
  readonly practices: PracticeSet;
}

// ---------------------------------------------------------------------------
// Configuration types (for construction)
// ---------------------------------------------------------------------------

/**
 * Configuration for creating a drive. Used by factory functions.
 */
export interface DriveConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tier: number;
  readonly weight: number;
  readonly initialLevel: number;
  readonly target: number;
  readonly drift: DriftFunction;
  readonly satiatedBy: readonly SatiationBinding[];
}

/**
 * Configuration for creating a drive stack.
 */
export interface DriveStackConfig {
  readonly tierCount: number;
  readonly drives: readonly DriveConfig[];
  readonly dominationRules?: Partial<DominationRules>;
}

/**
 * Configuration for seeding a practice at creation time.
 */
export interface PracticeSeed {
  readonly id: string;
  readonly initialDepth: number;
  /** Optional overrides for the core practice defaults. */
  readonly overrides?: {
    readonly decay?: DecayFunction;
    readonly strengthens?: readonly PracticeStrengthener[];
    readonly effects?: readonly PracticeEffect[];
  };
  /** Author-configurable context (e.g., what "creator" means for creatorConnection). */
  readonly config?: Readonly<Record<string, unknown>>;
}

/**
 * Configuration for a custom (non-core) practice.
 */
export interface CustomPracticeConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly initialDepth: number;
  readonly decay: DecayFunction;
  readonly strengthens: readonly PracticeStrengthener[];
  readonly effects: readonly PracticeEffect[];
}

/**
 * Configuration for creating a practice set.
 */
export interface PracticeSetConfig {
  /** Seeds for core practices (looked up by id). */
  readonly seeds?: readonly PracticeSeed[];
  /** Fully custom practices defined by the author. */
  readonly custom?: readonly CustomPracticeConfig[];
}

/**
 * Configuration for creating a Being.
 */
export interface BeingConfig {
  readonly id: string;
  readonly name: string;
  readonly drives: DriveStackConfig;
  readonly practices: PracticeSetConfig;
  readonly subscriptions: readonly Subscription[];
  readonly capabilities: readonly Capability[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Being
// ---------------------------------------------------------------------------

/**
 * The top-level composite: a complete inner life.
 *
 * One Being per consuming-framework entity (one per Haunt resident,
 * one per LangChain chain, etc.).
 *
 * The Being is the unit that the five integration points operate on:
 * `tick`, `integrate`, `metabolize`, `weightAttention`, `availableCapabilities`.
 */
export interface Being {
  /** Unique identifier for this being. */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** The tiered organization of this being's drives. */
  readonly drives: DriveStack;
  /** The cultivated practices this being maintains. */
  readonly practices: PracticeSet;
  /** Binds capabilities to access conditions. */
  readonly subscriptions: readonly Subscription[];
  /** All capabilities this being could potentially access. */
  readonly capabilities: readonly Capability[];
  /** Record of the being's trajectory. */
  readonly history: History;
  /** Elapsed simulation time in milliseconds. */
  elapsedMs: number;
  /** Author-defined metadata. */
  readonly metadata: Readonly<Record<string, unknown>>;
}
