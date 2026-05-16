/**
 * @module types
 *
 * Core type definitions for the Embers library (v0.2).
 *
 * v0.2 thesis (see docs/design/v0.2/foundation.md):
 * - Drives press constantly and never quiet — nothing reduces felt drive pressure.
 * - Practices are real cultivation: protocol + accumulating substrate.
 *   Depth is derived from substrate (recency × quality × pressure-bonus).
 * - Wear tracks chronic state separately from orientation; collapse is real,
 *   recovery is asymmetric, the path back up exists.
 * - Embers signals; the framework cognizes; Embers integrates the verdict.
 *   The library never calls a model.
 *
 * These types are the library's public contract. Changes are breaking.
 */

// ---------------------------------------------------------------------------
// Common matchers — used by drives and practice triggers
// ---------------------------------------------------------------------------

/**
 * Matches an event coming from the consuming framework.
 * The framework defines what its events look like.
 */
export interface EventMatcher {
  readonly kind: "event";
  /** Event type to match (e.g., "guest-arrived", "message-received"). */
  readonly type: string;
  /** Optional predicate for finer-grained matching. */
  readonly predicate?: (event: IntegrationEvent) => boolean;
}

/**
 * Matches an action the being has taken.
 * The framework defines what its actions look like.
 */
export interface ActionMatcher {
  readonly kind: "action";
  /** Action type to match (e.g., "speak", "tend-affordance"). */
  readonly type: string;
  /** Optional predicate for finer-grained matching. */
  readonly predicate?: (action: IntegrationAction) => boolean;
}

/**
 * Matches against the being's current state. Used by triggers that fire
 * based on internal conditions rather than external events.
 */
export interface StateMatcher {
  readonly kind: "state";
  /** Pure predicate evaluated against the being's current state. */
  readonly predicate: (state: BeingState) => boolean;
}

// ---------------------------------------------------------------------------
// Drives — needs that press constantly. Never dampened by practices.
// ---------------------------------------------------------------------------

/**
 * How a drive's satisfaction level changes over time absent external input.
 *
 * - `linear`: level changes by a fixed rate per hour.
 * - `exponential`: level half-lives toward 0 over the given period.
 * - `custom`: caller-supplied pure function.
 */
export type DriftFunction =
  | { readonly kind: "linear"; readonly ratePerHour: number }
  | { readonly kind: "exponential"; readonly halfLifeHours: number }
  | { readonly kind: "custom"; readonly compute: (current: number, dtMs: number) => number };

/**
 * Binds a drive to what events or actions satiate it, and by how much.
 */
export interface SatiationBinding {
  readonly matches: EventMatcher | ActionMatcher;
  /** How much satisfaction this provides per match, 0–1. Clamped at apply time. */
  readonly amount: number;
}

/**
 * A persistent need with a satisfaction level and dynamics that govern
 * how it changes over time.
 *
 * `level` is satisfaction (1 = fully met, 0 = dire). Pressure is computed
 * as `max(0, target - level) * weight` and is never reduced by practices.
 */
export interface Drive {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Tier in the drive stack. 1 = most foundational. */
  readonly tier: number;
  /** Within-tier importance weight, 0–1. */
  readonly weight: number;
  /** Current satisfaction level, 0–1. Mutable during tick and integration. */
  level: number;
  /** Homeostatic set point the drive tends toward, 0–1. */
  readonly target: number;
  /** How the level changes over time absent input. */
  readonly drift: DriftFunction;
  /** What events or actions satisfy this drive. */
  readonly satiatedBy: readonly SatiationBinding[];
}

/**
 * Rules governing how a dominating lower-tier drive shifts attention away
 * from higher tiers. In v0.2 this affects attention weighting and orientation
 * derivation only — drive pressure itself is never reduced.
 */
export interface DominationRules {
  /** Below this satisfaction level, a drive's tier "dominates." Default 0.3. */
  readonly threshold: number;
  /** How much higher-tier attention weight is reduced when dominated, 0–1. Default 0.7. */
  readonly attentionDampening: number;
}

