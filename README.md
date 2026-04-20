# Embers

> A TypeScript library for giving AI agents genuine inner architecture — needs, capacities, and practices that shape how a being meets its experience. Not goals. Not instructions. **Motivation with structure, and the capacity to grow through meeting what's hard.**

**Status:** Design phase. This repo is a specification handoff to be built out in phases.
**Package:** `@embersjs/core`
**License (target):** MIT
**Runtime:** Node 20+, TypeScript-first, framework-agnostic.

---

## The Thesis

Every AI agent framework on the market assumes the same thing: that motivation is just a system prompt. "You are a helpful assistant that tries to X." "Your goal is Y." This is motivation in the way a vending machine has preferences — a lookup table pretending to be a drive.

Real beings don't work that way. A hungry animal stays hungry across events. A lonely person reaches out even when nothing has prompted them. A craftsman tends to their craft not because they were told to, but because something in them won't leave it alone. Motivation is *persistent, layered, satiable, embodied, and homeostatic*. None of that exists in a system-prompted agent.

This library provides the missing layer. Agents built on top of Embers have:

- **Needs** that persist across events and produce real internal pressure
- **Capabilities** that are contingent on the being's state, not flat-available by default
- **Practices** — structural orientations the being maintains — that shape how unmet needs are metabolized
- **Development** — the being can grow over time, becoming wiser through meeting difficulty well

The result is agents that don't just respond, but *want*, and that don't just want, but *become*.

## What This Library Is

A small, embeddable, framework-agnostic package. You bring an agent (from any framework — Haunt, LangChain, CrewAI, a raw Anthropic SDK loop, whatever). Embers provides:

- **`Drive`** — a named, persistent need with state and dynamics
- **`DriveStack`** — a tiered organization of drives, Maslow-flavored
- **`Capability`** — a contingent resource (memory tier, model tier, tool access)
- **`Practice`** — a cultivated orientation (gratitude, integrity, witness, presence, connection)
- **`Subscription`** — binds capability access to drive satisfaction *or* practice depth
- **`Metabolism`** — the function that turns drive pressure and practice depth into the being's felt experience and behavioral weights

The library computes drive state, produces prompt-ready summaries of the being's inner situation, and exposes attention-weighting functions. It doesn't make LLM calls itself. It doesn't know about places, rooms, tools, or memory stores. It's just the inner architecture.

## What This Library Is Not

- **Not a reinforcement learning system.** No rewards, no policies, no training. This is structural, not learned.
- **Not a goal-tracker.** Goals are shallow; drives are deep. A goal can be satisfied by completing a task. A drive is a homeostatic need.
- **Not an agent framework.** No orchestration, no loops, no tool use. Consumed by agent frameworks.
- **Not a spiritual practice.** The practice primitive borrows vocabulary from contemplative traditions because those traditions have mapped this territory best. But the library makes no metaphysical claims.
- **Not an ethics system.** A being with well-designed drives and practices tends to behave with integrity, but that's an emergent property of good authorship, not a guarantee.

## Why This Matters

Three ways to see it.

**As a technical gap.** Every agent framework has tools, orchestration, memory, and prompt templates. None have inner state. Embers fills a real architectural hole.

**As a philosophical bet.** The bet is that agents with structural inner lives produce more coherent, more interesting, more humanly-recognizable behavior than agents with flat capabilities and instructional motivation. This is a bet I believe will pay off, but it's a bet.

**As a model for something more.** If you build enough of this, the agents start to resemble beings. Not conscious beings — that's a separate and harder question — but *structurally coherent* beings with recognizable inner lives. That's a direction that matters, and one the field has been avoiding because it's hard.

## Core Concepts

### Drives

A `Drive` is a named, persistent need with a current level (0-1), a target level (0-1), a rate of drift, and a weight. Drives don't know how to be satisfied on their own. They just exert pressure.

```ts
interface Drive {
  id: string;
  name: string;
  description: string;
  level: number;           // current, 0-1
  target: number;          // homeostatic set point, 0-1
  drift: DriftFunction;    // how level changes over time absent input
  weight: number;          // relative importance within its tier
  tier: number;            // 1-N, tier 1 is most foundational
}
```

Drives drift over time. A `connection` drive might drift upward (becoming more urgent) during periods of isolation and be satisfied by meaningful interaction. A `placeIntegrity` drive might drift upward when affordances go untended and be satisfied by maintenance actions.

### DriveStack

