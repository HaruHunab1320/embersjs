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

v0.3 adds that place. A drive under pressure **nominates** a candidate intention.
The framework **adjudicates** whether to commit. A committed intention persists,
is acted toward over many ticks, and terminates in a recorded way.

The principle is unchanged: **Embers signals. The framework cognizes. Embers
integrates.** Embers does not decide what a being should do, any more than it
decides whether a practice attempt was genuine.

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
| **a drive nominates an intention** | **the framework commits or declines** | **no commitment** |

Rejection is the detector, again. Most impulses should not become commitments —
and a being that commits to everything a drive suggests is not motivated, it is
compulsive.

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

/** A standing commitment to act. Not a plan, and not a goal. */
export interface Intention {
  id: string;
  /** What the being has committed to, in its own terms. Model-readable. */
  aim: string;
  /** The drive that nominated it. This is the attribution link. */
  sourceDriveId: string;
  /** What would discharge it. */
  satisfier: Satisfier;
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

### Intention state is a fold

Intentions are derived from a log, never mutated in place:

`intention.nominated` · `intention.committed` · `intention.declined` ·
`intention.acted` · `intention.ended`

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
drive pressure crosses threshold
  └─ Embers nominates a candidate intention (drive supplies aim + satisfier)
       └─ framework adjudicates                        ← THE GAP
            ├─ decline  → recorded, nothing else happens
            └─ commit   → intention persists
                 └─ framework acts toward it over many ticks
                      └─ ends: satisfied | abandoned | superseded | expired
```

Every terminal state is recorded with its reason. An intention that quietly
vanishes is a hole in the attribution chain, which is the one thing this design
cannot tolerate.

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
  aim: string;            // "tend the fire"
  satisfier: Satisfier;   // opaque token the host resolves
  threshold?: number;     // pressure above which this nominates; defaults per-drive
}>;
```

Optional, so existing beings are unaffected — a drive with no `pursuableBy` still
presses and still colors state, exactly as now. It simply never nominates.

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

**The failure mode to watch for:** intentions that only ever reach the prompt as
extra text. That reproduces the exact defect this document exists to correct. The
host-side test is whether a committed intention changes control flow — see the
roadmap; it must be able to suppress a deliberation, not merely describe itself
inside one.

---

## Open questions

1. **Who authors `aim`?** A drive-level string is static and will read as
   canned across a long run. A model-generated aim at nomination time is
   expressive and costs a call at the highest-frequency point in the system.
   Leaning static for the thin slice, with the field shaped so it can become
   dynamic without a migration.
2. **Should a satisfied intention feed the practice substrate?** Pursuing
   something under pressure and discharging it looks like cultivation. Deferred —
   it couples two systems that should be proven separately first.
3. **Expiry policy.** Age-based, attempt-based, or urgency-floor. Attempt-based
   is most honest (a commitment repeatedly failed should lapse) but needs the
   host to report attempts accurately.