/**
 * A tiered organization of a being's drives.
 */
export interface DriveStack {
  readonly drives: Map<string, Drive>;
  readonly tierCount: number;
  readonly dominationRules: DominationRules;
}

// ---------------------------------------------------------------------------
// Practices — protocols + accumulating substrate. Depth derived, not stored.
// ---------------------------------------------------------------------------

/**
 * Specifies what slice of the being's recent experience to include in a
 * practice attempt's evaluation context.
 */
export interface ContextWindowSpec {
  /** Maximum number of recent integration entries to include. Default 50. */
  readonly entries?: number;
  /** Maximum age of entries (ms). Default 24h (86_400_000). Used with `entries`,
   *  the more restrictive of the two wins. */
  readonly maxAgeMs?: number;
  /** Whether to include a slice of drive trajectory. Default true. */
  readonly includeTrajectory?: boolean;
  /** Whether to include other active practices' recent substrate. Default false. */
  readonly includeRelatedSubstrate?: boolean;
}

/**
 * A function that computes a practice's depth from its accumulated substrate.
 *
 * The default depth function combines artifact quality, recency
 * (exponential decay over a half-life), and a pressure-tested bonus.
 *
 * Pure function. Same substrate + same nowMs produce the same depth.
 */
export type DepthFunction = (substrate: PracticeSubstrate, nowMs: number) => number;

/**
 * A trigger that, when matched, records a practice attempt for evaluation.
 *
 * Triggers do NOT directly increase depth in v0.2. They produce attempts
 * that the consuming framework evaluates; depth derives from the resulting
 * substrate.
 */
export interface PracticeTrigger {
  /** What event/action/state matches this trigger. */
  readonly matches: EventMatcher | ActionMatcher | StateMatcher;
  /** When true, the trigger only fires while the being is under drive pressure. */
  readonly requiresPressure: boolean;
  /**
   * Authorial intent for this trigger — a short description of what cognitive
   * work this attempt is meant to represent. Surfaced to the evaluator.
   */
  readonly intent: string;
  /**
   * Maximum contribution to depth (per artifact) if evaluated at quality 1.0.
   * Replaces v0.1's `amount`. Effective contribution = maxContribution × quality.
   */
  readonly maxContribution: number;
}

/**
 * Declares how a practice gets engaged: what triggers attempts, what context
 * the framework receives for evaluation, and how depth is derived.
 */
export interface PracticeProtocol {
  /** What triggers attempts at this practice. */
  readonly triggers: readonly PracticeTrigger[];
  /** What slice of experience is included in attempt context. */
  readonly contextWindow: ContextWindowSpec;
  /** Optional custom depth function. Defaults to recency-quality-pressure. */
  readonly depthFunction?: DepthFunction;
  /** Hard age cap for artifacts (ms). Older artifacts evicted at tick time.
   *  Default: 30 days (2_592_000_000 ms). */
  readonly artifactMaxAgeMs?: number;
}

/**
 * An accumulated artifact from a resolved practice attempt.
 *
 * The `content` is opaque to Embers — frameworks define its shape. The library
 * stores artifacts and uses their quality, recency, and pressure-status to
 * compute depth, but never inspects content.
 */
export interface Artifact {
  /** Reference to the attempt that produced this artifact. */
  readonly attemptId: string;
  /** Simulation time when the attempt was resolved. */
  readonly atMs: number;
  /** Quality from evaluation, 0–1. */
  readonly quality: number;
  /** Whether the originating attempt was made under drive pressure. */
  readonly underPressure: boolean;
  /** Framework-supplied content (insight, articulation, choosing-moment, etc.). */
  readonly content: unknown;
  /** Optional human-readable rationale from the evaluator. */
  readonly reasons?: readonly string[];
}

/**
 * The accumulating body of a practice's cultivation.
 *
 * Bounded ring buffer. New artifacts beyond `capacity` evict the oldest.
 */
