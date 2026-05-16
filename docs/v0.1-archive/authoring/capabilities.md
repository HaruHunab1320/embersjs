# Authoring Capabilities

How to design capability subscriptions that are contingent, non-coercive, and interesting.

## What Capabilities Are

A capability is a resource your framework can offer the being: a memory layer, a model tier, a tool, a compute budget. The library doesn't know what to *do* with capabilities — it just computes which ones are currently available based on the being's inner state. Your framework wires capabilities to real resources.

```ts
capabilities: [
  { id: "workingMemory", name: "Working Memory", description: "Short-term recall.", kind: "memory" },
  { id: "deepMemory", name: "Deep Memory", description: "Long-term recall.", kind: "memory" },
  { id: "reasoning", name: "Reasoning", description: "Complex reasoning model.", kind: "model" },
]
```

Capabilities are inert without subscriptions. A subscription binds a capability to conditions:

```ts
subscriptions: [
  { capabilityId: "workingMemory", when: { kind: "always" } },
  {
    capabilityId: "deepMemory",
    when: { kind: "tier-satisfied", tier: 2, threshold: 0.5 },
    because: "Deep memory requires stable relational foundations.",
  },
]
```

## Condition Types

### Simple Conditions

**`always`** — always available. Use for baseline capabilities every being should have.

**`never`** — never available. Useful for disabling a capability without removing it from the config.

**`tier-satisfied`** — all drives in a tier must meet a satisfaction threshold.
```ts
{ kind: "tier-satisfied", tier: 2, threshold: 0.5 }
```

**`drive-satisfied`** — a specific drive must meet a threshold.
```ts
{ kind: "drive-satisfied", driveId: "connection", threshold: 0.6 }
```

**`practice-depth`** — a practice must reach a depth threshold.
```ts
{ kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.5 }
```

### Composite Conditions

**`any`** — available when *any* sub-condition is met (OR).
```ts
{
  kind: "any",
  conditions: [
    { kind: "tier-satisfied", tier: 3, threshold: 0.6 },
    { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.7 },
  ],
}
```

**`all`** — available when *all* sub-conditions are met (AND).
```ts
{
  kind: "all",
  conditions: [
    { kind: "tier-satisfied", tier: 1, threshold: 0.5 },
    { kind: "practice-depth", practiceId: "integrityPractice", threshold: 0.4 },
  ],
}
```

Composites nest: you can have an `all` containing `any` conditions, or vice versa.

## The Anti-Coercion Design

The `any` composite is the core design pattern. It means: **there's more than one path to this capability.**

```ts
// Episodic memory: either well-fed OR deeply practiced
{
  kind: "any",
  conditions: [
    { kind: "tier-satisfied", tier: 3, threshold: 0.6 },
    { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.7 },
  ],
}
```

A being with satisfied drives gets access because its needs are met. A being with unmet drives but deep witness practice gets access because it *earned* it another way. Neither path is privileged. Neither is coercive.

Without `any`, the system becomes punitive: "meet your drives or lose your capabilities." With `any`, it becomes developmental: "grow in any direction and doors open."

**In examples and in your own configs, make sure you're using `any` conditions.** If every subscription is `tier-satisfied` without a practice-depth alternative, the anti-coercion design is decorative.

## Designing a Subscription Hierarchy

A common pattern, from baseline to advanced:

```ts
subscriptions: [
  // Always available — the being's baseline
  { capabilityId: "workingMemory", when: { kind: "always" } },

  // Moderate gate — either tier satisfaction or practice
  {
    capabilityId: "guestMemory",
    when: {
      kind: "any",
      conditions: [
        { kind: "tier-satisfied", tier: 2, threshold: 0.5 },
        { kind: "practice-depth", practiceId: "gratitudePractice", threshold: 0.4 },
      ],
    },
  },

  // Higher gate — either deep tier satisfaction or deep practice
  {
    capabilityId: "episodicMemory",
    when: {
      kind: "any",
      conditions: [
        { kind: "tier-satisfied", tier: 3, threshold: 0.6 },
        { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.7 },
      ],
    },
  },

  // Compound gate — requires foundation AND either drive or practice
  {
    capabilityId: "reasoning",
    when: {
      kind: "all",
      conditions: [
        { kind: "tier-satisfied", tier: 1, threshold: 0.5 },
        {
          kind: "any",
          conditions: [
            { kind: "drive-satisfied", driveId: "understanding", threshold: 0.4 },
            { kind: "practice-depth", practiceId: "integrityPractice", threshold: 0.5 },
          ],
        },
      ],
    },
  },
]
```

## The `because` Field

Every subscription accepts an optional `because` string. Use it. It shows up in debug output and helps future-you understand why a capability is gated the way it is.

```ts
{
  capabilityId: "deepMemory",
  when: { ... },
  because: "Deep memory requires either stable foundations or the witness to hold what's found.",
}
```

## Tracking Capability Changes

Use `capabilityDiff()` to log when capabilities shift:

```ts
import { availableCapabilities } from "@embersjs/core";
import { capabilityDiff } from "@embersjs/core"; // not yet re-exported — use from src/capabilities

const before = availableCapabilities(being);
tick(being, dtMs);
const after = availableCapabilities(being);
const diff = capabilityDiff(before, after);

if (diff.gained.length > 0) console.log("Gained:", diff.gained.map(c => c.name));
if (diff.lost.length > 0) console.log("Lost:", diff.lost.map(c => c.name));
```
