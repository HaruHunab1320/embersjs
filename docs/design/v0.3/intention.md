# v0.3 — Intention, and the gap

**Status:** Draft — pending review before implementation. No API is committed.
**Scope:** One primitive (intention) and one refactor (fold the drive state that
explains it). Deliberately narrow.
**Backward compatibility:** Additive for intentions. The drive-state refactor is
behavior-preserving by construction and must be proven so by golden tests.

Findings this responds to: [`../motivation.md`](../motivation.md).
Host-side plan: `hauntjs/docs/PHASE-3-ROADMAP.md`.

---

## Abstract

v0.2 gave a being an inner life it could feel. It cannot yet want anything.

A drive presses, and the only thing that happens is that prose changes. There is
no place in the architecture where pressure becomes a commitment, and therefore
no place where a being can be *doing something* — which is the precondition for
both acting unprompted and declining to react.

v0.3 adds that place, as **three states rather than two**:

| State | What it does | Exists in v0.2? |
|---|---|---|
| **Latent** | Pressure biases attention, gates capabilities, colors tone. Never articulated. | **Yes** |
| **Surfaced** | The impulse becomes an object the being can consider. It acquires an `aim`. | No |
| **Committed** | Taken up as a standing intention, acted toward, terminated in a recorded way. | No |

This is a correction to an earlier finding. "Drives modulate expression, not
action" identified a real defect, but misdiagnosed it: modulation is not the
error. Latent pressure shaping behavior without being articulated is the lower
layer working correctly, and v0.2 already implements it. The error is that
nothing sits above it.

So v0.3 **adds one layer, not two**, and preserves existing drive behavior rather
than replacing it. That is a considerably safer refactor than a design which
turns modulation into commitment.

The principle is unchanged: **Embers signals. The framework cognizes. Embers
integrates.** Embers does not decide what a being should do, any more than it
decides whether a practice attempt was genuine.

### A note on naming

The states are `latent`, `surfaced` and `committed` — never "unconscious" or
"conscious." The mechanical words say the same thing without smuggling in a claim
about phenomenology, and this is precisely the place where the discipline rule in
`hauntjs/docs/COGNITION.md` would otherwise be violated: a concept kept for how
it sounds rather than for the mechanism it names.

---

## The gap is an adjudication stage

The reactive shape is `stimulus → action`. Nothing sits between, so whatever
arrives determines what happens.

The corrected shape inserts one stage:

```
stimulus → candidate → adjudication → action | nothing
```

This is the fourth appearance of the same pattern in this codebase, and the
repetition is the argument for it being a primitive rather than a coincidence:

| Nomination | Adjudication | Rejection means |
|---|---|---|
| `integrate()` records a practice attempt | framework scores quality | no artifact, no depth |
| a sensor emits an observation | the fold derives belief | no belief |
| an event might warrant a memory | the write path judges | no memory formed |
| **a surfaced impulse** | **the framework commits or declines** | **no commitment** |

Rejection is the detector, again. Most impulses should not become commitments —
and a being that commits to everything that surfaces is not motivated, it is
compulsive.

Note that with three states there are now **two** filters, not one, and they
reject for different reasons. Most latent pressure never surfaces at all; of what
surfaces, most is declined. A being whose every pressure both surfaces and
commits has no interior — everything it feels immediately becomes something it is
doing.

---

## The primitive

```ts
/**
 * Opaque to Embers. The being knows it wants something and holds a token for
 * it; the framework knows what the token means and how to act on it.
 *
 * Same boundary as PracticeAttemptResult: Embers refuses to interpret.
 */
export interface Satisfier {
  /** Host-defined category, e.g. "affordance" | "capability" | "movement". */
  kind: string;
  /** Host-resolvable reference. Embers never parses this. */
  ref: string;
  params?: Record<string, unknown>;
}

/** Why a latent pressure became available for consideration. */
export type SurfacingTrigger =
  | { kind: "coincidence"; note: string }  // the satisfier appeared in perception
  | { kind: "quiet" }                       // nothing was demanding attention
  | { kind: "threshold" };                  // pressure alone was sufficient

/**
 * A latent pressure that has become an object the being can consider.
 * Not yet a commitment — the being has noticed it wants something.
 */
export interface SurfacedCandidate {
  id: string;
  /** The drive it arose from. The attribution link. */
  sourceDriveId: string;
  /** What would discharge it. Constitutional — the drive owns this. */
  satisfier: Satisfier;
  /**
   * What the being takes itself to want, in its own words.
   *
   * Authored by the framework at the moment of surfacing, not declared on the
   * drive. Putting words to pressure is the cognitive act that surfacing *is*.
   */
  aim: string;
  surfacedAtMs: number;
  trigger: SurfacingTrigger;
}

/** A standing commitment to act. Not a plan, and not a goal. */
export interface Intention {
  id: string;
  /** Carried from the candidate this was committed from. */
  aim: string;
  sourceDriveId: string;
  satisfier: Satisfier;
  /** The candidate this came from, so the surfacing reason stays reachable. */
  fromCandidateId: string;
  formedAtMs: number;
  /** Actions taken toward it so far. Feeds urgency decay. */
  attempts: number;
}

export type IntentionEnd =
  | { kind: "satisfied" }
  | { kind: "abandoned"; reason: string }
  | { kind: "superseded"; byIntentionId: string }
  | { kind: "expired" };
```

