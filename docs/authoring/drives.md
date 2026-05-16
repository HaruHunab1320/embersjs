# Authoring Drives

How to design a drive stack for your being.

## What drives are

A drive is a **persistent need with a satisfaction level that drifts over time**. Drives are why a being acts. Without them, an agent is a function waiting to be called. With them, the agent has structural reasons to do anything at all.

A drive's `level` is satisfaction (0–1, where 1 is fully met). Pressure is computed as `max(0, target - level) × weight` and is **never reduced by anything in the library**. Practices add resources the being can bring to pressure; they do not make pressure go away.

## The shape

```ts
{
  id: "connection",
  name: "Connection",
  description: "The need to not be alone — to be in genuine contact.",
  tier: 3,
  weight: 0.7,
  initialLevel: 0.5,
  target: 0.6,
  drift: { kind: "linear", ratePerHour: -0.03 },
  satiatedBy: [
    { matches: { kind: "event", type: "meaningful-exchange" }, amount: 0.25 },
  ],
}
```

## Tiers (Maslow-flavored)

Lower tiers are more foundational:

- **Tier 1** — survival, continuity, integrity (the being's existence is at stake)
- **Tier 2** — safety, place, role (the being's situation)
- **Tier 3** — belonging, connection, care (the being's relationships)
- **Tier 4** — esteem, understanding, mastery (the being's sense of self)
- **Tier 5+** — self-actualization, transcendence, contribution (the being's larger frame)

You don't have to use all tiers. A simple being might have only tiers 1–2. Pick the tiers your character actually has needs across.

**Tier domination** affects *attention*, not pressure. When a tier-1 drive is below the domination threshold (default 0.3), candidates in `weightAttention()` that relate to higher tiers receive a reduced boost. The drive's pressure is still felt fully — but the being's *focus* narrows toward survival.

## Drift functions

Three kinds:

- **`linear`** — level changes by `ratePerHour` per simulated hour. Negative values drift toward need; positive (rare) drift toward saturation.
- **`exponential`** — level half-lives toward 0 over `halfLifeHours`. Useful for drives that fade slowly when unmet.
- **`custom`** — supply a pure `(current, dtMs) => next` function. Useful for cyclic drives or drives with complex dynamics.

Pick drift rates that match the timescale of your simulation. A drive that fully decays in 1 hour at hourly ticks behaves very differently from one that takes a week.

## Satiation

A `SatiationBinding` ties an event or action to a drive level increase. Frameworks decide what their events and actions look like — Embers just matches by `kind` and `type` (and optional `predicate`).

```ts
satiatedBy: [
  { matches: { kind: "event", type: "meaningful-exchange" }, amount: 0.25 },
  { matches: { kind: "action", type: "tend" }, amount: 0.1 },
  {
    matches: {
      kind: "event",
      type: "guest-arrived",
      predicate: (e) => (e.payload as { kind?: string } | undefined)?.kind === "regular",
    },
    amount: 0.15,
  },
],
```

Predicates allow finer-grained matching. Be careful: predicates don't serialize, so a deserialized being loses them. Consumers that serialize need to re-merge the original config.

## Authoring guidance

**Make the drift meaningful.** A drive that takes a month to budge is decorative. One that hits zero in five minutes is overwhelming. Pick a half-life or rate that produces visible behavior across your simulation horizon.

**Weight drives within their tier honestly.** Within a tier, `weight` ranks importance. Tier-1 drives at weight 0.9 + 0.5 produce a clearly stronger pull on the 0.9 drive.

**Don't try to model every need.** Three to six well-chosen drives produce more coherent behavior than fifteen.

**The character should make the drives obvious.** A hotel concierge probably has guest-care and place-integrity drives. A librarian has stewardship and knowledge. A monk has continuity and transcendence. The drives express the character.

**Use tier-1 carefully.** Tier-1 drives that collapse dominate attention and can lock higher-tier capabilities through `wear`. A being whose tier-1 drive collapses for a sustained period really *will* fall apart structurally — this is by design, but it means tier-1 drives are load-bearing.

## Common patterns

### Slow background drives

```ts
drift: { kind: "exponential", halfLifeHours: 168 }, // ~weekly decay
```

For drives that should feel persistent but not urgent — undercurrents.

### Spike-and-decay drives

```ts
drift: { kind: "linear", ratePerHour: -0.04 },
satiatedBy: [{ matches: { kind: "event", type: "...", }, amount: 0.4 }],
```

For drives that get a clear satisfaction hit and then decay back. Most appetite-style drives fit this.

### Drives that don't really decay

```ts
drift: { kind: "linear", ratePerHour: -0.001 },
```

For drives that mostly stay where they are unless something specific happens. Useful when a drive's level is primarily set by external events.

### Tier-1 continuity

```ts
{
  id: "continuity",
  tier: 1,
  weight: 0.9,
  initialLevel: 0.85,
  target: 0.9,
  drift: { kind: "linear", ratePerHour: -0.02 },
  satiatedBy: [{ matches: { kind: "event", type: "integrity-check-passed" }, amount: 0.15 }],
}
```

A foundational "I persist" drive that gets a periodic positive signal. If integrity checks stop, this drive descends and chronic state accumulates.

## What not to do

- **Don't dampen drives in code.** Removed in v0.2. Drives stay loud.
- **Don't expect practices to "fix" persistent low drives.** Practices change what the being brings; they don't lower pressure. Persistent low drives lead to wear and collapse.
- **Don't author drives whose only purpose is symbolic.** If nothing in your framework satiates them, they just decay forever and the being collapses. That might be intentional (a being in chronic deprivation) but should be deliberate.

## See also

- [Architecture](../ARCHITECTURE.md) — full type spec
- [Practices](practices.md) — what practices do with drive pressure
- [Capabilities](capabilities.md) — gating capabilities on drive satisfaction
