# Motivation: the gap between feeling and wanting

Design record. Findings from a review of Embers against its own thesis —
intrinsic drives and motivations for autonomous agents.

Status: findings, not a plan. Nothing here is scheduled and no API is committed.

Companion documents in the Haunt repo, which shares this design cycle:
`docs/COGNITION.md` (the architecture), `docs/MEMORY-AND-FOLD.md` (the substrate).

---

## The diagnosis

**Embers modulates expression, not action.**

Trace what an unmet drive currently does, end to end:

1. It reorders perceptions by pressure (`weightPerceptions`) — attention.
2. It gates capabilities (`availableCapabilities`) — a real behavioral effect,
   and the strongest coupling in the system today.
3. It injects orientation guidance into the prompt — *"You feel stretched. Keep
   responses focused and brief."*

Steps 1 and 3 change how the agent *sounds*. Only step 2 changes what it can
*do*, and it does so by subtraction.

None of it makes the agent pursue anything.

## Why: satiation is receivable, not pursuable

The mechanism underneath the symptom.

```ts
satiatedBy: [{ matches: { kind: "event", type: "integrity-check" }, amount: 0.1 }]
```

A drive declares a pattern over **entries that arrive**. The drive is satisfied
when the world happens to deliver a matching event. Nothing in the declaration is
addressable by the agent: it cannot read `satiatedBy` and derive an action that
would satisfy it, because the pattern describes an *event shape*, not an
*affordance*.

So the agent is told how it feels. It is never told what it wants, and it has no
way to go and get it.

That is the entire distance between a homeostatic state model — which Embers is,
and is good at — and intrinsic motivation, which is what it claims.

It also reframes an earlier empirical result. A resident produced twelve
utterances and cultivated no practice depth. The evaluator was not too harsh;
the architecture never gave the character a reason to practice anything.

---

## The second defect: half-folded state

| | Storage | Consequence |
|---|---|---|
| **Practices** | `computeDepth(substrate, elapsedMs)` — depth is derived, never stored | Legible. Ask *why is depth here* and the substrate answers. |
| **Drives** | mutable `level`, mutated in place | Opaque. The number has no provenance. |
| **Wear** | `chronicLoad` accumulated in place | Opaque, same reason. |

The practices half was built right and behaves well. The drives half stores a
scalar and mutates it, which means a drive level cannot answer *why am I like
this* — there is no path from the number back to the events that produced it.

A character whose internal state has no derivation reads as arbitrary rather than
motivated, and it cannot be debugged, replayed, or explained.

**Drive level should be a fold** over satiation and drift events, exactly as
depth is a fold over artifacts. That is one shape for the whole library rather
than two, and it makes the whole inner state attributable.

### Consequence for the change-record spec

Drive levels are clamped to [0,1] with additive satiation and subtractive drift.
Near the bounds those operations do not commute: `+0.5` then `−0.3` and `−0.3`
then `+0.5` land in different places when starting near a boundary.

That is a live instance of the clamped non-commutativity question filed against
`CHANGE_RECORD_SPEC` — and Embers is a useful adversary for it precisely because
it arrived at the same problem without having seen the spec. Worth testing before
a v1.0 freeze, where the disposition is cheap; expensive after.

---

## The third defect: wear measures a gap that does not exist

`chronicLoad >= 0.6` forces orientation to `consumed` — the anti-stoic-marble
rule. The claim it encodes: under sustained load, the capacity for considered
response collapses into reaction.

That claim is right, and there is currently nothing for it to act on. There is no
"considered response" pathway that load can degrade — the host is reactive at
every load level. The wear system is instrumentation for an architecture that has
not been built.

This is a strong signal about ordering. Wear was designed against an intuition of
what an agent under pressure loses. The thing it expects to find is the gap.

---

## What is missing: the gap

The host runs `perceive(event) → action`. Sensation arrives, response comes out,
nothing between. An agent with no gap must answer whatever knocks; an agent
holding intentions can decline, because it is doing something else.

