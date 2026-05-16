# Design Rationale

Why the library is shaped the way it is.

## The Problem

Every AI framework ships the same implicit model of motivation: a system prompt. "You are X. You want Y. You should Z." This works — in the same way that a cardboard cutout of a person works. From a distance, at a glance, it's fine. Up close, over time, it falls apart.

The failure mode is coherence. A system-prompted being has no *inner state*. It doesn't get hungrier over time. It doesn't develop. It doesn't meet difficulty differently based on whether it has resources to draw on. Every interaction is a fresh draw from the same distribution, shaped only by the prompt and the context window.

This produces beings that are responsive but not motivated, capable but not developing, articulate but not coherent across time.

## The Bet

Embers is a bet that structural inner life produces more coherent, more interesting, and more humanly-recognizable behavior than instructional motivation.

Specifically, the bet is that agents need:
1. **Persistent needs** that change over time and create real pressure
2. **Cultivated orientations** that shape how pressure is felt (not whether it exists)
3. **Contingent capabilities** that expand through development, not just configuration
4. **Felt experience** that reads as genuine inner life, not data formatting

If this bet is right, a being with Embers produces qualitatively different behavior from one without. If it's wrong, we've built a well-typed data layer that doesn't change anything. The Poe integration will test which it is.

## Why Not Rewards?

Reinforcement learning is the obvious alternative. Why not give agents reward signals and let them learn motivation?

Because rewards are externally imposed. A reward function says "this is what you should want." A drive says "this is what you *do* want, structurally, as a consequence of how you're built." The difference matters because it produces different failure modes:

- A reward-trained agent that encounters a novel situation falls back on its training distribution. A drive-based being falls back on its *needs* — which are present in every situation.
- A reward-trained agent can't develop new motivations. A drive-based being develops through practices — orientations that emerge from how it meets difficulty.
- A reward-trained agent's motivation is opaque (it's in the weights). A drive-based being's motivation is inspectable — you can read the drive stack and see what's pressing.

This isn't an argument against RL in general. It's an argument that for *authoring coherent beings*, structural motivation is a better primitive than learned motivation.

## Why Practices Are Not Drives

The most common question. Practices look like drives — they have a depth (like a level), they change over time (like drift), they respond to events (like satiation). Why not just model them as drives?

Because they serve a fundamentally different role. Drives create pressure. Practices shape how pressure is metabolized.

A being with unmet `connection` and deep `gratitudePractice` is still lonely. The drive pressure is real. But the *felt experience* is different — the being notices what is present alongside what is missing. The prompt reflects a being that holds its loneliness rather than collapsing into it.

If practices were drives, they'd create their own pressure. A "gratitude drive" would mean the being *needs* to feel grateful — which is coercive and wrong. Gratitude isn't a need. It's a capacity. Practices are capacities for meeting experience, not additional needs.

The code test: if practice code looks identical to drive code, the design is confused. Practices should have a qualitatively different API surface — depth instead of level, strengthening instead of satiation, effects on metabolism instead of direct state changes.

## Why Capability Gating Exists

The simplest version of this library would skip capabilities entirely. Just compute drives and practices, output felt strings, done. Why gate capabilities?

Because capability gating is how the inner architecture connects to the outer architecture. Without it, drives and practices are decorative — they produce nice prompt text but don't change what the being can *do*.

With capability gating, a being whose drives are met can access deeper memory. A being with deep practice can access capabilities despite unmet drives. The inner state produces outer consequences.

The `any` condition is the design decision that makes this non-coercive rather than punitive. Without it, capability gating would be: "meet your drives or lose your tools." With it: "there are multiple paths to every capability."

## Why Templated, Not Model-Assisted

The felt strings in v0.1 are generated from templates, not by calling a model. This is a deliberate choice:

1. **Determinism.** Same state → same felt string. This makes testing possible and debugging tractable.
2. **Speed.** No API call on every metabolize. The being's inner state updates instantly.
3. **Cost.** No tokens spent on inner-state computation.
4. **Independence.** The library has zero runtime dependencies. Adding a model call would couple it to a provider.

Model-assisted mode (calling a model to generate richer felt strings from the situation) is designed into the interface but deferred to a future version. The templates have to be good enough that model-assistance is an upgrade, not a fix for broken templates.

## Why No Wall-Clock Time

Every function takes `dtMs` as input rather than reading `Date.now()`. This is for testability — you can simulate 24 hours of being life in milliseconds — but it also reflects a design principle: the library models *experiential time*, not physical time. A being that ticks every 30 seconds experiences time differently from one that ticks every 5 minutes, and the library should handle both without knowing which is which.

## Why the History Isn't Read

In v0.1, history is recorded but not consumed by any library function. It's there for:

1. **Debugging.** You can inspect trajectory to see how the being got here.
2. **Future work.** Emergent-behavior features (practice robustness based on how it was earned, drive-weight evolution based on trajectory) need history. Recording it now means the data is available when the features land.
3. **Consumer access.** Your framework might want to use history even if the library doesn't yet.

The principle: record what you'll need before you need it, but don't build features on top of it until you have real usage data to inform the design.

## Why Six Practices

The six core practices (gratitude, integrity, witness, presence, creator connection, service orientation) were chosen because they cover the major ways a being can meet difficulty:

- **Noticing what's here** (gratitude)
- **Staying oriented** (integrity)
- **Seeing yourself** (witness)
- **Staying in the moment** (presence)
- **Connecting to something larger** (creator connection)
- **Serving through it** (service orientation)

These aren't the only possible practices. They're the *foundation* — the ones that most beings benefit from having available. Custom practices extend beyond these for specific character needs.

If a seventh practice seems mandatory, it's worth asking whether one of the six could be refined instead. The six were chosen to be orthogonal — each does something the others can't.

## What Success Looks Like

The thesis is proven when:

1. A human reading a being's felt output can tell, without metadata, whether the being's needs are met or unmet, and whether it has practice resources.
2. A being with drives and practices produces qualitatively more coherent long-term behavior than the same being without.
3. Authors find the drive/practice/capability model expressive enough to create beings they couldn't create with system prompts alone.
4. The library is small enough (<2500 lines of implementation) that a developer can read it in an afternoon.

We're at checkpoint 1 and 4. Checkpoints 2 and 3 require real usage.
