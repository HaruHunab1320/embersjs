# Architecture (v0.2)

The technical spec for `@embersjs/core`. Types, lifecycle, integration contract. Read alongside [`docs/design/v0.2/foundation.md`](design/v0.2/foundation.md), which captures *why* the library is shaped this way.

If anything in code contradicts this document, the code wins and this document should be updated.

## Structural overview

```
┌───────────────────────────────────────────────────────────┐
│                          BEING                             │
└─────┬──────────┬─────────┬──────────┬──────────┬──────────┘
      ▼          ▼         ▼          ▼          ▼
   Drives    Practices  Subscriptions History    Wear
   (needs    (cultivated  (capabilities (the body  (chronic
   press)    capacities   gated by      drawn on)  state +
              backed by   inner state)             collapse)
              substrate)
```

Five primitives, each with a clear role:

- **Drives** press constantly. Never quieted by anything in the library.
- **Practices** are protocols + accumulating substrate. Depth is derived from substrate, not stored.
- **Subscriptions** gate capabilities by inner state. Two paths in (need-met or depth-earned), plus `wear-below`.
- **History** is the body the being draws on. Read by reflection, attention weighting, and self-model assembly.
- **Wear** tracks chronic state. Accelerates substrate erosion; above a threshold, forces orientation to `consumed`.

## Core types

All types live in [`src/types.ts`](../src/types.ts). They are the library's public contract. Changes are breaking.

### Drives

```ts
interface Drive {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly tier: number;       // 1 = most foundational
  readonly weight: number;     // within-tier importance, 0–1
  level: number;               // current satisfaction, 0–1 (1 = met)
  readonly target: number;     // homeostatic set point
  readonly drift: DriftFunction;
  readonly satiatedBy: readonly SatiationBinding[];
}

type DriftFunction =
  | { kind: "linear"; ratePerHour: number }
  | { kind: "exponential"; halfLifeHours: number }
  | { kind: "custom"; compute: (current: number, dtMs: number) => number };

interface DriveStack {
  readonly drives: Map<string, Drive>;
  readonly tierCount: number;
  readonly dominationRules: {
    readonly threshold: number;          // default 0.3
    readonly attentionDampening: number; // default 0.7 — affects ATTENTION only
  };
}
```

**Pressure** is computed as `max(0, target - level) * weight`. It is **never** reduced by practices or other modulations. The `attentionDampening` in `DominationRules` applies in `weightAttention()` only — when a lower tier is dominating, candidates relevant to higher tiers receive a reduced boost.

### Practices

```ts
interface Practice {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** What cultivation this practice represents. Used by evaluators. */
  readonly intent: string;
  readonly protocol: PracticeProtocol;
  substrate: PracticeSubstrate;
  /** Optional author seed — e.g., creator-connection's frame + questions. */
  readonly seed?: unknown;
}

interface PracticeProtocol {
  readonly triggers: readonly PracticeTrigger[];
  readonly contextWindow: ContextWindowSpec;
  readonly depthFunction?: DepthFunction;  // defaults to recency × quality × pressure-bonus
  readonly artifactMaxAgeMs?: number;      // hard eviction cap, default 30d
}

interface PracticeTrigger {
  readonly matches: EventMatcher | ActionMatcher | StateMatcher;
  readonly requiresPressure: boolean;
  readonly intent: string;       // what cognitive work this attempt represents
  readonly maxContribution: number;  // max depth contribution per artifact
}

interface PracticeSubstrate {
  readonly artifacts: readonly Artifact[];
  readonly capacity: number;     // ring buffer
}

interface Artifact {
  readonly attemptId: string;
  readonly atMs: number;
  readonly quality: number;
  readonly underPressure: boolean;
  readonly content: unknown;      // framework-supplied, opaque to Embers
  readonly reasons?: readonly string[];
}
```

**There is no `depth` field on Practice.** Depth is derived from substrate by the protocol's `depthFunction` (or the default). Reading depth is `computeDepth(practice, nowMs)` or `practiceDepth(set, id, nowMs)`.

**There is no `effects` field on Practice.** Practices influence the being through (a) substrate retrieval surfaced in metabolize, and (b) depth-gated capabilities. They do not have generic effects.

### Practice attempts (the two-phase mechanic)