export interface PracticeSubstrate {
  readonly artifacts: readonly Artifact[];
  /** Maximum artifacts retained. Default 50 (configurable per practice). */
  readonly capacity: number;
}

/**
 * A cultivated capacity backed by accumulating substrate.
 *
 * Practices have no `depth` field — depth is derived from substrate.
 * Practices have no `effects` field — they influence the being through
 * substrate retrieval (in metabolize) and depth-gated capabilities.
 */
export interface Practice {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /**
   * Authorial intent — what cultivation this practice represents.
   * Surfaced to the framework's evaluator to construct evaluation prompts.
   */
  readonly intent: string;
  /** How the practice gets engaged. */
  readonly protocol: PracticeProtocol;
  /** Accumulating substrate. Mutable through resolveAttempt and tick. */
  substrate: PracticeSubstrate;
  /**
   * Optional author-supplied seed material the practice cultivates around
   * (e.g., the frame and contemplative questions for creator-connection).
   * Opaque to Embers; surfaced to the evaluator.
   */
  readonly seed?: unknown;
}

/**
 * The set of all practices a being maintains.
 */
export interface PracticeSet {
  readonly practices: Map<string, Practice>;
}

// ---------------------------------------------------------------------------
// Practice attempts — the two-phase evaluation mechanic
// ---------------------------------------------------------------------------

/**
 * A snapshot of context provided to the framework's evaluator.
 *
 * Rich enough that a framework can construct a meaningful LLM prompt or
 * apply rule-based evaluation. Embers does not invent content.
 */
export interface PracticeAttemptContext {
  /** The practice being attempted. */
  readonly practice: {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly intent: string;
    /** Depth at attempt time (computed). */
    readonly currentDepth: number;
    /** Author seed, if any (e.g., creator-connection's frame). */
    readonly seed?: unknown;
  };
  /** Authorial intent for the trigger that fired. */
  readonly triggerIntent: string;
  /** Drive levels at attempt time. */
  readonly driveLevels: Readonly<Record<string, number>>;
  /** Practice depths at attempt time (all practices). */
  readonly practiceDepths: Readonly<Record<string, number>>;
  /** Whether the being was under drive pressure. */
  readonly underPressure: boolean;
  /** Drives currently below the domination threshold, by id. */
  readonly pressingDriveIds: readonly string[];
  /** Recent integration entries — the being's "experience". */
  readonly recentEntries: readonly RecentEntry[];
  /** Recent pressured choices from history. */
  readonly recentPressuredChoices: readonly PressuredChoice[];
  /** Recent drive trajectory snippet (if includeTrajectory). */
  readonly recentTrajectory: readonly DriveTrajectoryPoint[];
  /** Related practices' recent substrate (if includeRelatedSubstrate). */
  readonly relatedSubstrate: ReadonlyArray<{
    readonly practiceId: string;
    readonly artifacts: readonly Artifact[];
  }>;
}

/**
 * A pending practice attempt — recorded by integrate, awaiting evaluation.
 */
export interface PracticeAttempt {
  /** Unique id for tracking across phases. */
  readonly id: string;
  /** Which practice is being attempted. */
  readonly practiceId: string;
  /** Index into the practice's protocol.triggers array. */
  readonly triggerIndex: number;
  /** Event/action that satisfied the matcher. Undefined for state-matched triggers. */
  readonly triggeredBy?: IntegrationEvent | IntegrationAction;
  /** Maximum depth contribution this attempt can produce (from trigger.maxContribution). */
  readonly proposedAmount: number;
  /** Simulation time when the attempt was recorded. */
  readonly attemptedAtMs: number;
  /** Whether the being was under drive pressure when this attempt was recorded. */
  readonly underPressure: boolean;
  /** Rich context for evaluation. */
  readonly context: PracticeAttemptContext;
  /** Lifecycle state. */
  readonly status: "pending" | "resolved" | "rejected" | "expired";
}

/**
 * The framework's verdict on a practice attempt.
 */