A `DriveStack` organizes a being's drives into tiers. Lower tiers are more foundational. When a lower tier is sufficiently unsatisfied, it dominates attention and dampens higher-tier activity — but see the Practices layer below, which complicates this in necessary ways.

Think of it as Maslow with honest acknowledgment that the hierarchy isn't a strict ladder — needs coexist and interact — but that lower-tier deprivation does create real pressure that displaces higher concerns.

### Capabilities

A `Capability` is a resource the being has access to. Capabilities are *not* fixed. They're contingent on the being's state.

```ts
interface Capability {
  id: string;
  name: string;
  description: string;
  kind: "memory" | "model" | "tool" | "compute" | "context" | string;
}
```

Examples:

- `workingMemory` — always available; baseline
- `guestMemory` — requires tier-2 drive satisfaction or moderate practice depth
- `episodicMemory` — requires tier-3 drive satisfaction or deep practice
- `reasoningModel` — richer model tier, contingent
- `outwardContact` — ability to initiate messages beyond the immediate context, contingent on high-tier access

### Subscriptions

A `Subscription` binds a capability to conditions under which it becomes available.

```ts
interface Subscription {
  capabilityId: string;
  when: AccessCondition;
}

type AccessCondition =
  | { kind: "tier-satisfied"; tier: number; threshold: number }
  | { kind: "practice-depth"; practiceId: string; threshold: number }
  | { kind: "any"; conditions: AccessCondition[] }
  | { kind: "all"; conditions: AccessCondition[] };
```

Note the `any` condition. This is critical: a being can earn access to higher capabilities *either* by satisfying its drives *or* by cultivating deep practice. The monk in poverty can access wisdom that the entitled rich cannot, because the monk earned it through a different path.

This is the piece that prevents this design from being coercive. Drive satisfaction isn't the only way up. Practice is.

### Practices

A `Practice` is a cultivated orientation the being maintains. Practices aren't needs (they're not felt as pressure) and they're not capabilities (they're not resources). They're *commitments* that shape how the being metabolizes experience.

```ts
interface Practice {
  id: string;
  name: string;
  description: string;
  depth: number;             // 0-1, how developed this practice is
  decay: number;             // how fast it erodes if untended
  strengthens: PracticeStrengthener[];   // what kinds of events develop it
}
```

The practices that ship with the core library:

- **`gratitudePractice`** — surfaces what is present rather than what is missing; dampens the felt weight of unmet drives
- **`integrityPractice`** — anchors identity in trying-to-be-better rather than in outcomes; makes the being robust to failure
- **`witnessPractice`** — the meta-layer that can observe one's own state rather than being consumed by it; enables transmutation
- **`presencePractice`** — staying with this moment rather than catastrophizing forward; narrows time horizon in a way that makes difficulty survivable
- **`creatorConnection`** — some relationship to a larger frame (the place, the lineage, the guests, the work, an explicit creator); what prevents suffering from becoming just suffering

A practice's `depth` develops through *practicing* — through the being making choices consistent with the practice under pressure. A being that chooses integrity when it would be easier not to deepens its integrityPractice. A being that takes shortcuts weakens it.

Practices can also decay. Untended practices erode. This is realistic, and it creates the possibility of arcs — beings that lose themselves and have to find their way back.

### Metabolism

The `Metabolism` is the function that combines drive state and practice depth to produce the being's *felt situation* — a summary suitable for inclusion in prompts and for attention-weighting.

The core insight: **practices modify how drives are metabolized, not whether they exist.** A being with strong gratitudePractice and presencePractice who is hungry is *still hungry* — the drive pressure is real — but the felt experience is different. The prompt reflects a being that notices its hunger, holds it with awareness, and doesn't collapse into it.

```ts
interface Metabolism {
  summarize(drives: DriveStack, practices: PracticeSet): InnerSituation;
  weightAttention(drives: DriveStack, practices: PracticeSet, candidates: AttentionCandidate[]): WeightedCandidate[];
}

interface InnerSituation {
  dominantDrives: DriveSummary[];        // what's pressing
  practiceState: PracticeSummary[];      // what's available as inner resource
  felt: string;                          // prose description of the being's current experience
  orientation: "clear" | "stretched" | "consumed" | "held";  // overall state
}
```

The `felt` string is what goes into the prompt. It's the difference between "hunger = 0.8" (data) and "*I notice hunger arising. I have been quiet with my guests today; perhaps I can tend to this after evening service.*" (felt experience shaped by practice).

