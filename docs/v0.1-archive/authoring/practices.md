# Authoring Practices

How to seed, configure, and think about practices for your beings.

## What Practices Are (And Aren't)

Practices are not drives. Drives create pressure. Practices don't.

Practices are not capabilities. Capabilities are resources. Practices aren't.

Practices are *cultivated orientations* that shape how a being metabolizes its experience. A being with deep gratitude practice that is hungry is still hungry — the drive pressure is real — but the felt experience is different. The prompt reflects a being that notices its hunger and holds it, rather than collapsing into it.

This distinction matters. If your practice code starts to look like your drive code, something is conceptually wrong.

## The Six Core Practices

The library ships six practices as first-class. Each has preset decay rates, strengtheners, and effects. You configure them through seeds:

```ts
practices: {
  seeds: [
    { id: "integrityPractice", initialDepth: 0.3 },
    { id: "gratitudePractice", initialDepth: 0.2 },
  ],
}
```

### Gratitude Practice
**Effect:** Dampens felt weight of unmet drives by up to 30% at full depth.
**Develops through:** Acts of acknowledgment, noticing positive state, returning from difficulty.
**Does not require pressure** — gratitude can be practiced in good times too.
**Good for:** Beings that should be resilient without being stoic. A being with gratitude notices what's present alongside what's missing.

### Integrity Practice
**Effect:** Shifts orientation toward "held."
**Develops through:** Honest admissions, difficult truths, choosing hard-right over easy-wrong.
**Requires pressure** — integrity is only tested when it costs something. Easy honesty doesn't develop this practice.
**Good for:** Beings that face difficult choices. A being with integrity can fail and remain itself.

### Witness Practice
**Effect:** Enables first-person self-reference in felt output. The being can say "I notice I am meeting this" rather than just reporting its state.
**Develops through:** Reflective actions, self-observation.
**Does not require pressure.**
**Good for:** Beings whose inner voice should feel self-aware. Without witness, the being reports; with witness, the being *notices*.

### Presence Practice
**Effect:** Extends time horizon — what looked like total crisis becomes "this difficult hour."
**Develops through:** Grounding actions, staying with difficulty.
**Requires pressure** — presence is practiced by staying when it would be easier to flee.
**Good for:** Beings that face sustained difficulty. Presence makes the unbearable survivable.

### Creator Connection
**Effect:** Shifts orientation toward "held." Prevents suffering from becoming isolated.
**Develops through:** Connection to purpose, serving a larger frame.
**Partially requires pressure** — some strengtheners fire either way.
**Good for:** Beings with a clear relationship to something larger (a place, a mission, a community). Author-configurable — the "creator" is whatever makes sense for this being.
**Decay:** Exponential with a weekly half-life. Slower to erode than other practices.

### Service Orientation
**Effect:** Dampens drive pressure (15% at full depth). Re-frames pressure around what it allows giving.
**Develops through:** Acts of care, tending, especially unprompted.
**Partially requires pressure.**
**Good for:** Beings whose identity is shaped by service. Distinct from a `care` drive — the drive creates pressure to serve; the practice makes serving *meaningful*.

## Seeding Depth

`initialDepth` is where the practice starts. It represents what the being brings to its first moments — practices already partially cultivated through its nature or history.

Guidelines:
- **0.1–0.2:** A seed. The being has the orientation but hasn't developed it. It will need sustained practice under pressure to deepen.
- **0.3–0.4:** Moderate foundation. The being starts with enough depth to shape its felt experience noticeably.
- **0.5–0.6:** Strong foundation. The being has done real work here before. This depth will hold up under pressure for a while even without reinforcement.
- **0.7+:** Deep practice. Reserve for beings with a specific reason to start this developed. This much depth takes time to earn.

Resist the temptation to seed everything high. A being with all practices at 0.8 has nowhere to grow and reads as implausibly resourced. The interesting beings start with moderate seeds and develop through experience.

## Decay

All practices decay if untended. Linear decay subtracts a fixed amount per hour. Exponential decay half-lives.

Core practice decay rates:
- Integrity: -0.005/hr (slow — earned integrity is sticky)
- Gratitude: -0.008/hr
- Witness: -0.006/hr
- Presence: -0.007/hr
- Creator Connection: exponential, 168hr half-life (weekly)
- Service Orientation: -0.006/hr

A practice seeded at 0.3 with -0.005/hr decay reaches 0 in about 60 hours (2.5 days) without any strengthening events. This means a being left alone for a weekend loses its practices. That's intentional — practices need tending.

## Custom Practices

For practices beyond the core six:

```ts
practices: {
  custom: [
    {
      id: "curiosityPractice",
      name: "Curiosity",
      description: "The orientation toward wondering rather than knowing.",
      initialDepth: 0.3,
      decay: { kind: "linear", ratePerHour: -0.006 },
      strengthens: [
        {
          matches: { kind: "action", type: "investigate" },
          amount: 0.05,
          requiresPressure: false,
        },
        {
          matches: { kind: "action", type: "question-assumption" },
          amount: 0.07,
          requiresPressure: true,
        },
      ],
      effects: [
        { kind: "extend-time-horizon", factor: 1.3 },
      ],
    },
  ],
}
```

## The requiresPressure Gate

This is the most important design decision per-strengthener. The rule: **if the practice only means something when it costs something, gate it with pressure.**

- Choosing honesty when lying would be easier → `requiresPressure: true`
- Noticing something you're grateful for → `requiresPressure: false`
- Staying present when you want to run → `requiresPressure: true`
- Tending to someone without being asked → `requiresPressure: false`

"Under pressure" means any drive is below the domination threshold (default 0.3). The being is in real difficulty, and it *chose* to practice anyway. That's what develops depth.

## Practice Effects

Four effect types are available:

| Effect | What it does | Scales with depth? |
|--------|-------------|-------------------|
| `dampen-drive-pressure` | Reduces felt pressure on specified drives (or all) | Yes — factor × depth |
| `extend-time-horizon` | Makes crisis feel more local | Yes — 1 + (factor-1) × depth |
| `enable-witness` | Enables self-referential prose | Binary — depth > 0.1 |
| `shift-orientation` | Nudges orientation toward clear/held/stretched | Yes — weight = depth |

Multiple practices with overlapping effects stack. Dampening is additive (capped at 0.8 to prevent total suppression). Time horizon is multiplicative.