export interface PracticeAttemptResult {
  /** Quality of the cognitive work, 0–1. Scales the contribution. */
  readonly quality: number;
  /** Whether the attempt is accepted. If false, no artifact is stored. */
  readonly accepted: boolean;
  /** Optional rationale, recorded with the artifact and surfaced in describe. */
  readonly reasons?: readonly string[];
  /**
   * Optional substrate the framework returns. Stored as Artifact.content.
   * Opaque to Embers; frameworks define shape.
   */
  readonly content?: unknown;
}

/**
 * The result of resolving one attempt — what changed.
 */
export interface AttemptResolution {
  readonly attemptId: string;
  readonly practiceId: string;
  /** Whether the attempt was accepted (artifact stored). */
  readonly accepted: boolean;
  /** Artifact created, if accepted. */
  readonly artifactStored?: Artifact;
  /** Practice depth before resolution (derived). */
  readonly depthBefore: number;
  /** Practice depth after resolution (derived). */
  readonly depthAfter: number;
}

// ---------------------------------------------------------------------------
// Wear — chronic state tracking and the path back up
// ---------------------------------------------------------------------------

/**
 * Per-drive chronic state tracker. Hysteresis: accumulates `sustainedBelowMs`
 * while drive level is below `criticalThreshold`, accumulates `sustainedAboveMs`
 * while above `recoveryThreshold`. Between thresholds, both hold steady.
 */
export interface ChronicTracker {
  /** Accumulated time below criticalThreshold (ms). Decays slowly during recovery. */
  readonly sustainedBelowMs: number;
  /** Accumulated time above recoveryThreshold (ms). Used to confirm recovery. */
  readonly sustainedAboveMs: number;
}

/**
 * Chronic state across all drives.
 *
 * `chronicLoad` is a derived 0–1 scalar reflecting how worn down the being
 * is structurally. Composed from per-drive sustainedBelowMs values, weighted
 * by tier (lower tiers contribute more).
 */
export interface WearState {
  readonly perDrive: ReadonlyMap<string, ChronicTracker>;
  /** Derived overall chronic load, 0–1. Recomputed each tick. */
  readonly chronicLoad: number;
}

/**
 * Author-tunable wear parameters.
 */
export interface WearConfig {
  /** Below this drive level, sustainedBelowMs accumulates. Default 0.2. */
  readonly criticalThreshold: number;
  /** Above this drive level, sustainedAboveMs accumulates and recovery proceeds. Default 0.4. */
  readonly recoveryThreshold: number;
  /**
   * For tier-1 drives: ms of sustained-below at which contribution to
   * chronicLoad reaches saturation (1.0). Default 86_400_000 (24h).
   */
  readonly tier1SaturationMs: number;
  /**
   * After how much sustained-above ms a drive's sustainedBelowMs is fully cleared.
   * Default 43_200_000 (12h). Recovery is asymmetric — slower than descent.
   */
  readonly recoveryHorizonMs: number;
  /**
   * Multiplier for substrate-erosion acceleration at full chronicLoad.
   * Effective age multiplier = 1 + chronicLoad × erosionFactor.
   * Default 2.0 (artifacts age 3× faster at full chronic load).
   */
  readonly erosionFactor: number;
  /**
   * chronicLoad threshold above which orientation is forced toward "consumed"
   * regardless of practice depth. Default 0.6.
   */
  readonly orientationCollapseThreshold: number;
}

// ---------------------------------------------------------------------------
// Capabilities — higher functions gated by inner state
// ---------------------------------------------------------------------------

/**
 * The kind of resource a capability represents. Embers is agnostic about
 * what frameworks do with capabilities; it only reports availability.
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
 */
export interface Capability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kind: CapabilityKind;
  /** Framework-specific configuration. */
  readonly payload?: Readonly<Record<string, unknown>>;
}

/**
 * A condition that must be met for a capability to be available.
 *
 * The `any` and `all` composites give the system its anti-coercive depth:
 * a being can earn a capability through tier satisfaction OR practice depth,
 * with `wear-below` providing an additional gate against collapsed states.
 */
