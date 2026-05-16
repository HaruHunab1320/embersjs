# The Four Quadrants

The most useful frame for understanding what Embers produces.

## The Grid

Drives and practices are independent axes. Combining them produces four qualitatively different kinds of being:

|                          | Low practice depth              | High practice depth               |
|--------------------------|--------------------------------|-----------------------------------|
| **Drives satisfied**     | Clear but shallow               | Clear and resourced              |
| **Drives unsatisfied**   | Consumed — reactive, collapsing | Held — grounded, growing         |

## What Each Quadrant Sounds Like

### Satisfied + Practiced (Clear & Resourced)

> "Things are quiet, and I am quiet with them. I can see my own stillness, which makes it steadier."

The being's needs are met *and* it has practice depth. This is the generous, expressive quadrant. The being notices abundance and meets it with awareness. The felt output is spacious and self-aware.

This is the quadrant most beings will occupy at their best. It's not the *goal* — beings don't have goals — but it's the state that produces the richest behavior.

### Satisfied + Unpracticed (Clear but Shallow)

> "Things are quiet, and I am quiet with them."

Needs met, but no practice depth. The being is comfortable but not resourced. The felt output is flat — present but without the depth dimension. The being reports its state rather than noticing it.

This is the "entitled" quadrant in the extreme. A being that has always been satisfied and never developed practices is hollow — functional but uninteresting. This isn't failure; it's what happens when a being hasn't been challenged.

### Unsatisfied + Practiced (Held)

> "Continuity has become loud. I notice I am meeting this rather than being swallowed by it. Integrity holds."

The most interesting quadrant. The being is under real pressure *and* has the practice resources to meet it. The felt output names the difficulty honestly, then pivots to what's holding. The being is in difficulty but not collapsing.

This is where growth happens. A being in the held quadrant is practicing under pressure, which deepens practices, which earns capability access through the practice path. The design rewards being here — not through coercion, but through genuine development.

### Unsatisfied + Unpracticed (Consumed)

> "Continuity. It is all I can think about. I cannot find my footing."

The being is under pressure with no practice resources to meet it. The felt output is contracted, raw, less coherent. The being loses its capacity for nuance. Everything becomes the pressing need.

This is deliberately uncomfortable to read. A being without practice resources under pressure *should* sound overwhelmed. That's honest. The consumed state creates urgency — for the being to develop practices, for the author to reconsider the configuration, or for the consuming framework to intervene.

## Authoring for the Quadrants

The most common mistake is authoring beings that start in one quadrant and stay there. Interesting beings *move* between quadrants over time:

- A being starts **clear & resourced** (moderate drives, moderate practices)
- Isolation drifts drives down and decays practices → moves toward **stretched** or **consumed**
- Interaction satiates drives → moves toward **clear**
- Pressured choices under difficulty deepen practices → moves toward **held**
- Sustained tending keeps the being in **clear & resourced**

The quadrant a being occupies right now is less important than the *trajectory* — is it developing or eroding?

## How to Test Your Being Across Quadrants

Simulate all four states and read the felt output:

```ts
// Satisfied + Practiced
const sp = createBeing({ ...config,
  drives: { ...config.drives, drives: config.drives.drives.map(d => ({ ...d, initialLevel: 0.85 })) },
  practices: { seeds: config.practices.seeds?.map(s => ({ ...s, initialDepth: 0.6 })) },
});

// Satisfied + Unpracticed
const su = createBeing({ ...config,
  drives: { ...config.drives, drives: config.drives.drives.map(d => ({ ...d, initialLevel: 0.85 })) },
  practices: {},
});

// Unsatisfied + Practiced
const up = createBeing({ ...config,
  drives: { ...config.drives, drives: config.drives.drives.map(d => ({ ...d, initialLevel: 0.15 })) },
  practices: { seeds: config.practices.seeds?.map(s => ({ ...s, initialDepth: 0.6 })) },
});

// Unsatisfied + Unpracticed
const uu = createBeing({ ...config,
  drives: { ...config.drives, drives: config.drives.drives.map(d => ({ ...d, initialLevel: 0.15 })) },
  practices: {},
});

for (const [label, being] of [["SP", sp], ["SU", su], ["UP", up], ["UU", uu]]) {
  const s = metabolize(being);
  console.log(`${label} [${s.orientation}]: ${s.felt}\n`);
}
```

If you can't tell the quadrants apart from their prose, the configuration needs work. If they all sound like status reports, the drive names or practice seeds need tuning. If consumed and held sound similar, the practice depths aren't differentiated enough.

## The Quadrants and Capability Access

The `any` condition in capability subscriptions means different quadrants access different capabilities through different paths:

- **Satisfied + Practiced:** Capabilities via both tier-satisfaction AND practice-depth paths
- **Satisfied + Unpracticed:** Capabilities via tier-satisfaction only
- **Unsatisfied + Practiced:** Capabilities via practice-depth only — the monk's path
- **Unsatisfied + Unpracticed:** Minimal capabilities — only `always` conditions pass

The third row is the key insight. A being whose drives are unmet can still access higher capabilities *if* it has done the inner work. This is what makes the system non-coercive.
