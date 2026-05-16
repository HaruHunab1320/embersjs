# Authoring Drives

How to design a drive stack that produces interesting, coherent beings.

## What a Drive Is

A drive is a persistent need with a satisfaction level that changes over time. A drive at level 0.8 is mostly met. A drive at 0.2 is urgent. Drives drift downward without tending and are satiated by specific events or actions.

Drives don't know how to be satisfied. They just exert pressure. Your framework decides what to do about that pressure.

## The Drive Config

```ts
{
  id: "connection",            // unique within the being
  name: "Connection",          // used in felt-string prose
  description: "The need...",  // used in prompts and debug output
  tier: 2,                     // 1 = most foundational
  weight: 0.7,                 // within-tier importance, 0–1
  initialLevel: 0.5,           // starting satisfaction
  target: 0.6,                 // homeostatic set point
  drift: { kind: "linear", ratePerHour: -0.03 },
  satiatedBy: [
    { matches: { kind: "event", type: "conversation" }, amount: 0.2 },
  ],
}
```

## Choosing Tiers

Tiers model Maslow's hierarchy — lower tiers are more foundational.

**Tier 1** — Existence needs. What must be true for the being to function at all. Examples: continuity (file integrity), stability (system health), safety.

**Tier 2** — Relational needs. What the being needs in its primary relationships. Examples: guest care, reader care, user trust.

**Tier 3** — Connection needs. Deeper contact beyond functional relationships. Examples: genuine exchange, being known, belonging.

**Tier 4** — Growth needs. Self-actualization. Examples: understanding, expression, craft.

When a tier-1 drive is deeply unmet, higher tiers are dampened. The being focuses on survival before self-actualization. This is configured through `dominationRules`:

```ts
{
  tierCount: 4,
  drives: [...],
  dominationRules: {
    threshold: 0.3,   // below this, a drive "dominates"
    dampening: 0.7,   // higher tiers' felt weight cut by 70%
  },
}
```

The defaults (0.3 threshold, 0.7 dampening) work well for most beings. Lower the dampening if you want a being that can push through foundational distress.

## Choosing Levels and Targets

- **`target`** is the homeostatic set point — where the drive "wants" to be. Pressure = max(0, target - level).
- **`initialLevel`** is where the being starts. Set it near or slightly below the target for a fresh being that reads as "clear." Set it well below for a being that starts under pressure.

A being with `initialLevel: 0.8, target: 0.9` has gentle pressure (0.1). A being with `initialLevel: 0.2, target: 0.8` starts in distress.

Good starting points for a fresh being:
- Tier 1: `initialLevel: 0.8–0.9, target: 0.85–0.95`
- Tier 2: `initialLevel: 0.5–0.7, target: 0.65–0.8`
- Tier 3: `initialLevel: 0.4–0.6, target: 0.55–0.7`
- Tier 4: `initialLevel: 0.4–0.5, target: 0.5–0.65`

## Drift Functions

Drift controls how fast a drive becomes unsatisfied when untended.

**Linear** — steady decline. Most drives use this.
```ts
{ kind: "linear", ratePerHour: -0.03 }
```
A drive at 0.7 with this drift hits 0.0 in ~23 hours. Choose the rate based on how often you expect the drive to be satiated.

**Exponential** — fast initial decay, then slower. Good for drives that fade more gently over time.
```ts
{ kind: "exponential", halfLifeHours: 48 }
```
A drive at 0.8 is at 0.4 after 48 hours, 0.2 after 96 hours. Good for connection-type drives where isolation hurts most in the first few days.

**Custom** — for anything else. Must be a pure function.
```ts
{ kind: "custom", compute: (current, dtMs) => /* your logic */ }
```

## Satiation Bindings

Bindings map events and actions to satisfaction amounts:

```ts
satiatedBy: [
  // Events the being receives
  { matches: { kind: "event", type: "guest-arrived" }, amount: 0.15 },
  // Actions the being takes
  { matches: { kind: "action", type: "speak" }, amount: 0.08 },
  // With a predicate for finer control
  {
    matches: {
      kind: "event",
      type: "message",
      predicate: (e) => e.payload?.["depth"] === "meaningful",
    },
    amount: 0.25,
  },
]
```

Amounts are additive. A drive at 0.3 that receives 0.2 of satiation rises to 0.5. Levels clamp at 1.0.

**Sizing amounts:** think about how many of this event should fully satiate the drive. If you want 5 conversations to take connection from 0 to 1, use `amount: 0.2`. If you want it to take 10, use `amount: 0.1`.

## Common Mistakes

**Too many drives.** 3–5 drives is the sweet spot. More than 6 and the felt output becomes diffuse — too many things pressing at once. If you're tempted to add a 7th drive, ask whether it could be a satiation binding on an existing drive instead.

**All drives in the same tier.** This removes the domination dynamic entirely. If nothing is more foundational, there's no urgency hierarchy — the being treats a leaky faucet and an existential crisis with equal weight.

**Drift rates that are too fast.** If a drive goes from 0.8 to 0 in 2 hours, the being is in constant crisis unless your tick rate is very high. Start slow (ratePerHour: -0.02 to -0.05) and increase if the being seems too placid.

**Target below initialLevel.** This creates a drive with *negative* pressure at instantiation (already over-satisfied). That's occasionally useful but usually a mistake — the drive will drift down to its target and then start pressing.