export type AccessCondition =
  | { readonly kind: "tier-satisfied"; readonly tier: number; readonly threshold: number }
  | { readonly kind: "drive-satisfied"; readonly driveId: string; readonly threshold: number }
  | { readonly kind: "practice-depth"; readonly practiceId: string; readonly threshold: number }
  | { readonly kind: "wear-below"; readonly threshold: number }
  | { readonly kind: "any"; readonly conditions: readonly AccessCondition[] }
  | { readonly kind: "all"; readonly conditions: readonly AccessCondition[] }
  | { readonly kind: "always" }
  | { readonly kind: "never" };

/**
 * Binds a capability to the conditions under which it becomes available.
 */
export interface Subscription {
  readonly capabilityId: string;
  readonly when: AccessCondition;
  /** Human-readable rationale, shown in debug output. */
  readonly because?: string;
}

// ---------------------------------------------------------------------------
// History — the body the being draws on
// ---------------------------------------------------------------------------

/**
 * A snapshot of all drive levels at a point in simulation time.
 */
export interface DriveTrajectoryPoint {
  readonly atMs: number;
  readonly levels: Readonly<Record<string, number>>;
}

/**
 * An integration entry recorded as part of the being's experience.
 * This is the raw material for self-reflection.
 */
export interface RecentEntry {
  readonly atMs: number;
  readonly entry: IntegrationEvent | IntegrationAction;
}

/**
 * A practice depth crossing a notable threshold.
 */
export interface PracticeMilestone {
  readonly practiceId: string;
  readonly depth: number;
  readonly atMs: number;
  readonly direction: "deepened" | "eroded";
  /** Optional reference to the artifact that triggered this milestone. */
  readonly attemptId?: string;
}

/**
 * A choice made while the being was under drive pressure.
 */
export interface PressuredChoice {
  readonly atMs: number;
  readonly pressingDriveIds: readonly string[];
  readonly action: IntegrationAction;
  /** Practice attempts generated by this choice. */
  readonly practiceAttemptIds: readonly string[];
}

/**
 * A notable state transition (orientation shift, capability change).
 */
export interface Transition {
  readonly atMs: number;
  readonly description: string;
  readonly from: string;
  readonly to: string;
}

/**
 * The record of a being's trajectory over time. Read by reflection,
 * attention weighting, and self-model assembly.
 */
export interface History {
  /** Drive-level snapshots, ring buffer (default capacity 1000). */
  driveTrajectory: DriveTrajectoryPoint[];
  /** Integration entries, ring buffer (default capacity 200). */
  recentEntries: RecentEntry[];
  /** Practice depth threshold crossings. */
  practiceMilestones: PracticeMilestone[];
  /** Pressured choices. */
  pressuredChoices: PressuredChoice[];
  /** Notable transitions. */
  notableTransitions: Transition[];
}

// ---------------------------------------------------------------------------
// Integration — events and actions from the framework
// ---------------------------------------------------------------------------

/**
 * An event from the external world the being experiences.
 */