```ts
interface PracticeAttempt {
  readonly id: string;
  readonly practiceId: string;
  readonly triggerIndex: number;
  readonly triggeredBy?: IntegrationEvent | IntegrationAction;
  readonly proposedAmount: number;   // from trigger.maxContribution
  readonly attemptedAtMs: number;
  readonly underPressure: boolean;
  readonly context: PracticeAttemptContext;
  readonly status: "pending" | "resolved" | "rejected" | "expired";
}

interface PracticeAttemptContext {
  readonly practice: { id; name; description; intent; currentDepth; seed? };
  readonly triggerIntent: string;
  readonly driveLevels: Readonly<Record<string, number>>;
  readonly practiceDepths: Readonly<Record<string, number>>;
  readonly underPressure: boolean;
  readonly pressingDriveIds: readonly string[];
  readonly recentEntries: readonly RecentEntry[];
  readonly recentPressuredChoices: readonly PressuredChoice[];
  readonly recentTrajectory: readonly DriveTrajectoryPoint[];
  readonly relatedSubstrate: ReadonlyArray<{ practiceId; artifacts }>;
}

interface PracticeAttemptResult {
  readonly quality: number;            // 0–1, scales the contribution
  readonly accepted: boolean;          // if false, no artifact stored
  readonly reasons?: readonly string[];
  readonly content?: unknown;          // stored as Artifact.content
}
```

`integrate()` populates `pendingAttempts` and returns `IntegrationResult.pendingAttemptIds`. The framework reads attempts via `getPendingAttempts(being)`, evaluates them, and calls `resolveAttempt(being, id, result)` for each — or `resolveAllPending(being, evaluator)` to drain the queue.

### Wear

```ts
interface WearState {
  readonly perDrive: ReadonlyMap<string, ChronicTracker>;
  readonly chronicLoad: number;        // 0–1, derived each tick
}

interface ChronicTracker {
  readonly sustainedBelowMs: number;
  readonly sustainedAboveMs: number;
}

interface WearConfig {
  readonly criticalThreshold: number;          // default 0.2
  readonly recoveryThreshold: number;          // default 0.4
  readonly tier1SaturationMs: number;          // default 24h
  readonly recoveryHorizonMs: number;          // default 12h
  readonly erosionFactor: number;              // default 2.0
  readonly orientationCollapseThreshold: number; // default 0.6
}
```

**Hysteresis:** drives below `criticalThreshold` accumulate `sustainedBelowMs` and reset `sustainedAboveMs`. Drives above `recoveryThreshold` accumulate `sustainedAboveMs`; full recovery (`sustainedAboveMs ≥ recoveryHorizonMs`) clears chronic state for that drive. Between thresholds, both hold steady.

**Chronic load contribution per drive** = `(sustainedBelowMs / tierSaturationMs) × (1 - recoveryProgress)`, weighted inversely by tier. Tier-1 deprivation dominates.

**Effects of wear:**
1. Substrate erosion accelerates — effective artifact age cap = `configuredCap / (1 + chronicLoad × erosionFactor)`. At full load, artifacts age 3× faster.
2. Orientation forced to `consumed` at `chronicLoad ≥ orientationCollapseThreshold`.
3. Capabilities gated by `wear-below` close at high load.

### Capabilities

```ts
type AccessCondition =
  | { kind: "tier-satisfied"; tier: number; threshold: number }
  | { kind: "drive-satisfied"; driveId: string; threshold: number }
  | { kind: "practice-depth"; practiceId: string; threshold: number }
  | { kind: "wear-below"; threshold: number }
  | { kind: "any"; conditions: readonly AccessCondition[] }
  | { kind: "all"; conditions: readonly AccessCondition[] }
  | { kind: "always" }
  | { kind: "never" };

interface Subscription {
  readonly capabilityId: string;
  readonly when: AccessCondition;
  readonly because?: string;
}
```

The `any` and `all` composites give the system its depth. The `wear-below` condition prevents capabilities from being available when the being is structurally collapsed.

### History

```ts
interface History {
  driveTrajectory: DriveTrajectoryPoint[];   // ring buffer, default 1000
  recentEntries: RecentEntry[];              // ring buffer, default 200
  practiceMilestones: PracticeMilestone[];
  pressuredChoices: PressuredChoice[];
  notableTransitions: Transition[];
}
```

`recentEntries` records every `IntegrationEvent | IntegrationAction` that passes through `integrate()`. It is the raw material for self-reflection and the context payload of practice attempts. Read via:

- `recentEntries(being, window)` — windowed access
- `recentPressuredChoices(being, filter?)`
- `trajectorySnippet(being, sinceMs)`
- `recurringPatterns(being)` — heuristic detection (drives repeatedly low, practices repeatedly engaged, drives that drove multiple pressured choices)

### Metabolism output

