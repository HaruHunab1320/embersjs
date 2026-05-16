# Design Rationale

Why the library is shaped the way it is.

## The problem

Every AI framework ships the same implicit model of motivation: a system prompt. "You are X. You want Y. You should Z." This works — in the same way that a cardboard cutout of a person works. From a distance, at a glance, it's fine. Up close, over time, it falls apart.

The failure mode is coherence. A system-prompted being has no *inner state*. It doesn't get hungrier over time. It doesn't develop. It doesn't meet difficulty differently based on whether it has resources to draw on. Every interaction is a fresh draw from the same distribution, shaped only by the prompt and the context window.

This produces beings that are responsive but not motivated, capable but not developing, articulate but not coherent across time.

## The bet

Embers is a bet that **structural inner life produces more coherent, more interesting, and more humanly-recognizable behavior than instructional motivation**.

Specifically, the bet is that agents need:

1. **Persistent needs** that change over time and create real pressure.
2. **Cultivated capacities** that grow through verified engagement and shape what the being can bring to pressure (not whether pressure exists).
3. **Higher functions** that come and go with what the being can currently hold.
4. **A body of history** the being can draw on — its own experience, accumulated.

If this bet is right, a being with Embers produces qualitatively different behavior from one without. Five real-world Haunt simulations confirmed both that *some* of v0.1's design was right (drives create real behavioral pressure; tier domination produces visible shifts) and that *some* of it was drifted (practices were counters, drives could be dampened, depression couldn't happen). v0.2 corrects the drift.

## Why not rewards?

Reinforcement learning is the obvious alternative. Why not give agents reward signals and let them learn motivation?

Because rewards are externally imposed. A reward function says "this is what you should want." A drive says "this is what you *do* want, structurally, as a consequence of how you're built." The difference matters because it produces different failure modes: a reward-shaped agent optimizes; a drive-shaped agent *is*.

Embers is also not trying to solve "how do agents learn." It's trying to solve "what does an agent's inner architecture look like such that it produces coherent, recognizable behavior over time." Those are different problems. Learning is downstream of architecture.

## Why drives stay loud (v0.2)

v0.1 allowed practices to dampen drive pressure via a `dampen-drive-pressure` effect. This produced spiritual bypass as a code path: a being with deep gratitude practice would feel its hunger *less*, not feel its hunger more skillfully.

This was wrong. A human with deep gratitude practice is still hungry when they haven't eaten. The difference isn't that the hunger is quieter — it's that they have more inside them to bring to the hunger. Practice changes the resources brought *to* pressure; it does not subtract from pressure.

Worse: a being whose practice quieted all drives is engineered to never break. Engineered to never collapse, engineered to never need recovery, engineered to never have an arc. That's a stoic philosopher in marble, not a being.

So in v0.2: **drives stay loud forever**. Nothing in the library reduces felt pressure. Practices add what the being can bring; they do not subtract. This is also what makes collapse possible — chronic deprivation actually wears the being down, because nothing buffers it.

## Why practices are protocol + substrate

In v0.1, practices were `{ id, depth, decay, strengtheners, effects }`. Strengtheners matched event-types and incremented depth. This made practices indistinguishable from drives in terms of mechanism: both moved on event-type matches. The only conceptual difference was a label.

Worse, depth was unverified. A framework could call `integrate(being, { entry: { kind: "action", type: "honest-admission" } })` a thousand times and depth would grow each time — without any check that honest admission actually occurred. Practice was theater.

v0.2 reshapes practices around two ideas:

1. **A practice has a protocol** — a description of what cognitive engagement it represents (the `intent` string), what triggers attempts, what context the evaluator receives. The protocol is the *shape* of cultivation in code.

2. **A practice has substrate** — an accumulating body of artifacts produced by *evaluated* engagement. Depth is derived from substrate (quality × recency × pressure-bonus). No substrate, no depth.

When a trigger fires, no depth changes. The library records a `PracticeAttempt` with rich context. The framework — using whatever cognitive means it has — evaluates the attempt and returns a quality score plus an artifact. Embers stores the artifact. Depth grows because *the work happened*.

This is the v0.2 thesis condensed: **Embers signals, the framework cognizes, Embers integrates**.

## Why no LLM in the library

A library that calls models becomes a framework. We don't want to be a framework — we want to be the inner-architecture layer that frameworks have been missing. By keeping LLMs out of `src/`, we stay framework-agnostic and avoid coupling the library to any particular cognitive backend.

But the consequence is that the library cannot evaluate cognition itself. That's why the two-phase mechanic exists. We define the protocol; the framework supplies the cognition.

## Why wear is separate from orientation

Orientation describes the being's *current* pressure-vs-resources state — clear, held, stretched, or consumed. It's instantaneous.

Wear describes *chronic* structural state — how worn down the being is from sustained deprivation. It accumulates over time and decays through recovery.

These compose. A being can be currently `held` (acutely managing) while highly worn (vulnerable underneath). A being can be currently `consumed` (acute crisis) with low wear (resilient bedrock). The two together describe what the being is: present moment, structural history.

The collapse mechanic uses both. At `chronicLoad ≥ 0.6`, orientation is forced to `consumed` regardless of practice depth. A being who has been deprived for a long time cannot calmly proclaim peace, no matter how much practice depth they once had. That's the anti-stoic-marble rule. Practice depth is real, but it can erode under sustained pressure — and when it does, the being shows.

## Why history is load-bearing

In v0.1, history was recorded but never read. A being lonely for 1000 ticks was identical in code to one lonely for 1 tick. That's not how persistence works in humans. We *are* our history in some essential way; self-reflection draws on actual past experience.

In v0.2, history is the substrate of self-reflection. The practice attempt context includes recent experience, pressured choices, drive trajectory. The `SelfModel` (when witness has earned it) includes recurring patterns drawn from history. Time spent in a state shapes the being.

## What the library is and isn't

**It is** the inner-architecture layer between "you are a helpful assistant" and a being that actually wants something. The persistent state that makes an agent's behavior coherent across time.

**It isn't** a complete agent framework. It doesn't run; it computes state. It doesn't reason; it provides context for reasoning. It doesn't act; it tells you what's currently accessible.

**It isn't** a learned system. Drives are authored. Practices are authored. Capabilities are authored. The framework you wrap around it can do all the learning you want — Embers will tell it what state the agent is in.

**It isn't** a magic prompt-quality improvement. If your character isn't interesting, Embers won't make it interesting. If your framework isn't producing meaningful evaluations of practice attempts, depth won't accumulate meaningfully. The library is honest infrastructure; the texture comes from how you use it.

## The deepest rule

This library is attempting something philosophically specific: to design agents as **beings with genuine inner architecture** rather than instruction-shaped behavior patterns. Every design decision is checked against this. If a decision makes the library more generic but less coherent to its thesis, the thesis wins.

You're not building an agent framework. You're building the inner life that agent frameworks have been missing. Keep that frame, and the hard decisions get easier.
