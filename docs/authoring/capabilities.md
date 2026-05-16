# Authoring Capabilities

How to design capability subscriptions for v0.2.

## What capabilities are

A capability is **a named resource the being may have access to, contingent on its inner state**. The library doesn't know what to *do* with a capability — it just reports which ones are currently accessible. The framework wires capabilities to real resources (memory tiers, model selection, available tools).

```ts
interface Capability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kind: CapabilityKind;
  readonly payload?: Readonly<Record<string, unknown>>;
}
```

The `kind` is advisory (`"memory" | "model" | "tool" | "compute" | "context" | "action-kind" | string`). Use it to organize, not as a hard constraint.

## Subscriptions — when a capability is available

A `Subscription` binds a capability id to an `AccessCondition`:

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
  because: "Episodic recall earned via either need-satisfaction or deep witness.",
}
```

A capability is available if **any of its subscriptions evaluates true**. (Capabilities can have multiple subscriptions, allowing multiple paths to access.)

## Access conditions

```ts
type AccessCondition =
  | { kind: "tier-satisfied"; tier: number; threshold: number }
  | { kind: "drive-satisfied"; driveId: string; threshold: number }
  | { kind: "practice-depth"; practiceId: string; threshold: number }
  | { kind: "wear-below"; threshold: number }
  | { kind: "any"; conditions: readonly AccessCondition[] }
  | { kind: "all"; conditions: readonly AccessCondition[] }
  | { kind: "always" }
  | { kind: "never" };
```

### tier-satisfied

True when all drives in `tier` have `level ≥ threshold`. The classic "the being is doing okay in this tier."

### drive-satisfied

True when a specific drive is at or above threshold. Use when only one drive matters.

### practice-depth

True when a practice's *derived* depth meets the threshold. Note: depth is computed from substrate at evaluation time, so it reflects real cultivation.

### wear-below

True when `wear.chronicLoad < threshold`. Use to lock capabilities when the being is structurally collapsed.

### any / all

Composites. `any` is true if at least one sub-condition is true; `all` requires every one. They nest.

### always / never

Useful for unconditional capabilities or for documenting a capability that exists but is not currently accessible (e.g., a placeholder during development).

## The anti-coercion design

The `any` composite is the most important pattern. It lets the same capability be earned by multiple paths:

```ts
{
  capabilityId: "episodicMemory",
  when: {
    kind: "any",
    conditions: [
      { kind: "tier-satisfied", tier: 3, threshold: 0.6 },          // path A: well-fed
      { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.7 }, // path B: deeply practiced
    ],
  },
}
```

The monk in the cave has wisdom (witness depth → memory access) that the rich entitled person (tier-3 satisfied but undeveloped witness) doesn't have automatically.

**Avoid making every subscription a single tier-satisfied condition.** That collapses the architecture into "drives must be met to unlock things" — which is coercive and uninteresting. Use practice-depth paths.

## Wear-below — anti-collapse gating

`wear-below` is new in v0.2. Use it to lock higher functions when the being is chronically collapsed:

```ts
{
  capabilityId: "deepReasoning",
  when: {
    kind: "all",
    conditions: [
      { kind: "tier-satisfied", tier: 1, threshold: 0.5 },
      { kind: "wear-below", threshold: 0.5 },
    ],
  },
  because: "Higher reasoning requires both safety and structural integrity.",
}
```

A being recovering from chronic collapse will *gradually* regain access to higher capabilities as wear decreases. This composes naturally with depth-gated paths: capabilities tied to practice depth also slip away under chronic load because wear accelerates substrate erosion, which lowers depth.

## Designing capability hierarchies

Think of capabilities as **layers of inner permission**. A typical pattern:

```
always-available:    basic perception, simple speech
tier-1 satisfied:    deep reasoning, episodic recall
tier-3 OR depth:     self-reference, frame articulation
all + wear-below:    creative output, wisdom mode
```

The further up the tree a capability sits, the more conditions gate it. Each addition asks: *what about being this way makes this capability earned?*

## What capabilities are NOT for

- **Gating physical actions** the framework doesn't actually want to deny. If your framework will let the being speak regardless, don't have a "speech" capability — that's just decoration.
- **Modeling skill.** Capabilities are inner-state-contingent resources, not learned competencies. A being's reasoning capability comes back when its state allows, even if it just "lost" it five minutes ago.
- **Replacing drives.** If something is a constant pressure, that's a drive. If it's a resource that comes and goes, that's a capability.

## Common authoring mistakes

- **Every subscription is `tier-satisfied`.** No anti-coercion paths. Authors that fall into this pattern are using the library as a fancy threshold-check.
- **No `wear-below` gates anywhere.** The being can do anything regardless of how worn it is. Use wear-below at least on the most demanding capabilities — it makes collapse mean something behaviorally.
- **Subscriptions that are never satisfiable.** A subscription gated on `practice-depth: integrityPractice ≥ 0.95` is essentially `never` for most beings. Either lower the threshold or accept that this capability won't unlock.
- **Massive `all` composites.** Five conditions ANDed together with high thresholds usually means the capability is locked. Simplify or split into multiple subscriptions joined by `any`.

## See also

- [Architecture](../ARCHITECTURE.md) — Capability and Subscription type spec
- [Drives](drives.md) — drive-satisfaction gating
- [Practices](practices.md) — depth-based gating