### Why a commitment, not a plan or a goal

A **plan** is a step sequence. It is brittle — the world moves and the sequence
is stale, and repairing plans is a research problem.

A **goal** is a desired world state. It is too abstract to act from; something
still has to derive what to do about it.

A **commitment** is "I am going to do this, because of that." It survives the
world changing, it is directly actionable, and it carries its own reason. That
last property is what makes a being legible: every action traces to a commitment,
every commitment traces to a drive, every drive level traces to events.

Poe does not plan the evening. He is committed to the fire being lit.

### Urgency is folded, never stored

There is no `urgency` field. It is computed on read:

```
urgency(intention, being, now) = f(
  pressure of sourceDrive now,   // not at formation
  age,
  attempts                        // repeated failure should decay a commitment
)
```

Freezing urgency at formation produces stale commitments — a being still doggedly
pursuing something whose drive was satisfied ten minutes ago by other means. That
is the same defect as storing depth instead of deriving it, and this library
already knows better.

### Who authors what

The split that resolves the authorship question:

| | Owner | Why |
|---|---|---|
| **Satisfier** | the drive, statically | Constitutional. A being does not choose that food is what fixes hunger. |
| **Aim** | the framework, at surfacing | Articulating pressure is a cognitive act, and the only one in this design that warrants a model call. |

Two consequences worth naming.

**The model call is cheap because surfacing is rare.** Authoring an aim at every
threshold crossing would be ruinous; authoring one when something surfaces is
not. It also removes the canned-aim problem — aims are written in context rather
than declared once in a config, so they vary with the situation that produced
them.

**The articulation can be wrong, for free.** The framework names what the being
takes itself to want; the drive owns what would actually discharge the pressure.
When those diverge, the being pursues its satisfier, the pressure does not drop,
and it has misidentified its own want. Nothing needs to be built for this — it
falls out of splitting authorship, and it is among the most lifelike behaviors
the design can produce.

### Intention state is a fold

Intentions are derived from a log, never mutated in place:

`intention.surfaced` · `intention.committed` · `intention.declined` ·
`intention.acted` · `intention.ended`

Latent pressure is deliberately **not** logged. It is continuous, and it is
already derivable from drive level — a log entry per tick per drive would be
noise that buys nothing.

Current intentions are the fold of that log. This buys the property the whole
design exists for: *when did it decide that, and on what basis* is answerable by
construction, not by logging discipline.

### A set, not a stack

Earlier framing said "stack," which implies push/pop and nesting — plan-shaped.
Commitments are not nested. A being can hold several at once and act on whichever
is most urgent right now. Order is derived from urgency, not from arrival.

**Thin-slice cap: at most 3 committed intentions.** Not a principled number — a
guard against the first version quietly becoming a planner.

---

## Lifecycle

```
LATENT — drive presses continuously
  │  biases attention, gates capabilities, colors tone
  │  (v0.2 behavior, unchanged, and most pressure never leaves this state)
  │
  └─ a surfacing trigger fires
       └─ framework authors an aim               ← THE ARTICULATION
            │
       SURFACED — the being has noticed it wants something
            │
            └─ framework adjudicates             ← THE GAP
                 ├─ decline → recorded, being returns to acting from latent pressure
                 └─ commit
                      │
                 COMMITTED — a standing intention
                      └─ acted toward over many ticks
                           └─ ends: satisfied | abandoned | superseded | expired
```

Every terminal state is recorded with its reason. An intention that quietly
vanishes is a hole in the attribution chain, which is the one thing this design
cannot tolerate.

A decline is not a failure state. The being goes on being shaped by the pressure
— it simply is not *pursuing* it. That distinction is the whole point of having
three states instead of two.

## What makes a pressure surface

Embers signals that a pressure is eligible to surface; it does not author the
aim. Three triggers, in the order they are worth building.

**Perceptual coincidence.** The satisfier appears in what the being is currently
perceiving — the fire is visibly dying, and *that* is when tending it becomes
thinkable. Grounded, cheap, and a better match for how attention actually works
than a threshold is. The host detects this, since only the host knows what a
satisfier refers to.

**Quiet.** Nothing is demanding attention. This is the condition under which
things surface unbidden, and it is exactly the Empty Room scenario — a being
alone with nothing arriving is a being with room to notice what it wants.

**Threshold.** Pressure alone is sufficient. Simple, and the least interesting,
because it makes surfacing deterministic and proportional to pressure. Worth
having as a floor so that severe unmet need always eventually surfaces.

### The extension worth naming now

**Witness practice should raise the surfacing rate.** Self-observation is, quite
literally, how much of one's own motivation is visible — so witness depth
modulating the probability that latent pressure surfaces is not a metaphor, it is
the mechanism the practice already claims to be.

This would give practice depth its first behavioral consequence. Under v0.2 a
being cultivated witness for twelve utterances and nothing changed but tone,
which is the finding that opened this design cycle.

