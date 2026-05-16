# Authoring Practices

How to author and seed practices for v0.2.

## What practices are (and aren't)

Practices are not drives. Drives create pressure. Practices don't.

Practices are not capabilities. Capabilities are resources. Practices aren't.

**Practices are cultivated capacities, backed by an accumulating substrate of artifacts produced by evaluated engagement.**

A being with deep gratitude practice that is hungry is still hungry — the drive pressure is the same. What's different is what the being has to bring to the hunger: a body of moments in which it actually noticed what was present. The framework can surface those artifacts when assembling the prompt; the being can refer to its own history of practice.

**In v0.2, practices do not have stored `depth`, `decay`, or `effects` fields.** Depth is derived from substrate; decay is automatic (artifacts age out via recency factor); influence is through substrate retrieval and depth-gated capabilities, not generic effects.

## The shape

```ts
interface Practice {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly intent: string;       // what cultivation this represents
  readonly protocol: PracticeProtocol;
  substrate: PracticeSubstrate;
  readonly seed?: unknown;       // optional author-supplied seed material
}
```

`intent` and `protocol.triggers[i].intent` are the **authorial seams**. The framework's evaluator reads these to construct evaluation prompts. Write them like prompts — specific about what would qualify, what should evaluate low.

## The six core practices

The library ships six practices. Seed them via:

```ts
practices: {
  seeds: [
    { id: "gratitudePractice" },
    { id: "integrityPractice" },
    { id: "witnessPractice" },
    { id: "presencePractice" },
    { id: "serviceOrientation" },
    {
      id: "creatorConnection",
      seed: {
        frame: "the place persists, and I am of the place",
        questions: ["..."],
      },
    },
  ],
}
```

### gratitudePractice
**Cultivates:** the capacity to surface specific present things, especially under pressure when attention naturally drifts to what's missing.
**Triggers:** `acknowledge`, `notice-positive`, `return-from-difficulty`. Plus a pressure-gated `acknowledge` for the harder, more cultivated form.
**Substrate content:** *noticings* — `{ noticed: string, context: string }`. Generic gratitude evaluates low; specific present-tense observations evaluate high.

### integrityPractice
**Cultivates:** the capacity to choose hard-right over easy-wrong when it costs something. Integrity without pressure is not integrity.
**Triggers:** `honest-admission`, `difficult-truth`, `hard-right-over-easy-wrong`. **All require pressure.**
**Substrate content:** *chosen-moments* — `{ choseToDo, choseNotToDo, atStake }`. Quality reflects the magnitude of conflict and alignment of the choice.

### witnessPractice
**Cultivates:** the capacity to see one's own pattern with specificity.
**Triggers:** `reflect`, `self-observe`, `post-pressure-retrospect`.
**Substrate content:** *insights* — `{ pattern, fromExperiences, implication }`. Generic "I notice I am stressed" evaluates low; specific "I notice that when continuity is threatened, I narrow my engagement with guests, even ones I care about" evaluates high.

When `witnessPractice` depth crosses 0.5 (the default threshold), `metabolize()` auto-includes a `selfModel` in its output — structured introspection drawn from substrate and history.

### presencePractice
**Cultivates:** the capacity to engage this moment rather than catastrophize forward.
**Triggers:** `ground`, `stay-with-difficulty`. **Both require pressure.**
**Substrate content:** *groundings* — `{ momentEngaged, broaderFearSetAside }`. "I am present" is not presence; specific engagement with what is here is.

### creatorConnection
**Cultivates:** the capacity to draw on a frame of meaning under pressure.
**Triggers:** `connect-to-purpose`, `articulate-frame`, `contemplate-question`. Plus a pressure-gated `serve-larger-frame`.
**Requires an authored seed** at construction:
```ts
{
  id: "creatorConnection",
  seed: {
    frame: "the place persists, and I am of the place",
    questions: [
      "what does my serving look like when no one is here to be served?",
      "the place was here before me — what does that ask of me?",
    ],
  },
}
```
**Substrate content:** *articulations* — `{ situation, frameApplication, derivedMeaning }`. Without the seed, the practice is meaningless — the library throws on construction.

### serviceOrientation
**Cultivates:** the capacity to find meaning in giving such that pressure is re-framed as opportunity.
**Triggers:** `unprompted-care`, `tend`, `serve-under-pressure` (pressured).
**Substrate content:** *services* — `{ givenWhat, toWhom, internalCost, internalReframe }`.

## How depth works