Embers is the natural home for the intention layer, because it already owns the
state that would populate it. Three requirements:

1. **Drives name pursuable satisfiers.** Alongside `satiatedBy` (what, arriving,
   would satisfy this), a drive needs the addressable form: *what could the agent
   do about this*, in terms of capabilities or affordances the host exposes.
   Without it there is nothing to form an intention from.
2. **Intentions persist and are folded.** A small revisable stack derived from a
   log of commitments and revisions — so that *when did it decide that, and on
   what basis* is answerable.
3. **Deliberation triggers on inner state.** "A drive crossed threshold" is a
   reason to think. Today only an arriving event is, which means the inner life
   can never initiate.

### Ordering, and it is not negotiable

> Build the gap before or alongside pursuable drives. Never after.

An agent with intrinsic motivation and no capacity to not-act on it is strictly
worse than a reactive one — the reactive one at least waits to be asked. Drives
are the interesting part and restraint reads like a later refinement, which is
exactly why this ordering inverts under its own momentum if it is not written
down.

---

## Valence

`Perception` (host side) carries confidence and no valence. Weighting by drive
pressure is **attention** — what to look at first. It is not **meaning**.

The same perception should land differently depending on inner state: a guest
arriving is relief to a lonely agent and an imposition to a depleted one. Today
it is the same input with different prose appended.

Valence is assigned relative to current drive state, which puts it at the seam
between the host's perception layer and Embers' drive state — the first place the
two must genuinely interlock rather than sit side by side.

Note where this sits in the causal chain: sensation is tagged pleasant or
unpleasant *before* deliberation, and that tagging is what a reactive agent
responds to. Valence is therefore not decoration on top of perception; it is the
input to the thing the gap exists to interrupt.

---

## Convergences worth recording

Two cases of this library independently arriving at math that exists elsewhere in
the ecosystem. Both strengthen the case that the shared abstraction is correct.

**Depth is a saturation curve.**

```
Embers:   depth = clamp01( Σ(quality × recency × pressureBonus) / 5 )
Kernel:   sample = min( weightSum / saturationRuns, 1 )
```

Embers' depth is the kernel's sample-sufficiency term with quality folded into
the weight and `saturationRuns = 5`. Both use a ~7-day half-life. The confidence
kernel's premise is that three systems re-derived its math; counting Embers it is
at least four.

**The substrate is a fold.** Depth as a pure function of a capacity-bounded,
recency-decayed artifact buffer is event-sourced state with a derived view — the
same primitive as the Fold, arrived at independently.

Neither observation argues for taking a dependency today. Both argue that the
shape is right.

---

## What Embers is good at, and should not lose

Stated because a findings document reads as a list of defects otherwise.

- **The two-phase practice mechanic.** `integrate()` records an attempt;
  `resolveAttempt()` requires a quality verdict from outside. Refusing to judge
  its own cultivation is the correct boundary and the thing that makes depth mean
  something.
- **Rejection as the detector.** Generous nomination plus strict adjudication has
  now appeared three times across this design cycle — practice attempts, sensor
  beliefs, memory formation. It looks like a primitive.
- **The substrate design.** Capacity-bounded, recency-decayed, derived. This is
  the memory model the rest of the system should adopt, not replace.
- **Wear and chronic collapse.** The model is right; it is waiting on the
  architecture it was designed against.

---

## Summary of findings

1. Drives modulate expression, not action. `satiatedBy` is receivable, not
   pursuable — the agent cannot derive an action that would satisfy it.
2. State is half-folded. Practices derive; drives and wear mutate in place and
   are therefore unattributable.
3. Clamped non-commutativity in drive levels is a live test case for the
   change-record spec, cheap to resolve before a freeze.
4. Wear measures the width of a gap that has not been built.
5. The gap — a place to stand between sensation and response — is the missing
   layer, and Embers is where it belongs.
6. Build the gap before pursuable drives, not after.
7. Perceptions need valence, assigned against drive state, at the host seam.
8. Depth is the confidence kernel's saturation term; the substrate is a fold.
   Both re-derived independently.