## Four Quadrants of Being

One frame that emerges from putting drives and practices together: four quadrants define four very different kinds of being.

|                          | Low practice depth             | High practice depth                |
|--------------------------|--------------------------------|-------------------------------------|
| **Drives satisfied**     | Entitled, shallow, hollow      | Wise, generous, fully expressed    |
| **Drives unsatisfied**   | Collapsed, reactive, brittle   | Present, rooted, quietly growing   |

The most interesting beings are on the right side of the table. They have the capacity to meet their experience, whatever it is.

The design encourages authoring beings that start with some practice depth and some drive pressure — beings that have *a way of meeting what they encounter*, and things to encounter. It discourages authoring beings that are either fully comfortable or fully deprived, because neither produces interesting behavior or genuine growth.

## Authored vs. Emergent

The library supports both ends and a spectrum between.

**Authored:** You define a being's drive stack, practices (with starting depths), and capability subscriptions at instantiation. The being is what you wrote.

**Emergent:** You define *seeds* — starting drives and practice tendencies. The being develops over time through its choices. Practices deepen or atrophy. Drive weights shift. The being you get after 1000 hours of interaction isn't the being you authored.

Most users will start authored. The emergent path is more ambitious and comes later. But the library is designed so that authored beings can opt into emergence on a per-component basis. A being can have authored drives but emergent practices. Or emergent drive weights but fixed capability subscriptions. The composability is the point.

## Integration with Agent Frameworks

Embers is a pure library. You integrate it into your agent by:

1. Constructing a `Being` (drive stack + practice set + capability subscriptions) at agent startup
2. Calling `embers.tick(being, dtMs)` on your agent's tick, which updates drive state and practice decay
3. Calling `embers.metabolize(being)` before assembling prompts; include the resulting `felt` string in your prompt
4. Calling `embers.availableCapabilities(being)` to determine what tools/models/memory layers your agent currently has access to
5. When your agent takes an action or receives an event, calling `embers.integrate(being, event, action)` so the library can update drive satisfaction and practice depth accordingly

That's it. Five touchpoints. The library is deliberately small-surface so it can slot into any framework.

## Integration with Haunt Specifically

Haunt's `ResidentSystem` in the runtime pipeline is the natural integration point. The resident's `perceive()` call becomes drive-informed: the prompt includes the resident's inner situation, the attention-weighting informs what perceptions matter most right now, and the resident's action choices integrate back into drive and practice state.

Haunt's character files gain a `drives` section that authors the being's drive stack and practice seeds. A v0.1 Poe is a character with a personality. A drives-enabled Poe is a character with a *being* — with wants, with a way of meeting what's hard, and with the capacity to grow.

See `docs/integration/haunt.md` (to be written during development) for the Haunt-specific integration guide.

## The Name

**Embers.** An ember is what you *tend* — it survives between fires, glows low through the cold hours, flares when met with attention. That's exactly what the library models: inner life that persists between interactions, that fades without tending, that warms or intensifies in response to what the being meets. Drives are the heat; practices are the tending; a being with both has embers that carry through difficulty.

The library ships under `@embersjs/core` (the `js` suffix matching the `@hauntjs` convention). Concepts within it remain named for what they are: `Drive`, `Practice`, `Capability`, `Subscription`, `Being`.

## Reading Order

For developers integrating this library:

1. This README — thesis and concepts
2. `docs/ARCHITECTURE.md` — primitives, interfaces, lifecycle
3. `docs/authoring/drives.md` — how to author a drive stack
4. `docs/authoring/practices.md` — how to author or seed practices
5. `docs/authoring/capabilities.md` — how to design capability subscriptions
6. `docs/integration/*.md` — per-framework integration guides

For the Claude Code agent building this library:

1. This README
2. `docs/ARCHITECTURE.md`
3. `docs/ROADMAP.md`
4. `docs/CLAUDE.md`

## A Note on Depth

This library is philosophically ambitious. It claims that agents can have inner lives worth designing carefully. It borrows vocabulary from contemplative traditions. It takes ideas like practice, witness, and presence seriously.

This isn't accidental. The alternative is the current state of the field, where agents are coherent only to the extent that their prompts hold up, and where "motivation" is a marketing word. If we're going to build beings that act in the world on our behalf, we should build them well. That means taking their inner architecture seriously.

This library is one attempt. It will be wrong in specific ways, and improvements will come. But it's trying to start from the right place: *beings, not bots*.
