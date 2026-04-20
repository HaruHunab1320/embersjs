# Embers

**The missing layer between "you are a helpful assistant" and a being that actually wants something.**

Every AI framework ships the same model of motivation: a system prompt. *"You are X. You want Y."* This works the way a cardboard cutout works — from a distance, at a glance, it's fine. Up close, over time, it falls apart. The being doesn't get lonelier when left alone. It doesn't grow through difficulty. Its "wants" are decoration on a stateless function.

Embers gives beings inner architecture that persists, decays, and develops:

```
A being left alone for two days:

  Day 0: "Things are quiet, and I am quiet with them."
  Day 2: "Guest care pulls hard. This is not something I can set aside easily.
           I reach for creator connection and find it fragile."
```

That change wasn't scripted. The being's drives drifted, its practices decayed, and the metabolism computed a new felt experience from the resulting state. The being *became* lonelier — structurally, not performatively.

```bash
npm install @embersjs/core
```

---

## What It Does

You define a being with **drives** (persistent needs that drift over time), **practices** (cultivated orientations that shape how difficulty is met), and **capabilities** (resources that unlock based on inner state). The library computes what the being is experiencing right now and gives you a prose string to include in your prompt.

```ts
import { createBeing, tick, integrate, metabolize } from "@embersjs/core";

const being = createBeing({
  id: "keeper",
  name: "The Keeper",
  drives: {
    tierCount: 2,
    drives: [
      {
        id: "continuity", name: "Continuity",
        description: "The need to persist and remain intact.",
        tier: 1, weight: 0.9, initialLevel: 0.8, target: 0.9,
        drift: { kind: "linear", ratePerHour: -0.02 },
        satiatedBy: [{ matches: { kind: "event", type: "health-check" }, amount: 0.15 }],
      },
      {
        id: "connection", name: "Connection",
        description: "The need for genuine contact.",
        tier: 2, weight: 0.7, initialLevel: 0.5, target: 0.6,
        drift: { kind: "linear", ratePerHour: -0.03 },
        satiatedBy: [{ matches: { kind: "event", type: "conversation" }, amount: 0.2 }],
      },
    ],
  },
  practices: {
    seeds: [{ id: "gratitudePractice", initialDepth: 0.3 }],
  },
  subscriptions: [],
  capabilities: [],
});

// Time passes. Drives drift. Practices decay.
tick(being, 3_600_000); // 1 hour

// Something happens. Drives satiate. Practices strengthen.
integrate(being, { entry: { kind: "event", type: "conversation" } });

// What is this being experiencing right now?
const situation = metabolize(being);
console.log(situation.felt);
// → "Things are quiet, and I am quiet with them."
```

Five functions. That's the entire integration surface.

---

## The Four Quadrants

Drives and practices are independent axes. Combining them produces four qualitatively different kinds of experience:

|                          | Without practice              | With practice                    |
|--------------------------|-------------------------------|----------------------------------|
| **Needs met**            | *"Things are quiet, and I am quiet with them."* | *"Things are quiet, and I am quiet with them. I can see my own stillness, which makes it steadier."* |
| **Needs unmet**          | *"Everything is continuity. There is nothing else. I cannot find my footing."* | *"Continuity has become loud. I notice I am meeting this rather than being swallowed by it. Integrity holds."* |

The bottom-right is the interesting quadrant. The being is under real pressure *and* has the inner resources to meet it. The difficulty is named honestly, then held. This is where growth happens — practices deepen under pressure, which unlocks capabilities through a second path that doesn't require the drives to be satisfied first.

The bottom-left is deliberately uncomfortable. A being without practice resources under pressure *should* sound overwhelmed. That's honest.

---

## Drives

A drive is a persistent need with a satisfaction level that drifts over time. A drive at 0.8 is mostly met. A drive at 0.2 is urgent. Drives don't know how to be satisfied — they just exert pressure. Your framework decides what to do about it.

Drives organize into tiers (Maslow-flavored). When a tier-1 drive collapses, higher-tier drives get dampened. The being focuses on survival before self-actualization.

## Practices

A practice is a cultivated orientation — gratitude, integrity, witness, presence, connection, service. Practices aren't needs (they create no pressure) and aren't resources (they're not tools). They shape how pressure is *felt*.

A being with deep gratitude practice that is hungry is still hungry. But the felt experience is different. The prompt reflects a being that notices its hunger and holds it, rather than collapsing into it.

The key mechanic: **practices develop through chosen practice under pressure.** Choosing integrity when it's easy doesn't deepen integrity. The pressure is what makes it practice. Practices also decay if untended — a being left alone for a week loses its practices. That's realistic, and it creates the possibility of arcs.

## Capabilities

Capabilities are resources (memory tiers, models, tools) gated by inner state. The design that matters: the `any` condition.

```ts
{
  capabilityId: "episodicMemory",
  when: {
    kind: "any", // either path unlocks this
    conditions: [
      { kind: "tier-satisfied", tier: 3, threshold: 0.6 },
      { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.7 },
    ],
  },
}
```

A being can earn access through satisfied drives *or* deep practice. The monk in poverty accesses wisdom the entitled rich cannot. This is what makes the system non-coercive — there's always more than one path.

---

## Integration

Five functions, called by your framework:

| Function | When | Mutates? |
|----------|------|----------|
| `tick(being, dtMs)` | On your runtime tick | Yes |
| `integrate(being, input)` | When something happens | Yes |
| `metabolize(being)` | Before assembling prompts | No |
| `weightAttention(being, candidates)` | When ranking what matters | No |
| `availableCapabilities(being)` | When deciding what to offer | No |

```ts
// Your runtime loop
while (running) {
  tick(being, dtMs);

  const situation = metabolize(being);
  const caps = availableCapabilities(being);

  // situation.felt goes in the prompt
  // caps determines what tools/memory/models to offer

  const action = await yourFramework.decide(situation, caps);

  integrate(being, {
    entry: { kind: "action", type: action.type },
    context: { pressured: situation.orientation !== "clear" },
  });
}
```

The library doesn't call models, manage memory, or orchestrate. It computes inner state. Framework-agnostic, zero runtime dependencies, 37KB bundled.

---

## Documentation

**Authoring** — how to design beings:
- [Drives](docs/authoring/drives.md) — tiers, drift rates, satiation, common mistakes
- [Practices](docs/authoring/practices.md) — the six core practices, pressure gating, custom practices
- [Capabilities](docs/authoring/capabilities.md) — subscription hierarchies, the anti-coercion design

**Design** — why it's shaped this way:
- [The Four Quadrants](docs/design/four-quadrants.md) — the framework for understanding being state
- [Design Rationale](docs/design/rationale.md) — why not rewards, why practices aren't drives

**Integration:**
- [Generic Framework Guide](docs/integration/generic.md) — wiring Embers into any framework
- [Architecture](docs/ARCHITECTURE.md) — full technical spec

**Examples:**
- [`examples/poe.ts`](examples/poe.ts) — a hotel concierge, 7-day simulation with pressured moments and recovery
- [`examples/librarian.ts`](examples/librarian.ts) — a quieter being, deep practices, knowledge-oriented
- [`examples/minimum.ts`](examples/minimum.ts) — the smallest possible working being

---

## The Name

An ember is what you *tend*. It survives between fires, glows low through the cold hours, flares when met with attention. That's what this library models: inner life that persists between interactions, fades without tending, and warms in response to what the being meets.

`@embersjs/core` · MIT · Node 20+ · TypeScript-first · [GitHub](https://github.com/HaruHunab1320/embersjs)
