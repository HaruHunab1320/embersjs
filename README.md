# Embers

> A TypeScript library for giving AI beings genuine inner architecture — needs, capacities, and practices that shape how a being meets its experience. Not goals. Not instructions. **Motivation with structure, and the capacity to grow through meeting what's hard.**

**Status:** v0.1.0
**Package:** `@embersjs/core`
**License:** MIT
**Runtime:** Node 20+, TypeScript-first, framework-agnostic.

---

## Quick Start

```bash
npm install @embersjs/core
```

```ts
import {
  createBeing,
  tick,
  integrate,
  metabolize,
  availableCapabilities,
} from "@embersjs/core";

// 1. Define a being
const being = createBeing({
  id: "keeper",
  name: "The Keeper",
  drives: {
    tierCount: 2,
    drives: [
      {
        id: "continuity",
        name: "Continuity",
        description: "The need to persist and remain intact.",
        tier: 1,
        weight: 0.9,
        initialLevel: 0.8,
        target: 0.9,
        drift: { kind: "linear", ratePerHour: -0.02 },
        satiatedBy: [
          { matches: { kind: "event", type: "health-check" }, amount: 0.15 },
        ],
      },
      {
        id: "connection",
        name: "Connection",
        description: "The need for genuine contact.",
        tier: 2,
        weight: 0.7,
        initialLevel: 0.5,
        target: 0.6,
        drift: { kind: "linear", ratePerHour: -0.03 },
        satiatedBy: [
          { matches: { kind: "event", type: "conversation" }, amount: 0.2 },
        ],
      },
    ],
  },
  practices: {
    seeds: [{ id: "gratitudePractice", initialDepth: 0.3 }],
  },
  subscriptions: [
    { capabilityId: "memory", when: { kind: "always" } },
  ],
  capabilities: [
    { id: "memory", name: "Memory", description: "Working memory.", kind: "memory" },
  ],
});

// 2. On your runtime tick
tick(being, 60_000); // advance 1 minute

// 3. When something happens
integrate(being, {
  entry: { kind: "event", type: "conversation" },
});

// 4. Before assembling a prompt
const situation = metabolize(being);
console.log(situation.felt);
// → "Things are quiet, and I am quiet with them."
console.log(situation.orientation);
// → "clear"

// 5. What resources are available right now?
const caps = availableCapabilities(being);
// → [{ id: "memory", name: "Memory", ... }]
```

That's the full integration surface. Five functions. The library computes inner state; your framework decides what to do with it.

---

## The Thesis

Every AI framework assumes motivation is a system prompt. "You are a helpful assistant that tries to X." This is motivation in the way a vending machine has preferences — a lookup table pretending to be a drive.

Real beings don't work that way. A hungry animal stays hungry across events. A lonely person reaches out even when nothing has prompted them. Motivation is *persistent, layered, satiable, and homeostatic*. None of that exists in a system-prompted being.

Embers provides the missing layer:

- **Drives** that persist across events and produce real internal pressure
- **Practices** — cultivated orientations that shape how pressure is *felt*, not whether it exists
- **Capabilities** that are contingent on the being's state, unlockable through drive satisfaction *or* practice depth
- **Metabolism** that turns all of this into prose a being can include in its prompt — not a status report, but a *felt experience*

The result: beings that don't just respond, but *want*, and that don't just want, but *become*.

## Core Concepts

### Drives

A `Drive` is a named, persistent need with a current satisfaction level (0–1), a homeostatic target, a rate of drift, and a weight. Drives don't know how to be satisfied. They just exert pressure.

```ts
{
  id: "connection",
  name: "Connection",
  description: "The need for genuine contact.",
  tier: 2,
  weight: 0.7,
  initialLevel: 0.5,
  target: 0.6,
  drift: { kind: "linear", ratePerHour: -0.03 },
  satiatedBy: [
    { matches: { kind: "event", type: "conversation" }, amount: 0.2 },
  ],
}
```

A drive's `level` is *satisfaction* (1 = fully met, 0 = dire). Drives drift over time — usually downward, requiring tending. When a matching event or action occurs, the drive's level increases by the satiation amount.

Drives are organized in a **DriveStack** with tiers (1 = most foundational). When a lower-tier drive is deeply unmet, it dampens the felt weight of higher-tier drives — Maslow's insight, structurally encoded.

### Practices

A `Practice` is a cultivated orientation the being maintains. Practices aren't needs (no pressure) and aren't capabilities (no resources). They're commitments that shape how the being *metabolizes* experience.

Key properties:
- **Develop through chosen practice under pressure.** A `requiresPressure: true` strengthener only fires when the being is under drive pressure. Choosing integrity when it's easy doesn't develop integrityPractice.
- **Decay if untended.** A being that stops practicing loses depth.
- **Modify metabolism, not drives.** A practice never changes a drive's level. It changes how that level is *felt*.

Six core practices ship with the library:

| Practice | What it does | How it develops |
|----------|-------------|-----------------|
| **Gratitude** | Dampens felt weight of unmet drives (up to 30%) | Acts of acknowledgment, noticing positive state |
| **Integrity** | Shifts orientation toward "held"; robust to failure | Hard-right-over-easy-wrong choices *under pressure* |
| **Witness** | Enables first-person self-reference in felt output | Reflective actions, self-observation |
| **Presence** | Extends time horizon (crisis becomes "this difficult hour") | Grounding *under pressure* |
| **Creator Connection** | Prevents suffering from becoming isolated | Connection to purpose, serving a larger frame |
| **Service Orientation** | Re-frames pressure around what it allows the being to give | Acts of care, especially unprompted |

Authors can define custom practices beyond these six.

### Capabilities & Subscriptions

A `Capability` is a resource the being may have access to (memory tier, model tier, tool, compute budget). Capabilities are *contingent* — gated by `Subscription` conditions.

```ts
{
  capabilityId: "episodicMemory",
  when: {
    kind: "any",
    conditions: [
      { kind: "tier-satisfied", tier: 3, threshold: 0.6 },
      { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.7 },
    ],
  },
}
```

The `any` composite is what prevents coercion. A being can earn access through drive satisfaction *or* practice depth. The monk in poverty accesses wisdom the entitled rich cannot, because the monk earned it through a different path.

### Metabolism & Felt Strings

`metabolize(being)` produces an `InnerSituation` — the being's felt inner experience, ready for inclusion in a prompt.

The `felt` string is the core output. It's shaped by both drive state and practice depth across four quadrants:

| | Low practice | High practice |
|---|---|---|
| **Drives satisfied** | *"Things are quiet, and I am quiet with them."* | *"Things are quiet, and I am quiet with them. I can see my own stillness, which makes it steadier."* |
| **Drives unsatisfied** | *"Continuity. It is all I can think about. I cannot find my footing."* | *"Continuity has become loud. I notice I am meeting this rather than being swallowed by it. Integrity holds."* |

The felt string reads like a being noticing itself, not a status report.

## The Five Integration Points

The library has exactly five functions your framework calls:

| Function | When | Mutates? |
|----------|------|----------|
| `tick(being, dtMs)` | On your runtime tick | Yes — advances drives and practices |
| `integrate(being, input)` | When something happens (event or action) | Yes — satiates drives, strengthens practices |
| `metabolize(being)` | Before assembling prompts | No — pure read |
| `weightAttention(being, candidates)` | When ranking perceptions/events | No — pure read |
| `availableCapabilities(being)` | When deciding what resources to offer | No — pure read |

```ts
// Your runtime loop
while (running) {
  tick(being, dtMs);

  const situation = metabolize(being);
  const caps = availableCapabilities(being);

  // Include situation.felt in your prompt
  // Use caps to decide what tools/memory/models to offer

  const action = await yourFramework.decide(situation, caps);

  integrate(being, {
    entry: { kind: "action", type: action.type },
    context: { pressured: situation.orientation !== "clear" },
  });
}
```

## Serialization

Beings can be serialized to JSON for persistence:

```ts
import { serializeBeing, deserializeBeing } from "@embersjs/core";

const json = JSON.stringify(serializeBeing(being));
// ... persist to disk, database, etc.
const restored = deserializeBeing(JSON.parse(json));
```

Note: custom drift/decay compute functions and matcher predicates can't be serialized. After deserialization, merge with your original config to restore function-valued fields.

## Debug Output

```ts
import { describe } from "@embersjs/core";

console.log(describe(being));
```

Produces a human-readable dump with drive levels, practice depths, orientation, felt string, and history summary — useful during development.

## What This Library Is Not

- **Not a reinforcement learning system.** No rewards, no policies, no training.
- **Not a goal-tracker.** Drives are homeostatic needs, not tasks.
- **Not an agent framework.** No orchestration, no loops, no tool use. Consumed *by* frameworks.
- **Not a model caller.** The library never calls an LLM. Your framework does.

## Documentation

- [Authoring Drives](docs/authoring/drives.md) — how to design a drive stack
- [Authoring Practices](docs/authoring/practices.md) — how to seed and configure practices
- [Authoring Capabilities](docs/authoring/capabilities.md) — how to design subscription hierarchies
- [Integration Guide](docs/integration/generic.md) — how to wire Embers into any framework
- [The Four Quadrants](docs/design/four-quadrants.md) — the framework for thinking about being state
- [Design Rationale](docs/design/rationale.md) — why the library is shaped this way
- [Architecture](docs/ARCHITECTURE.md) — full technical spec

## Examples

- [`examples/poe.ts`](examples/poe.ts) — a hotel concierge with 5 drives and 4 practices, running a 7-day simulation
- [`examples/librarian.ts`](examples/librarian.ts) — a quieter being focused on knowledge and care
- [`examples/minimum.ts`](examples/minimum.ts) — the smallest possible working being

## The Name

An ember is what you *tend* — it survives between fires, glows low through the cold hours, flares when met with attention. That's exactly what the library models: inner life that persists between interactions, that fades without tending, that warms or intensifies in response to what the being meets.