**Deferred from the thin slice** — it couples practices to intentions, and both
should be proven alone first. It is the first extension to reach for once they
are.

### Adjudication should be two-tier

This fires far more often than practice evaluation, so cost matters.

**Rule tier** — no model call. Decline when: the satisfier does not resolve to an
available action; an existing commitment has strictly higher urgency and the same
source drive; the same intention was declined recently and nothing has changed.

**Model tier** — only when the rule tier is genuinely uncertain. Same shape as
`createPracticeEvaluator`, and the same discipline applies: default to declining,
and make sure declining is reachable. An adjudicator that commits to everything is
the reactive architecture with extra latency.

---

## What drives must gain

Today a drive declares only what, *arriving*, would satisfy it:

```ts
satiatedBy: [{ matches: { kind: "event", type: "integrity-check" }, amount: 0.1 }]
```

This is receivable, not pursuable. Nothing in it is addressable by the being.

v0.3 adds the addressable form:

```ts
pursuableBy?: Array<{
  /** Opaque token the host resolves. Constitutional — not authored per-instance. */
  satisfier: Satisfier;
  /** Pressure above which this is eligible to surface. Defaults per-drive. */
  threshold?: number;
  /**
   * Optional context for whoever authors the aim. NOT the aim itself —
   * a static aim string is what this design exists to avoid.
   */
  hint?: string;
}>;
```

Optional, so existing beings are unaffected — a drive with no `pursuableBy` still
presses and still colors state, exactly as now. It simply stays latent forever,
which is the correct default and describes most drives most of the time.

---

## The drive-state refactor

Drive level becomes a fold over satiation and drift events rather than a mutated
scalar, for one reason: **the attribution chain is only as good as its weakest
hop.** "Why did it do that" → an intention → a drive at 0.3 → *dead end* is not
legibility, and it is the state we are in today.

Constraints:

- **Behavior-preserving.** Golden tests pin current drive trajectories first; the
  refactor must reproduce them. Any divergence is a bug, not an improvement.
- **Wear folds too.** `chronicLoad` has the same defect for the same reason.
- **Clamped non-commutativity is now load-bearing.** Levels are clamped to [0,1]
  with additive satiation and subtractive drift; near the bounds those do not
  commute. Ordering within a fold step must be defined explicitly rather than
  left to arrival order. See the finding filed against `CHANGE_RECORD_SPEC` —
  this is the same problem and should be settled once.

---

## Non-goals

- **A planner.** No step sequences, no subgoals, no means-ends reasoning.
- **Valence on perception.** A refinement of *what* triggers deliberation, not of
  *whether a gap exists*. Next cycle.
- **Full pursuable-drive modelling.** One optional field, minimal shape.
- **Memory consolidation changes.** Separate concern, later.
- **Intention learning.** Nothing adapts thresholds from outcomes yet. The data
  to do so later is recorded from day one.
- **Witness coupled to surfacing.** Named in full above because it is the first
  extension worth building, and explicitly out of this slice because it couples
  two unproven systems.

---

## Risks

**This is the highest-risk design decision in the current cycle.** Everything
downstream reads the intention model, so getting the shape wrong is expensive.
Mitigations:

- Ship it against **one drive, one intention, one room**, so the first version is
  cheap to discard.
- Keep the satisfier opaque. If Embers never interprets it, the host can change
  its mind about what actions are without a library change.
- Record declines as richly as commits. If the adjudicator is wrong, the evidence
  of *how* it was wrong should already be in the log.

**Surfacing rate is the parameter most likely to be wrong first.** Too high and
the being narrates every passing pressure, which is the interior-free failure
above. Too low and it never wants anything and the layer looks broken when it is
merely quiet. This wants to be instrumented and tunable from the first run rather
than discovered by reading transcripts — log surfacings per hour alongside
commits and declines.

**The failure mode to watch for:** intentions that only ever reach the prompt as
extra text. That reproduces the exact defect this document exists to correct. The
host-side test is whether a committed intention changes control flow — see the
roadmap; it must be able to suppress a deliberation, not merely describe itself
inside one.

---

## Open questions

1. ~~**Who authors `aim`?**~~ **Settled.** The drive owns the satisfier; the
   framework authors the aim at surfacing. The cost objection dissolved once
   surfacing became a distinct, rare state rather than a synonym for threshold
   crossing.
2. **Should a satisfied intention feed the practice substrate?** Pursuing
   something under pressure and discharging it looks like cultivation. Deferred —
   it couples two systems that should be proven separately first. Note that the
   witness-raises-surfacing extension is the *reverse* coupling, and is the more
   promising of the two.
3. **Expiry policy.** Age-based, attempt-based, or urgency-floor. Attempt-based
   is most honest (a commitment repeatedly failed should lapse) but needs the
   host to report attempts accurately.
4. **Should surfaced-but-declined candidates be remembered?** A being that
   declines the same impulse repeatedly is exhibiting something — either good
   judgment or avoidance, and the two look identical from one instance. The rule
   tier already needs recent declines to avoid re-adjudicating; whether that
   history should be legible to the being itself is a different question.