```ts
interface InnerSituation {
  readonly drives: readonly DriveSummary[];
  readonly practices: readonly PracticeSummary[];
  readonly capabilities: readonly Capability[];
  readonly orientation: Orientation;          // clear | held | stretched | consumed
  readonly wear: number;                       // chronicLoad scalar
  readonly wearDetail?: WearState;             // full detail, opt-in
  readonly selfModel?: SelfModel;              // present when witness has earned it
  readonly felt?: string;                      // present only if feltMode "prose"
}

interface DriveSummary {
  readonly id: string;
  readonly name: string;
  readonly tier: number;
  readonly level: number;
  readonly target: number;
  readonly pressure: number;     // raw weighted pressure — never dampened
  readonly chronic: boolean;     // currently in chronic state
}

interface PracticeSummary {
  readonly id: string;
  readonly name: string;
  readonly intent: string;
  readonly depth: number;            // derived
  readonly recentSubstrate: readonly Artifact[];
  readonly active: boolean;          // depth ≥ 0.1
}

interface MetabolizeOptions {
  readonly feltMode?: "off" | "prose";        // default "off"
  readonly voice?: VoiceModule;
  readonly substrateLimit?: number;            // per practice, default 5
  readonly includeSelfModel?: boolean;         // default: auto (witness depth ≥ 0.5)
  readonly includeWearDetail?: boolean;        // default false
}
```

The deliverable is the structured data. Felt prose is opt-in and pluggable via `VoiceModule.compose(situation)`.

## The lifecycle

A typical runtime cycle in the consuming framework:

```
tick(being, dtMs)
   ├── drives drift
   ├── wear updates (hysteresis + chronicLoad)
   ├── practice housekeeping (artifact eviction, wear-accelerated)
   ├── drive trajectory point recorded
   └── practice milestones recorded for any threshold crossings

integrate(being, input)
   ├── entry appended to history.recentEntries
   ├── drives satiated (matching bindings raise level)
   ├── practice triggers matched → PracticeAttempts recorded as pending
   └── pressuredChoice recorded if entry was an action under pressure

[framework evaluates each pending attempt]

resolveAttempt(being, id, { quality, accepted, content, ... })
   ├── if accepted, Artifact stored on the practice's substrate
   ├── practice milestone recorded if depth crosses a threshold
   └── attempt transitions to "resolved" or "rejected"

metabolize(being, options?)
   ├── pure read: computes pressures, derives depths, evaluates capabilities
   ├── auto-includes selfModel when witness depth ≥ 0.5
   └── composes felt prose only if feltMode "prose"

weightAttention(being, candidates)
availableCapabilities(being)
```

## Integration contracts

### What Embers needs from the framework

- A tick. Call `tick(being, dtMs)` on a regular cadence.
- Event/action notifications. Call `integrate(being, input)` when things happen.
- Evaluation. For each pending practice attempt, call `resolveAttempt(being, id, result)` — usually via `resolveAllPending(being, evaluator)`.

That's it.

### What Embers gives the framework

- `metabolize(being, options?)` → InnerSituation for prompts
- `weightAttention(being, candidates)` → weighted candidates for focus
- `availableCapabilities(being)` → capability list for resource allocation
- `getSelfModel(being)` → structured introspection (when earned)
- `describe(being)` → human-readable debug dump

### What Embers does NOT do

- Call models. Ever.
- Persist state. The library exposes `serializeBeing` / `deserializeBeing`; consumers choose storage.
- Make capabilities mean anything. Capability availability is data; the framework wires it to real resources.
- Decide quality. The framework supplies practice-attempt verdicts.

## Style & conventions

- Strict TypeScript throughout
- Pure functions where possible (`metabolize`, `weightAttention`, `availableCapabilities`, `getSelfModel`, `recentEntries`, etc.)
- Mutating functions clearly marked (`tick`, `integrate`, `resolveAttempt`, `expirePendingAttempts`)
- No reliance on wall-clock time — always `dtMs` or `elapsedMs`
- Domain vocabulary stays consistent: Drive, Practice, Capability, Subscription, Being, Wear, Substrate, Attempt
- No "agent" in library vocabulary — consumers have agents; we have beings

## Non-goals

- No rewards, no policies, no learning. The library is structural, not trained.
- No distributed state. A Being lives in one process.
- No multi-being dynamics in v0.2.
- No emotion model. Emotions emerge from drive × practice × wear state.
- No authoring UI. Authoring is TypeScript.
- No model abstraction.

## What's next

See [`ROADMAP.md`](ROADMAP.md).