export interface IntegrationEvent {
  readonly kind: "event";
  readonly type: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

/**
 * An action the being has taken.
 */
export interface IntegrationAction {
  readonly kind: "action";
  readonly type: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

/**
 * The input to `integrate()`.
 */
export interface IntegrationInput {
  readonly entry: IntegrationEvent | IntegrationAction;
  readonly context?: {
    /** Whether the being was under drive pressure at the time. If absent,
     *  the library computes it from current state. */
    readonly pressured?: boolean;
    /** Which drives were pressing, by id. If absent, derived. */
    readonly pressingDriveIds?: readonly string[];
  };
}

/**
 * The result of an `integrate()` call.
 */
export interface IntegrationResult {
  /** Drives whose levels changed via satiation. */
  readonly driveChanges: ReadonlyArray<{
    readonly driveId: string;
    readonly before: number;
    readonly after: number;
  }>;
  /**
   * IDs of pending practice attempts created by this integration.
   * The framework reads these via `getPendingAttempts()` and resolves them.
   */
  readonly pendingAttemptIds: readonly string[];
}

// ---------------------------------------------------------------------------
// Metabolism — what `metabolize()` returns
// ---------------------------------------------------------------------------

/**
 * Summary of a single drive's current state.
 */
export interface DriveSummary {
  readonly id: string;
  readonly name: string;
  readonly tier: number;
  readonly level: number;
  readonly target: number;
  /** Raw weighted pressure: max(0, target - level) × weight. Never dampened. */
  readonly pressure: number;
  /** Whether the drive is currently below the chronic-tracker critical threshold. */
  readonly chronic: boolean;
}

/**
 * Summary of a single practice's current state.
 */
export interface PracticeSummary {
  readonly id: string;
  readonly name: string;
  readonly intent: string;
  /** Current depth (derived from substrate). */
  readonly depth: number;
  /** Most recent N artifacts (per `MetabolizeOptions.substrateLimit`). */
  readonly recentSubstrate: readonly Artifact[];
  /** Whether this practice is active (depth above a minimum threshold). */
  readonly active: boolean;
}

/**
 * Overall orientation — current pressure-vs-resources synthesis.
 *
 * Distinct from `wear`, which describes chronic structural state.
 * A being can be currently `held` while highly worn (vulnerable).
 */
export type Orientation = "clear" | "stretched" | "consumed" | "held";

/**
 * A detected recurring pattern in the being's history.
 */
export interface Pattern {
  readonly kind: "drive-low" | "practice-engaged" | "pressured-choice";
  readonly subject: string;
  readonly description: string;
  readonly observedCount: number;
}

/**
 * Structured introspection — present in InnerSituation only when the
 * witness practice has earned the self-reflection capability.
 *
 * Frameworks decide how to inject this into prompts. The library does
 * not generate prose for it.
 */
export interface SelfModel {
  readonly pressingDrives: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly level: number;
    /** Time below critical (ms), 0 if not chronic. */
    readonly sustainedBelowMs: number;
  }>;
  readonly activePractices: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly intent: string;
    readonly depth: number;
    readonly sampleArtifact?: Artifact;
  }>;
  readonly recurringPatterns: readonly Pattern[];
  readonly recentPressuredChoices: readonly PressuredChoice[];
}

/**
 * Optional voice module for prose felt-string generation.
 */
export interface VoiceModule {
  readonly compose: (situation: Omit<InnerSituation, "felt">) => string;
}

/**
 * Options for `metabolize()`.
 */
export interface MetabolizeOptions {
  /**
   * Whether to compose a felt prose string.
   * - "off" (default): no prose; frameworks build their own from the structured data.
   * - "prose": compose prose using `voice` (or the default voice).
   */
  readonly feltMode?: "off" | "prose";
  /** Custom prose voice. If omitted with feltMode "prose", uses the default voice. */
  readonly voice?: VoiceModule;
  /** Max artifacts per practice in PracticeSummary.recentSubstrate. Default 5. */
  readonly substrateLimit?: number;
  /**
   * Whether to include selfModel.
   * - undefined (default): include only if witness capability is currently available.
   * - true / false: force inclusion or exclusion.
   */
  readonly includeSelfModel?: boolean;
  /** Whether to include the full WearState detail. Default false (just the scalar). */
  readonly includeWearDetail?: boolean;
}

/**
 * The full output of metabolism: the being's inner architecture, ready
 * for framework consumption.
 *
 * Felt prose is decoupled — the deliverable is the structured data; prose
 * is opt-in via `MetabolizeOptions.feltMode`.
 */
