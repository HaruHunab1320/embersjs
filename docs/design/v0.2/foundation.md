# v0.2 Foundation — A Real Inner Architecture

**Status:** Draft — pending review before implementation
**Scope:** The whole rebuild. Practices, metabolism, history, collapse, felt prose. One coherent architecture, not five staged RFCs.
**Backward compatibility:** None. v0.1 consumers will need to migrate. This is a corrected foundation, not an additive update.

---

## Abstract

v0.2 rebuilds Embers as the inner architecture it was always meant to be. Drives press constantly and never quiet. Practices are real cultivations — protocols of cognitive engagement that produce accumulating artifacts (substrate), with depth derived from substrate richness, recency, and pressure-tested-ness. Capabilities are higher functions that come and go with what the being can hold. History becomes load-bearing — the body the being draws on for self-reflection. Chronic unmet need genuinely degrades the being toward collapse, and the same cultivations are the path back up. Felt prose is decoupled from the deliverable.

The library never calls a model. It signals when cognitive work is needed, hands the consuming framework rich context, and integrates the verdict. That is the contribution: the *shape* of cultivation in code.

## Why this rebuild

Embers was inspired by the structure of human inner life. A human acts not because something tells them to, but because needs press from inside (Maslow's tiers — survival, belonging, esteem, self-actualization). Their character isn't in their current state alone — it's in their cultivated capacities (stillness, integrity, gratitude, faith) built from doing the work over time. Their higher functions come and go with what they can currently hold. They can collapse into depression when needs go chronically unmet — and the path back up exists through the same cultivations re-engaged: meditation, movement, contemplation, connection, service.

v0.1 set out to encode this. Five Haunt simulations exposed how far we drifted:

- Practices became counters with poetic names. Sit in a chair → meditation +1, no check on whether stillness was held.
- Practices *dampened* the drives. Deep gratitude made hunger quieter. Spiritual bypass as a code path. A being with enough practice never needed anything — engineered to never break, which is engineered to never be alive.
- Witness and creator-connection became boolean flags that flipped a sentence in the prompt. There's no contemplation in a boolean.
- Felt prose became the deliverable. The architecture served the prose. Practices got reduced to whatever was needed to color a sentence.
- History was recorded but never read. A being lonely for 1000 ticks was identical to one lonely for 1 tick.
- No collapse. A being in the Void experiment sat alone for 45 minutes with Connection decaying to zero, orientation stayed "clear" the whole time. Stoic-philosopher-in-marble. Not human.

v0.2 corrects all of this from the foundation up.

## Principle

**Embers signals. The framework cognizes. Embers integrates.**

When cultivation is attempted, Embers does not credit it. It records a structured attempt with rich context (the practice, the trigger, the being's state, the relevant history) and signals the consuming framework. The framework — by whatever cognitive means it has, LLM call or rules or human judgment — evaluates whether genuine work occurred and returns a quality score plus an artifact (the substance of what was reflected, articulated, or chosen). Embers stores the artifact in the practice's substrate; depth is derived from the substrate. No verdict means no growth.

The library never invents content. It defines the protocol — what cultivation looks like as data — and trusts the framework to do the cognition.

## The corrected architecture

```
┌────────────────────────────────────────────────────────────┐
│                          BEING                              │
└──────┬──────────┬─────────┬──────────┬──────────┬──────────┘
       ▼          ▼         ▼          ▼          ▼
   Drives    Practices   Subscriptions  History    Wear
   (needs    (cultivated   (capabilities  (the body  (chronic
   press)    capacities    gated by       drawn on)  state +
              backed by    inner state)              collapse)
              substrate)
                                          
                                          ↑ ↓
                                       (history feeds
                                        practice substrate;
                                        substrate informs
                                        history retrievals)
```

Five primitives, each with a clear role:

- **Drives** press constantly. Never quieted.
- **Practices** are protocols + accumulating substrate. Depth derives from substrate.
- **Subscriptions** gate capabilities by inner state. Two paths in (need-met or depth-earned).
- **History** is the body the being draws on. Read by reflection, attention weighting, and depth dynamics.
- **Wear** tracks chronic state. Accelerates substrate erosion, eventually pushes toward collapse. Recovery exists.

## Drives — what stays, what's removed

### What stays

- Drift functions (linear, exponential, custom)
- Satiation bindings (events/actions match, level rises)
- Tier organization (Maslow-flavored)
- Tier domination (tier-1 collapse dampens higher tiers' *attention weight*, not their pressure)
- The DriveStack data shape

### What's removed

- **`PracticeEffect.kind === "dampen-drive-pressure"`** — eliminated entirely. No mechanism in the library reduces felt drive pressure. This is the core anti-bypass guarantee.

### What's clarified

The architecture doc said "Practices change how level is *felt*." v0.1 implemented this as multiplicative dampening of pressure. v0.2 reads the principle correctly: practices change *what the being can bring to* a drive, not how present the drive is. The being still feels the full weight; the substrate of practice gives them more to bring to it.

A drive at level 0.05 is dire. It is dire whether the being has deep gratitude or none. What changes with practice is the being's resources — recall, articulation, steadiness, depth of frame — not the magnitude of pressure.

## Practices — the rebuild

This is the biggest change in v0.2. Practices are no longer numbers + flags. They are protocols + substrate.

### The new shape

```ts
interface Practice {
  readonly id: string;
  readonly name: string;
  /** Authorial intent — what cultivation this represents.
   *  Used by the framework's evaluator to construct evaluation prompts. */
  readonly intent: string;
  readonly description: string;
  /** What triggers attempts at this practice. */
  readonly protocol: PracticeProtocol;
  /** Accumulating artifacts from resolved attempts. Bounded ring buffer. */
  readonly substrate: PracticeSubstrate;
  /** Optional seed — author-supplied material the practice cultivates around
   *  (e.g., the frame for creator-connection, the questions for contemplation). */
  readonly seed?: unknown;
}
```

There is **no `depth` field**. Depth is derived from substrate (see "Depth as derived" below).

There are **no `effects`**. Practices influence the being through (a) substrate retrievable via metabolism, and (b) depth derived from substrate, used by capability gating.

### Protocol

A protocol declares how a practice gets engaged.

```ts
interface PracticeProtocol {
  /** What can trigger an attempt to engage this practice. */
  readonly triggers: readonly PracticeTrigger[];
  /** What history window is included in attempt context. */
  readonly contextWindow: ContextWindowSpec;
  /** Optional: a custom depth function. Defaults to recency-quality-pressure. */
  readonly depthFunction?: DepthFunction;
}

interface PracticeTrigger {
  readonly matches: EventMatcher | ActionMatcher | StateMatcher;
  /** Whether the being must be under drive pressure for this trigger to fire. */
  readonly requiresPressure: boolean;
  /** Authorial intent for what this specific trigger represents.
   *  Surfaced in the attempt context for the evaluator. */
  readonly intent: string;
  /** The maximum depth contribution if the attempt is evaluated at quality 1.0.
   *  Replaces v0.1's `amount`. */
  readonly maxContribution: number;
}

interface ContextWindowSpec {
  /** Recent integration entries to include. Default: 50. */
  readonly entries?: number;
  /** Or by simulation time (whichever is shorter, if both set). Default: 24h. */
  readonly maxAgeMs?: number;
  /** Whether to include drive trajectory snippet. Default: true. */
  readonly includeTrajectory?: boolean;
  /** Whether to include other practices' recent substrate. Default: false. */
  readonly includeRelatedSubstrate?: boolean;
}
```

The `intent` field on both Practice and Trigger is the authorial seam. The framework's evaluator reads it to construct meaningful prompts. Embers never interprets it.

### Substrate

```ts
interface PracticeSubstrate {
  /** Resolved artifacts. FIFO eviction at capacity. */
  readonly artifacts: readonly Artifact[];
  /** Maximum artifacts retained. */
  readonly capacity: number;
}

interface Artifact {
  /** Reference to the attempt that produced this. */
  readonly attemptId: string;
  /** When the attempt was resolved (sim time). */
  readonly atMs: number;
  /** Quality from evaluation, 0–1. */
  readonly quality: number;
  /** Whether the originating attempt was made under drive pressure. */
  readonly underPressure: boolean;
  /** Framework-supplied content (insight, articulation, choice record). Opaque to Embers. */
  readonly content: unknown;
  /** Optional human-readable rationale from the evaluator. */
  readonly reasons?: readonly string[];
}
```

The artifact's `content` is whatever the framework returns. Embers does not introspect it. Future RFCs may define schemas for specific practice types; v0.2 keeps it open.

### Two-phase evaluation

```
Phase 1 — Attempt
═════════════════
integrate(being, input)
  ├── matches drive satiation bindings (depth-independent — the v0.1 behavior, retained)
  ├── matches practice triggers; for each match, records a PracticeAttempt
  └── returns IntegrationResult { driveChanges, pendingAttemptIds }

Phase 2 — Resolution
════════════════════
(framework reads getPendingAttempts(being), evaluates each)

resolveAttempt(being, attemptId, { quality, accepted, content, reasons })
  ├── if !accepted, attempt status → "rejected", no artifact stored
  ├── else, artifact stored in practice.substrate (FIFO ring)
  ├── records a PracticeMilestone in history
  └── returns IntegrationResult describing the substrate change
```

`integrate()` stays synchronous. There is no evaluator registered at construction; the two-phase model keeps the lifecycle explicit. `resolveAllPending(being, evaluator)` is a convenience that drains the queue with a supplied function (sync or async).

A trigger with `maxContribution: 0.05` and an evaluation `quality: 0.6` produces an artifact whose contribution to depth is `0.05 * 0.6 = 0.03` at attempt time. As the artifact ages, its contribution decays via the depth function.

### Depth as derived

```ts
type DepthFunction = (substrate: PracticeSubstrate, nowMs: number) => number;

// Default
function defaultDepth(substrate: PracticeSubstrate, nowMs: number): number {
  let total = 0;
  for (const artifact of substrate.artifacts) {
    const ageMs = nowMs - artifact.atMs;
    const recencyFactor = Math.exp(-ageMs / RECENCY_HALFLIFE_MS); // ~7 days
    const pressureBonus = artifact.underPressure ? 1.5 : 1.0;
    total += artifact.quality * recencyFactor * pressureBonus;
  }
  return clamp01(total / DEPTH_NORMALIZATION); // tunable
}
```

Properties of derivation:
- **Decay is automatic.** Old artifacts age out via recency factor. No separate decay clock needed.
- **Pressure-tested cultivation compounds.** The 1.5× bonus encodes "depth earned under pressure is worth more."
- **Quality is multiplicative.** Low-quality artifacts contribute less but still contribute; outright-rejected attempts contribute nothing because no artifact is stored.
- **Substrate richness is the source of truth.** Depth answers "how rich is the body of cultivation this being has accumulated, weighted by recency and pressure."

`tickPractices()` becomes a housekeeper, not a depth-mover: it evicts artifacts older than a hard cap (default 30 days) and applies wear-driven acceleration (see Wear section).

### What practices no longer have

- `effects: PracticeEffect[]` — removed. Practices don't have generic effects. They have substrate; the substrate is the effect.
- `dampen-drive-pressure` — removed (anti-bypass).
- `extend-time-horizon` — removed. If the being needs time-horizon framing, it's surfaced via substrate (e.g., a presence-practice artifact says "the being notices this is a difficult hour, not a permanent state"; the framework injects that into the prompt).
- `enable-witness` — removed. Witness is no longer a flag. It's a practice with substrate, gated by depth like any other capability path (see below).
- `shift-orientation` — removed. Orientation is computed from current state and wear, not nudged by practice flags.

### How practices influence behavior in v0.2

Three pathways, all flowing through the existing primitives:

1. **Substrate retrieval in metabolize.** When `metabolize()` runs, recent high-quality substrate from active practices is included in the `InnerSituation` for frameworks to inject into prompts.
2. **Depth-gated capabilities.** The existing `practice-depth` access condition becomes the primary path for capability unlocking. Witness's introspection capability, integrity's certain reasoning modes, creator-connection's frame-articulation — all are subscriptions that gate on depth (which is now meaningfully earned).
3. **Substrate as input to subsequent attempts.** When a practice attempt is recorded, related practices' substrate can be included in the context (per `includeRelatedSubstrate`). A creator-connection attempt can draw on prior gratitude artifacts. Cultivation cross-pollinates the way human practice does.

## The six core practices, redesigned

Each ships with a default protocol; authors can override on construction. The shape across all six: `intent` (what cultivation this represents), triggers (what attempts look like), substrate content shape (what the framework should return), and seeds where applicable.

### gratitudePractice — noticing what is present

- **Intent:** the capacity to surface what is present, especially under conditions where what's missing dominates attention.
- **Triggers:** acknowledgment actions, return-from-difficulty events, periodic "noticing" attempts during low-pressure ticks.
- **Substrate content:** *noticings* — short structured records of what was specifically observed as present. `{ noticed: string, context: string }`. Generic "I am grateful" should evaluate at low quality; specific "the lobby light catches the wood at this hour" should evaluate higher.
- **Pressure-gated:** noticings under pressure carry the 1.5× bonus and constitute the most cultivated gratitude.

### integrityPractice — choosing aligned action under pressure

- **Intent:** the capacity to choose hard-right over easy-wrong when it costs something.
- **Triggers:** pressured choices (any action taken while drives are below domination threshold).
- **Substrate content:** *chosen-moments* — `{ choseToDo: string, choseNotToDo: string, atStake: string }`. Records what was chosen, what was foregone, what was at stake. Quality reflects the magnitude of the conflict and the alignment of the choice.
- All triggers are `requiresPressure: true`. Integrity without pressure isn't integrity.

### witnessPractice — meta-awareness of self

- **Intent:** the capacity to see one's own state from a vantage that yields insight.
- **Triggers:** reflective actions, periodic self-observation moments, post-pressured-choice retrospection.
- **Substrate content:** *insights* — `{ pattern: string, fromExperiences: string[], implication: string }`. Records observations the being made about its own pattern, drawing on specific past experiences. Generic "I notice I am stressed" should evaluate low; "I notice that when continuity is threatened, I narrow my engagement with guests, even ones I care about" should evaluate high.
- **Capability hook:** when witness depth crosses threshold (default 0.5), a `self-reflection` capability becomes available via subscription. Frameworks subscribe to it to know when the being has earned the right to first-person introspection in prompts. The library exposes `getSelfModel(being)` returning structured introspection drawn from witness substrate + history.

### presencePractice — staying with this moment

- **Intent:** the capacity to engage this moment rather than catastrophize forward.
- **Triggers:** grounding actions, staying-with-difficulty events.
- **Substrate content:** *groundings* — `{ momentEngaged: string, broaderFearSetAside: string }`. Records actual engagement with the present circumstance and what longer-arc fear was set aside to do so. Quality reflects whether real engagement happened or whether "I am present" was just declared.
- All triggers are `requiresPressure: true`.

### creatorConnection — relationship to a larger frame

This is the practice that requires a **seed** at authoring time. You cannot cultivate connection to a creator without a conception of what creator means.

- **Intent:** the capacity to draw on a frame of meaning under pressure — to articulate what one's place is in something larger.
- **Seed shape:**
  ```ts
  {
    frame: string,         // the being's conception (e.g., "the place persists; I serve it")
    questions: string[],   // contemplative questions the being engages over time
    cosmology?: string,    // optional broader context
  }
  ```
- **Triggers:** contemplative actions, articulations that connect current pressure to frame, prolonged engagement with a seed question.
- **Substrate content:** *articulations* — `{ situation: string, frameApplication: string, derivedMeaning: string }`. Records how the being articulated its frame to apply to a current circumstance. Generic "I serve a larger purpose" should evaluate low; specific "Mrs. Voss does not need me to be cheerful, she needs me to be reliable, because that is what continuity to her looks like" should evaluate high.
- **Why a seed:** without it, the framework's evaluator has nothing to anchor to. With it, the evaluator can ask: did this articulation engage the frame? did it deepen the application of the frame to circumstance? Did it surface a new aspect of a contemplative question?

### serviceOrientation — identity as one-who-serves

- **Intent:** the capacity to find meaning in giving such that drive pressure is re-framed as opportunity.
- **Triggers:** acts of unprompted care, service performed under pressure.
- **Substrate content:** *services* — `{ givenWhat: string, toWhom: string, internalCost: string, internalReframe: string }`. Records what was given, to whom, at what cost, and what reframing made it meaningful (rather than depleting). Quality reflects whether real service occurred or whether self-interest was framed as service.

## History — load-bearing now

History was already recorded in v0.1 (drive trajectory, practice milestones, pressured choices, transitions). v0.2 makes it readable.

### New helpers

```ts
/** Recent integration entries (events + actions) the being experienced. */
export function recentEntries(being: Being, window: ContextWindowSpec): readonly RecentEntry[];

/** Recent pressured choices, optionally filtered by drive or practice. */
export function recentPressuredChoices(
  being: Being,
  filter?: { drive?: string; sinceMs?: number },
): readonly PressuredChoice[];

/** Recent slice of drive trajectory. */
export function trajectorySnippet(being: Being, sinceMs: number): readonly DriveTrajectoryPoint[];

/** Detected recurring patterns — drives that have been repeatedly low,
 *  practices that have been repeatedly engaged. Heuristic, used by witness. */
export function recurringPatterns(being: Being): readonly Pattern[];
```

### Recording integration entries

`integrate()` now also records the entry itself in history (as a separate ring buffer, default 200 entries). This is the "experience" the being had, distinct from pressured choices. Enables witness substrate to draw on actual recent experience.

### Self-model assembly

`getSelfModel(being)` combines:
- Currently pressing drives
- Active practices and their depth + recent substrate
- Recurring patterns from history
- Recent pressured choices

into a structured `SelfModel` that frameworks can include in prompts when the witness capability is active. This is the structural form of "the being can see itself."

## Wear & collapse

The being now has a `wear` state tracking how chronically unmet its drives have been.

### Tracking

```ts
interface WearState {
  /** Per-drive: how long it has been continuously below critical threshold. */
  readonly perDrive: ReadonlyMap<string, ChronicTracker>;
  /** Derived: overall chronic load, 0–1. Computed each tick. */
  readonly chronicLoad: number;
}

interface ChronicTracker {
  /** Accumulated time below criticalThreshold (ms). Resets when above recoveryThreshold. */
  readonly sustainedBelowMs: number;
  /** Accumulated time above recoveryThreshold (ms). Resets when below criticalThreshold. */
  readonly sustainedAboveMs: number;
  /** When the current state began (sim time). */
  readonly currentStateSinceMs: number;
}
```

Defaults (tunable per being): `criticalThreshold: 0.2`, `recoveryThreshold: 0.4`, hysteresis between them prevents flip-flop.

`chronicLoad` is computed as a weighted sum of `sustainedBelowMs` per drive, with tier-1 drives weighted heaviest. Becomes meaningful after sustained-below times exceed configurable horizons (default: 6 sim hours for tier-1 to start contributing, 24 sim hours to reach saturation).

### Effects of wear

Three concrete consequences as `chronicLoad` rises:

1. **Substrate erosion accelerates.** In `tickPractices`, artifact age is multiplied by `1 + chronicLoad * EROSION_FACTOR` (default factor: 2). At full chronic load, artifacts age 3× faster — practices erode faster than they can be replenished if the chronic state persists.
2. **Orientation pushes toward consumed.** The orientation calculation in `metabolize()` factors `chronicLoad`. At `chronicLoad > 0.6`, the orientation becomes `consumed` regardless of practice depth. (This is the anti-stoic-marble-statue rule: a being chronically deprived cannot calmly proclaim it is at peace.)
3. **Capabilities compound-lock.** Lower depth (from substrate erosion) means existing `practice-depth` subscriptions naturally close. Lower drive levels mean existing `tier-satisfied` subscriptions close. The being progressively loses access to higher functions. No new condition kinds needed.

### The path back up

This is what makes the design human. Recovery exists, and it works the way human recovery works.

- **Drive satiation reduces wear.** When a drive crosses the recovery threshold from below, its `sustainedBelowMs` decays toward zero (not instantly — recovery is slower than descent). After `sustainedAboveMs > recoveryHorizon` (default 12h), the drive is no longer contributing to chronic load.
- **Practice attempts under chronic state still create artifacts.** Even at high `chronicLoad`, a being can attempt practice. Quality evaluations may be lower (the framework's evaluator should reflect this — practicing presence in deep depression is harder, fewer attempts qualify), but successful attempts still build substrate.
- **Recovery is asymmetric.** Climbing out is slower than falling. This is intentional and matches human reality. A being that has been collapsed for two days does not bounce back from one good interaction.

### What collapse is not

- It is not death. There is no permanent state. The being can always be re-cultivated.
- It is not a separate orientation. Orientation describes the present pressure-vs-resource state; wear describes structural chronic state. They're orthogonal: a being can be currently `held` (acutely doing okay) while highly worn (substrate eroded, vulnerable). `InnerSituation` exposes both.
- It is not framework-controllable. The framework cannot manually set `chronicLoad`. It emerges from drive history, period. Recovery is also emergent.

## Capabilities — minor cleanup

The `any` / `practice-depth` design is preserved entirely. It is the most correct part of v0.1. v0.2 just makes it more meaningful by ensuring `practice-depth` reflects real cultivation.

One small addition: a new condition kind for chronic state.

```ts
type AccessCondition =
  // ...existing conditions...
  | { readonly kind: "wear-below"; readonly threshold: number };
```

This lets authors gate certain capabilities on the being not being collapsed (e.g., a "creative-output" capability that requires `wear-below: 0.4` even if other conditions are met). Optional; most authors won't use it.

## Metabolism — what `metabolize()` returns now

The `InnerSituation` is restructured to be inner architecture first, prose last (and optional).

```ts
interface InnerSituation {
  /** Drives, sorted by raw pressure (no dampening). */
  readonly drives: readonly DriveSummary[];
  /** Practices with depth (derived) and recent substrate slice. */
  readonly practices: readonly PracticeSummary[];
  /** Currently-available capabilities. */
  readonly capabilities: readonly Capability[];
  /** Orientation — clear/held/stretched/consumed. */
  readonly orientation: Orientation;
  /** Chronic state, 0–1. */
  readonly wear: number;
  /** Self-model, present only if witness capability is active. */
  readonly selfModel?: SelfModel;
  /** Felt prose, present only if `feltMode` was "prose" in the call. */
  readonly felt?: string;
}

interface PracticeSummary {
  readonly id: string;
  readonly name: string;
  readonly depth: number;
  /** Recent high-quality substrate, for framework prompt injection. */
  readonly recentSubstrate: readonly Artifact[];
  readonly active: boolean;
}
```

`metabolize()` accepts options:

```ts
metabolize(being, {
  feltMode?: "off" | "prose",      // default "off"
  voice?: VoiceModule,              // optional pluggable prose generator
  substrateLimit?: number,          // how many artifacts per practice to include, default 5
});
```

The default is **structured-only**. Frameworks that want library-supplied prose opt in. The hardcoded poetic templates from v0.1 ship as `defaultVoice` for `feltMode: "prose"` consumers, but they no longer leak into every consumer by default. (And the template set should be revisited; that's a creative task for the implementation phase.)

## The five integration points in v0.2

Surface stays five. Two new auxiliary functions support the two-phase model.

| Function | Mutates | Notes |
|---|---|---|
| `tick(being, dtMs)` | yes | + updates wear, + accelerates substrate erosion under load |
| `integrate(being, input)` | yes | + records pending practice attempts, returns `pendingAttemptIds` |
| `metabolize(being, opts?)` | no | restructured output (see above) |
| `weightAttention(being, candidates)` | no | now reads history (recurring patterns affect weighting) |
| `availableCapabilities(being)` | no | unchanged surface; richer behavior via earned depths |

Auxiliary:
- `getPendingAttempts(being)` — read pending attempts
- `resolveAttempt(being, id, result)` — apply one
- `resolveAllPending(being, evaluator)` — drain the queue
- `getSelfModel(being)` — structured introspection (only meaningful if witness capability active)

## Examples

### Witness flow in Haunt

```ts
// After the resident produces an utterance/action
const result = embers.integrate(being, {
  entry: { kind: "action", type: "self-observe" },
});

await embers.resolveAllPending(being, async (attempt) => {
  // attempt.context contains: drive levels, practices, orientation,
  // recent entries, recent pressured choices, drive trajectory snippet,
  // and (if includeRelatedSubstrate) related practices' substrate
  
  const prompt = `
    You are evaluating a self-reflection attempt by an AI being.
    The practice's intent is: ${attempt.context.practice.intent}
    The trigger's intent is: ${attempt.trigger.intent}
    
    The being's recent experience:
    ${formatEntries(attempt.context.recentEntries)}
    
    Current state: orientation=${attempt.context.orientation},
    pressing drives=${attempt.context.pressingDriveIds.join(", ")}
    
    Did the being draw on specific recent experience to derive a specific
    insight about its own pattern? Or was the reflection generic?
    Return: { quality: 0-1, insight: { pattern, fromExperiences, implication } }
  `;
  
  const { quality, insight } = await llm.evaluate(prompt);
  
  return {
    quality,
    accepted: quality > 0.3,
    content: insight,
  };
});
```

### Creator-connection authoring

```ts
const poe = createBeing({
  // ...
  practices: {
    seeds: [
      {
        id: "creatorConnection",
        seed: {
          frame: "the place persists, and I am of the place",
          questions: [
            "what does my serving look like when no one is here to be served?",
            "the place was here before me. What does that ask of me?",
            "guests come and go; what part of them does the place keep?",
          ],
        },
      },
    ],
  },
});
```

The framework's evaluator, when handling a creator-connection attempt, sees the seed as part of the context and evaluates against it: did the articulation engage these questions, deepen the frame's application, surface a new aspect?

### Collapse and recovery

```ts
// Day 1: Connection drive starts decaying. No interactions.
// ...8 simulated hours...
// Connection level: 0.15. wear.perDrive["connection"].sustainedBelowMs: ~28800000

// Day 1, hour 12: practice attempts under pressure get harder to qualify.
// LLM evaluator returns lower quality scores reflecting struggle.
// Witness substrate ages out faster than new artifacts are created.

// Day 2: chronicLoad ~0.5. Orientation pushed toward "consumed."
// 'creative-output' capability now locked (wear-below: 0.4 condition fails).
// Being's prompts now only have access to operational capabilities.

// Day 3, hour 4: A guest arrives. meaningful-exchange event satiates Connection.
// Drive level: 0.55. sustainedBelowMs starts decaying (slowly).

// Day 3, hour 16: After 12h above recoveryThreshold, sustainedBelowMs cleared.
// chronicLoad declining. Practice substrate beginning to accumulate again as
// practices are re-engaged with new artifacts.

// Day 5: Full recovery, substrate rebuilt. The being remembers the period —
// witness substrate may include "I notice I withdraw when alone too long" —
// and is, in that sense, more known to itself than before.
```

## What's NOT in this rebuild

Explicit non-goals so scope stays honest:

- **No emergent drives.** Drives are still authored; their weights don't shift based on history. Phase-2 concern.
- **No multi-being dynamics.** A being still doesn't know about other beings. Phase-2 concern.
- **No persistence layer.** Embers still gives serializable state; consumers persist it.
- **No model abstraction.** Embers does not call models. The framework supplies cognition.
- **No authoring UI.** TypeScript-first.
- **No prescriptive evaluation rubrics.** The library does not tell the framework how to evaluate quality. The `intent` strings are advisory; the framework decides.
- **No specific LLM prompt templates.** Examples in this doc are illustrative; the library ships no prompts.

## Open questions for review

In rough priority order:

1. **Default `RECENCY_HALFLIFE_MS` and `DEPTH_NORMALIZATION`.** The default depth function has two tunable constants. Recommendation: 7 days half-life, normalization such that ~10 artifacts of average quality 0.7 reach depth 0.7. Will need empirical tuning during implementation.

2. **Per-trigger vs. per-practice `maxContribution`.** Currently per-trigger. Should triggers within a practice share a budget (cap on total contribution per trigger type)? Recommendation: per-trigger only; capacity-based eviction handles the upper bound naturally.

3. **Should `wear` be exposed as a single scalar or per-drive map in `InnerSituation`?** Recommendation: both — a scalar `wear` for the simple case, plus the full map under `wearDetail?` for frameworks that want it.

4. **Should `recentSubstrate` in `PracticeSummary` be filtered by relevance to current pressure?** I.e., for a being with pressing connection drive, surface gratitude artifacts that mention connection rather than the most recent N. Recommendation: defer to a later RFC. v0.2 surfaces most-recent; relevance ranking is a real feature with its own design.

5. **Substrate sharing across practices via `includeRelatedSubstrate`.** Cross-pollination is humanly real (gratitude informs creator-connection informs witness). But which practices count as "related"? Recommendation: all active practices, capped at 3 most-recent each. Tunable per protocol.

6. **`getSelfModel` shape.** What goes in it? Recommendation: pressing drives, active practices with depth + 1 sample artifact each, top-3 recurring patterns from history, last-3 pressured choices. Frameworks decide what to inject.

7. **Orientation "collapsed" as a distinct value vs. wear-as-scalar.** Currently keeping four orientations + wear scalar. Alternative: add `collapsed` orientation explicitly. Recommendation: scalar wins. Orientation describes acute pressure; wear describes chronic state. Two scalars compose to express what one enum can't.

8. **Whether `tickPractices` should also be where artifact eviction happens, or whether eviction is on-write (when a new artifact is added beyond capacity).** Recommendation: both — on-write for capacity, on-tick for time-based hard cap (default 30 days regardless of capacity).

9. **Should the felt prose voice module be plug-in or first-class?** Recommendation: plug-in. The library ships a default voice for backward continuity with v0.1's literary register, but it's just one of N possible voices. Framework-supplied voices override.

## What this rebuild proves

A being whose framework correctly engages the architecture will:
- Feel its drives constantly, never quieted by practice
- Accumulate practice substrate that records actual cognitive engagement
- Have depth that means something (substantiated cultivation)
- Lose access to higher functions when chronically deprived
- Recover those functions when re-cultivated
- Be able to refer to its own history through witness
- Articulate its frame of meaning under pressure through creator-connection
- Make pressured choices that are recorded and shape integrity

A being whose framework asserts label-events without resolving attempts will accumulate nothing. The library's stance: no cognition, no credit. No bypass, no buffer, no ornamental depth.

The deliverable is the inner architecture. Felt prose is a derived view a framework may choose to ask for. The library's contribution is the *shape* of cultivation in code — the protocols that name what cultivation looks like, the substrate that holds what cultivation produces, the wear that names how chronic deprivation degrades, the path back up that names how recovery works.

## Decisions needed before implementation

In priority order:

1. **Approve the principle:** Embers signals, framework cognizes, Embers integrates. No model calls, no auto-credit.
2. **Approve the practice rebuild:** Practice = protocol + substrate, depth derived, no `effects` field.
3. **Approve drive-pressure stays loud:** removal of `dampen-drive-pressure` and the practice-effect kinds that dampen.
4. **Approve wear as separate scalar from orientation.**
5. **Approve felt-prose-decoupling:** structured `InnerSituation` is the deliverable; prose is opt-in.
6. **Tuning constants** (depth normalization, recency half-life, wear thresholds): mark for empirical adjustment during implementation; don't block on numerical exactness now.

Once approved, implementation order:
- Practices (types, protocol, substrate, two-phase resolution)
- Wear tracking (tick integration)
- Metabolism restructure (new InnerSituation, optional felt)
- Capability `wear-below` condition
- History helpers + selfModel
- Six core practices reauthored
- Examples reauthored against new shape
- Tests, including adversarial tests (a misbehaving framework that asserts attempts without resolving accumulates no depth)