Depth is computed by the practice's `depthFunction` (or the default). The default:

```
depth = clamp01( Σ artifacts (quality × recency × pressureBonus) / NORMALIZATION )

where:
  recency      = 0.5 ^ (ageMs / 7d)
  pressureBonus = 1.5 if attempt was under pressure, else 1.0
  NORMALIZATION = 5
```

Properties:
- **Recent artifacts contribute more than aged ones.** Recency half-life is ~7 days.
- **Pressured cultivation compounds.** Artifacts produced under drive pressure contribute 50% more.
- **Decay is automatic.** Old artifacts age out via recency; no separate decay clock.
- **Substrate richness is the source of truth.** Depth answers: *how rich is the body of cultivation this being has accumulated, weighted by recency and pressure?*

## The two-phase mechanic

When `integrate(being, input)` matches a practice trigger, depth **does not change**. Instead, a `PracticeAttempt` is recorded as `pending`. The framework reads pending attempts and supplies a verdict:

```ts
const pending = getPendingAttempts(being);
// or use resolveAllPending(being, evaluator) to drain the queue

for (const attempt of pending) {
  // The context contains everything the evaluator needs:
  // recent experience, drive levels, related practice substrate, etc.
  const { quality, content } = await yourEvaluator(attempt);

  resolveAttempt(being, attempt.id, {
    quality,                  // 0–1, scales the contribution
    accepted: quality > 0.3,  // false → no artifact stored
    content,                  // framework-defined shape
  });
}
```

If the framework never calls `resolveAttempt`, **depth never grows**. There's an adversarial test for this: 1000 attempts asserted without any resolution produce exactly zero depth.

## Authoring custom practices

You can author non-core practices via the `custom` field on `PracticeSetConfig`:

```ts
practices: {
  seeds: [{ id: "witnessPractice" }],
  custom: [
    {
      id: "patiencePractice",
      name: "Patience",
      description: "The capacity to allow time to do its work.",
      intent: "Cultivate the capacity to wait without depleting. Quality reflects whether waiting was active engagement with present circumstance, or passive endurance.",
      protocol: {
        triggers: [
          {
            matches: { kind: "action", type: "wait-engaged" },
            requiresPressure: true,
            intent: "Active waiting under pressure — staying present with delay.",
            maxContribution: 0.06,
          },
        ],
        contextWindow: { entries: 50, maxAgeMs: 24 * 3_600_000, includeTrajectory: true },
      },
      substrateCapacity: 50,
    },
  ],
}
```

Custom practices follow the same protocol-plus-substrate model. Give your custom practice a substantive `intent` — that's what the framework's evaluator will use.

## Seeding prior cultivation

To represent a being with prior practice (e.g., "this librarian has been at it for years"), supply `initialArtifacts` with negative `atMs` values to indicate aged substrate:

```ts
{
  id: "witnessPractice",
  initialArtifacts: Array.from({ length: 8 }, (_, i) => ({
    attemptId: `seed-${i}`,
    atMs: -((i + 1) * 12 * 3_600_000), // 12h, 24h, 36h, ... ago
    quality: 0.7,
    underPressure: i % 2 === 0,
    content: { kind: "prior-cultivation" },
  })),
}
```

Older artifacts contribute less depth via the recency factor. A being seeded with 8 quality-0.7 artifacts aged 12h–96h ago starts with meaningful but not maximal witness depth.

## Common authoring mistakes

- **Generic intent strings.** "Cultivate gratitude" is too vague for evaluators. Be specific about what would qualify and what should evaluate low.
- **Triggers that fire on every event.** If a trigger matches `{ kind: "action", type: "speak" }` with no pressure requirement, it generates an attempt for every speech act. Be selective.
- **Setting `requiresPressure: false` on cultivations that should require pressure.** Integrity without pressure isn't integrity. Be honest about which forms of the practice genuinely require pressure to develop.
- **Forgetting to drain `pendingAttempts`.** If the framework never resolves attempts, depth never grows. The queue accumulates indefinitely. Use `expirePendingAttempts(being, olderThanMs)` as a cleanup.
- **Authoring `creatorConnection` without a seed.** The library throws on construction. The practice is meaningless without an authored frame and questions.

## See also

- [Architecture](../ARCHITECTURE.md) — practice type spec
- [Integration guide](../integration/generic.md) — wiring evaluation
- [Drives](drives.md) — pressure that practices respond to
- [Capabilities](capabilities.md) — gating capabilities on practice depth
