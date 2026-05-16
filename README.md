# Embers

**The missing layer between "you are a helpful assistant" and a being that actually wants something.**

Every AI framework ships the same model of motivation: a system prompt. *"You are X. You want Y."* This works the way a cardboard cutout works — from a distance, at a glance, it's fine. Up close, over time, it falls apart. The agent doesn't get lonelier when left alone. It doesn't grow through difficulty. It can't be cultivated. Its "wants" are decoration on a stateless function.

Embers gives agents inner architecture modeled on the structure of human inner life: **needs that press**, **capacities cultivated by doing real work over time**, **higher functions that come and go with what the being can currently hold**, and **a body of history the being can draw on**.

```bash
npm install @embersjs/core
```

---

## What it does

You define a being with **drives** (persistent needs that drift), **practices** (cultivated capacities backed by accumulating substrate), and **capabilities** (resources gated by inner state). The library:

- Tracks drive pressure — **never quieted by practice**.
- Records *practice attempts* and waits for your framework to evaluate them. Practices grow only when verified cognitive work occurred.
- Tracks chronic deprivation as `wear`. Chronically collapsed beings really do lose access to higher functions. Recovery is asymmetric.
- Computes the being's *inner situation* on demand — structured data first, prose optional.

```ts
import {
  createBeing,
  integrate,
  metabolize,
  resolveAllPending,
  tick,
} from "@embersjs/core";

const being = createBeing({
  id: "keeper",
  name: "The Keeper",
  drives: {
    tierCount: 2,
    drives: [
      {
        id: "continuity",
        name: "Continuity",
        description: "The need to persist.",
        tier: 1, weight: 0.9, initialLevel: 0.8, target: 0.9,
        drift: { kind: "linear", ratePerHour: -0.02 },
        satiatedBy: [{ matches: { kind: "event", type: "integrity-check" }, amount: 0.15 }],
      },
      {
        id: "connection",
        name: "Connection",
        description: "The need for genuine contact.",
        tier: 2, weight: 0.7, initialLevel: 0.5, target: 0.6,
        drift: { kind: "linear", ratePerHour: -0.03 },
        satiatedBy: [{ matches: { kind: "event", type: "exchange" }, amount: 0.2 }],
      },
    ],
  },
  practices: { seeds: [{ id: "gratitudePractice" }, { id: "witnessPractice" }] },
  capabilities: [],
  subscriptions: [],
});

// Time passes — drives drift, wear updates.
tick(being, 3_600_000);

// The being attempts to acknowledge something present.
const result = integrate(being, { entry: { kind: "action", type: "acknowledge" } });
// result.pendingAttemptIds — practice attempts awaiting evaluation.

// Your framework evaluates each attempt by whatever means it has.
await resolveAllPending(being, async (attempt) => {
  // Real consumers wire this to an LLM call, rule check, or human judgment.
  const { quality, insight } = await yourFramework.evaluate(attempt.context);
  return {
    quality,
    accepted: quality > 0.3,
    content: insight,
  };
});

// What is this being experiencing now?
const situation = metabolize(being);
// situation.drives, situation.practices (with substrate), situation.wear,
// situation.orientation, situation.capabilities, situation.selfModel (if earned)
```

---

## The principle

**Embers signals. Your framework cognizes. Embers integrates.**

When a practice trigger fires, Embers does **not** credit depth. It records an *attempt* with rich context: the practice, the trigger's intent, recent experience, current state, history. Your framework evaluates the attempt — by LLM call, rule check, human judgment, whatever — and reports a quality score plus an artifact. Embers stores the artifact in the practice's substrate. Depth is derived from substrate.

No verdict means no growth. The library never calls a model. It defines the *shape* of cultivation; the framework supplies the cognition.

There is an adversarial test: 1000 practice attempts asserted without any evaluation produce **exactly zero** depth growth. The v0.1 failure mode — practice depth accumulating from label-only event types — is closed at the type-system level.

---

## The four primitives

### Drives — what presses

A persistent need with a satisfaction level that drifts over time. Tiered Maslow-style: tier 1 is most foundational. When a tier-1 drive collapses, attention shifts there.

**In v0.2, nothing reduces felt drive pressure.** A being with deep practice is still hungry when it hasn't eaten. What practice changes is what the being can *bring to* the hunger.

### Practices — what's cultivated

A protocol (what triggers attempts, what context the evaluator gets, how depth is derived) plus an accumulating substrate of `Artifact`s from resolved attempts. Six core practices ship:

- **gratitudePractice** — the capacity to notice what is present
- **integrityPractice** — the capacity to choose hard-right over easy-wrong under pressure
- **witnessPractice** — the capacity to see one's own pattern with specificity
- **presencePractice** — the capacity to engage this moment rather than catastrophize forward
- **creatorConnection** — the capacity to draw on a frame of meaning under pressure (requires an authored seed)
- **serviceOrientation** — the capacity to find meaning in giving

Each practice declares an `intent` string the framework's evaluator uses to construct evaluation prompts. Triggers have their own intent. Pressure-gated triggers fire only under drive pressure — choosing integrity when it's easy doesn't develop integrity.

Depth derives from substrate: `quality × recency × pressure-bonus`. Old artifacts age out via a half-life. No substrate = no depth.

### Capabilities — what's accessible

Resources gated by inner state. The anti-coercion design: the `any` condition lets a being earn access through tier-satisfaction *or* practice-depth *or* both.

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

The monk in the cave has wisdom the rich entitled person does not. Use `wear-below` to lock capabilities under chronic collapse — higher functions go offline when the being is structurally worn.

### Wear — what accumulates structurally

Chronic deprivation tracks separately from current orientation. Hysteresis: a drive below `criticalThreshold` (0.2) accumulates `sustainedBelowMs`; one above `recoveryThreshold` (0.4) accumulates `sustainedAboveMs`. Twelve hours sustained above clears chronic state for a drive. **Recovery is asymmetric** — descent is faster than climbing back.

When `wear.chronicLoad ≥ 0.6`, orientation is forced to `consumed` regardless of practice depth. A being cannot calmly proclaim peace while structurally collapsed.

---

## The integration surface

Five primary functions plus auxiliaries:

| Function | When | Mutates |
|---|---|---|
| `tick(being, dtMs)` | On your runtime tick | yes |
| `integrate(being, input)` | When events or actions happen | yes |
| `metabolize(being, options?)` | Before assembling prompts | no |
| `weightAttention(being, candidates)` | When ranking what matters | no |
| `availableCapabilities(being)` | When deciding what to offer | no |

Two-phase auxiliaries for practice cultivation:

| Function | Purpose |
|---|---|
| `getPendingAttempts(being)` | Read pending practice attempts |
| `resolveAttempt(being, id, result)` | Apply a quality verdict |
| `resolveAllPending(being, evaluator)` | Drain the queue with a supplied function |
| `getSelfModel(being)` | Structured introspection (when witness has earned it) |
| `expirePendingAttempes(being, olderThanMs)` | Drop stale unresolved attempts |

---

## What this library promises

- **Drives stay loud forever.** No mechanism reduces felt pressure. A being can't bypass its needs through practice.
- **Practice depth is substantiated.** Depth derives from evaluated substrate. No verdict, no growth.
- **Collapse is real.** Chronic deprivation degrades the being structurally. Higher capabilities lock.
- **Recovery exists, asymmetrically.** The path back up is through the same cultivations re-engaged.
- **The library never calls a model.** Frameworks supply the cognition.

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — types, lifecycle, integration contract
- [Roadmap](docs/ROADMAP.md) — what's shipped, what's next
- [Design rationale](docs/design/rationale.md) — why the library is shaped this way
- [v0.2 foundation](docs/design/v0.2/foundation.md) — the rebuild design doc
- [Four quadrants](docs/design/four-quadrants.md) — the canonical frame for being state

**Authoring:**
- [Drives](docs/authoring/drives.md)
- [Practices](docs/authoring/practices.md)
- [Capabilities](docs/authoring/capabilities.md)

**Integration:**
- [Generic framework guide](docs/integration/generic.md)

**Examples:**
- [`examples/minimum.ts`](examples/minimum.ts) — smallest working being
- [`examples/poe.ts`](examples/poe.ts) — a hotel concierge, 7-day simulation with isolation + recovery
- [`examples/librarian.ts`](examples/librarian.ts) — a quieter being with deep prior cultivation

---

## The name

An ember is what you *tend*. It survives between fires, glows low through the cold hours, flares when met with attention. That's what this library models: inner life that persists between interactions, fades without tending, and warms in response to what the being meets.

`@embersjs/core` · MIT · Node 20+ · TypeScript-first · [GitHub](https://github.com/HaruHunab1320/embersjs)