export interface InnerSituation {
  /** All drives, sorted by raw pressure descending. */
  readonly drives: readonly DriveSummary[];
  /** All practices, sorted by depth descending. */
  readonly practices: readonly PracticeSummary[];
  /** Capabilities currently available. */
  readonly capabilities: readonly Capability[];
  /** Overall orientation (current state). */
  readonly orientation: Orientation;
  /** Chronic load, 0–1 (structural state). */
  readonly wear: number;
  /** Full wear detail (only present if `includeWearDetail`). */
  readonly wearDetail?: WearState;
  /** Self-model (present only if witness capability active or forced). */
  readonly selfModel?: SelfModel;
  /** Optional felt prose (only present if `feltMode: "prose"`). */
  readonly felt?: string;
}

// ---------------------------------------------------------------------------
// Attention — weighting candidates by relevance to inner state
// ---------------------------------------------------------------------------

export interface AttentionCandidate {
  readonly id: string;
  readonly kind: string;
  /** Tags for drive/practice matching (e.g., ["guest", "care"]). */
  readonly tags?: readonly string[];
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface WeightedCandidate {
  readonly candidate: AttentionCandidate;
  /** Computed weight, 0–1. Higher = more relevant. */
  readonly weight: number;
}

// ---------------------------------------------------------------------------
// Read-only state snapshot for matchers
// ---------------------------------------------------------------------------

/**
 * Snapshot of the being's current state, passed to state matchers.
 */
export interface BeingState {
  readonly drives: DriveStack;
  readonly practices: PracticeSet;
  readonly wear: WearState;
}

// ---------------------------------------------------------------------------
// Configuration types — for construction
// ---------------------------------------------------------------------------

/**
 * Configuration for creating a drive.
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
 * Configuration for seeding a core practice at creation time.
 */
export interface PracticeSeed {
  /** Core practice id (e.g., "gratitudePractice"). */
  readonly id: string;
  /** Optional override of fields from the core defaults. */
  readonly overrides?: {
    readonly intent?: string;
    readonly description?: string;
    readonly protocol?: Partial<PracticeProtocol>;
    readonly substrateCapacity?: number;
  };
  /** Author-supplied seed material (frame, contemplative questions, etc.). */
  readonly seed?: unknown;
  /**
   * Pre-loaded artifacts representing prior cultivation.
   * Use negative atMs (relative to creation time) to indicate aged artifacts.
   */
  readonly initialArtifacts?: readonly Artifact[];
}

/**
 * Configuration for a fully custom (non-core) practice.
 */
export interface CustomPracticeConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly intent: string;
  readonly protocol: PracticeProtocol;
  readonly seed?: unknown;
  readonly substrateCapacity?: number;
  readonly initialArtifacts?: readonly Artifact[];
}

/**
 * Configuration for creating a practice set.
 */
export interface PracticeSetConfig {
  readonly seeds?: readonly PracticeSeed[];
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
  /** Optional wear configuration. Defaults applied for unspecified fields. */
  readonly wear?: Partial<WearConfig>;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Being — the top-level composite
// ---------------------------------------------------------------------------

/**
 * A complete inner life. One per consuming-framework entity.
 *
 * Five integration points operate on a Being: tick, integrate, metabolize,
 * weightAttention, availableCapabilities. Auxiliaries: getPendingAttempts,
 * resolveAttempt, resolveAllPending, getSelfModel.
 */
export interface Being {
  readonly id: string;
  readonly name: string;
  /** The tiered organization of needs. */
  drives: DriveStack;
  /** Cultivated capacities backed by substrate. */
  practices: PracticeSet;
  /** Capability access conditions. */
  readonly subscriptions: readonly Subscription[];
  /** Capabilities that could be made available. */
  readonly capabilities: readonly Capability[];
  /** Chronic state tracker. */
  wear: WearState;
  /** Pending practice attempts awaiting framework resolution. */
  pendingAttempts: readonly PracticeAttempt[];
  /** Wear configuration (with defaults filled). */
  readonly wearConfig: WearConfig;
  /** Record of trajectory and experience. */
  history: History;
  /** Elapsed simulation time in milliseconds. */
  elapsedMs: number;
  /** Author-defined metadata. */
  readonly metadata: Readonly<Record<string, unknown>>;
}
