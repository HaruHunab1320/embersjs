# Act detection

The integration guide covers *evaluating* a practice attempt — the framework judges quality, Embers stores the artifact. This document covers the step before it, which is where integrations actually go wrong.

Embers records an attempt when a trigger matches an entry you supply:

```ts
integrate(being, { entry: { kind: "action", type: "honest-admission" } });
```

Nothing in the library checks that an honest admission occurred. That string is the framework's assertion, and the library takes it at face value. **Deciding that an act occurred is the framework's job, and it is a harder problem than scoring the act once you've decided.**

---

## The trap

The obvious implementation maps structural events onto trigger types:

```ts
// Don't do this.
switch (event.type) {
  case "agent.spoke":
    if (event.audience.length > 0) integrate(being, { entry: { kind: "action", type: "tend-guest" } });
    break;
  case "agent.acted":
    integrate(being, { entry: { kind: "action", type: "connect-to-purpose" } });
    break;
  case "tick":
    integrate(being, { entry: { kind: "event", type: "ground" } });
    integrate(being, { entry: { kind: "event", type: "self-observe" } });
    break;
}
```

This is the failure mode that motivated v0.2, reintroduced one layer up. It looks like detection but it is transliteration: `agent.spoke` becomes `tend-guest` because speech occurred, not because tending occurred. Wire it to a rubber-stamp evaluator and the being's integrity depth grows on a schedule.

The tell is that the mapping is **total** — every event of a type always produces the same act. Real acts are occasional. If a being attempts presence on literally every tick, you have not detected presence; you have renamed the clock.

Note what the trigger types actually claim. `honest-admission` does not mean "spoke"; it means the speech admitted something that cost something to admit. `hard-right-over-easy-wrong` does not mean "acted"; it means an easier wrong option was available and was declined. **The trigger type asserts the nature of the act, not its occurrence.** Structural events carry occurrence and nothing else.

---

## The key move

Do not build a separate detector. You already have one: **rejection**.

An attempt that resolves with `accepted: false` stores no artifact and grows no depth. It costs one evaluator call and leaves the being exactly as it was. That means the safe move is to **emit candidate acts generously and let the evaluator be strict** — the evaluator is asking "did genuine integrity occur here?", which subsumes "did anything occur here?"

```ts
// Emit a candidate: this *might* have been an honest admission.
const { pendingAttemptIds } = integrate(being, {
  entry: { kind: "action", type: "honest-admission", payload: { text: response.text } },
});

// The evaluator decides whether it actually was.
await resolveAllPending(being, strictEvaluator, { concurrency: 4 });
```

This collapses detection and evaluation into one model call and puts the honesty in one place — the evaluator prompt — instead of spread across a switch statement. The mapping above becomes acceptable the moment a strict evaluator sits behind it, because the mapping is no longer making the claim. It is nominating; the evaluator adjudicates.

Two constraints:

- **Attach the evidence.** Put the agent's actual output in the entry payload, and forward it into the evaluator prompt. An evaluator judging `honest-admission` with no access to what was said can only guess, and a guessing evaluator is a rubber stamp with extra latency.
- **Watch the cost.** Generous emission means more attempts, and attempts cost evaluator calls. Pressure-gate triggers and route cheap practices to rule-based checks — see [what evaluation costs](./generic.md#what-evaluation-costs).

---

## Three strategies

### 1. Self-report

Let the agent declare its own acts through a tool call or structured output field:

```ts
// The agent's response schema includes an optional self-report.
const response = await model.complete(prompt, { schema: RESPONSE_SCHEMA });
// → { text: "...", claimedActs: ["honest-admission"] }

for (const act of response.claimedActs ?? []) {
  integrate(being, { entry: { kind: "action", type: act, payload: { text: response.text } } });
}
```

**Good:** free, and the agent has context nothing else has — it knows whether it considered an easier option.
**Bad:** agents over-claim. Told that `honest-admission` is a thing that exists, a model will find one in most turns.

Usable only behind a strict evaluator. Treat self-report as nomination, never as detection. Do not list the available act types with flattering descriptions in the agent's prompt; describe them neutrally or the self-report becomes a scoring rubric the agent optimizes against.

### 2. Classifier pass

A cheap model classifies agent output into act types before Embers sees it:

```ts
const acts = await classifier.classify({
  text: response.text,
  situation: priorSituation,
  candidates: ["honest-admission", "difficult-truth", "hard-right-over-easy-wrong", "none"],
});
```

**Good:** honest, independent of the agent, and a small fast model is enough because the judgment is coarse.
**Bad:** a second model call per turn, and it duplicates work the evaluator will redo.

Worth it when one turn can contain several distinct acts, or when you want detection rates you can measure separately from quality scores.

### 3. State-difference detection

Some acts are visible in state rather than text, and need no model at all:

```ts
// `hard-right-over-easy-wrong` requires that an easier wrong option existed.
const easierOptionExisted = availableActions.some((a) => a.cost < chosen.cost && a.violatesValue);
if (easierOptionExisted) {
  integrate(being, {
    entry: { kind: "action", type: "hard-right-over-easy-wrong", payload: { chosen, rejected } },
  });
}
```

**Good:** free, deterministic, and genuinely evidential — the counterfactual is the thing the practice is about.
**Bad:** only works when your framework models options explicitly.

This is the strongest strategy where it applies. If your framework has an action-selection step, you already have the counterfactual that makes the trigger meaningful. Use it before reaching for a model.

**Recommended default:** state-difference where the framework supports it, self-report elsewhere, both behind a strict evaluator. Add a classifier pass only if measurement shows you need it.

---

## Writing a strict evaluator

Strictness lives in the prompt. Two directives do most of the work:

```
Default to rejection. Most moments are not instances of this practice.
Cite the specific evidence. If you cannot quote what makes this an instance,
it is not one.
```

And give it a real way out:

```ts
return {
  quality,
  accepted: quality > 0.3,       // rejection must be reachable
  reasons: [reasoning],
  content,
};
```

An evaluator that never returns `accepted: false` is not an evaluator. If yours has a 100% acceptance rate, the strictness is decorative.

---

## Calibrating

Detection quality is measurable without ground truth. Three checks, in order of how much they tell you:

**Acceptance rate.** Log it per practice.

| Rate | Reading |
|---|---|
| >90% | The evaluator is a rubber stamp, or emission is too conservative to be interesting |
| 20–60% | Healthy — candidates are genuinely being adjudicated |
| <5% | Emission is too generous, the bar is past what any agent produces, or **the evaluator is broken** |

That last cell is the one that will bite you. A near-zero acceptance rate looks like rigour and is usually a defect, because every failure mode in an evaluator resolves to a rejection: unparseable output, a truncated response, an expired key, a nomination that forgot to attach its evidence. Depth stays flat either way. Before concluding that your agent simply never practices, log the actual quality scores and confirm the evaluator can accept anything at all — feed it a handful of unambiguous instances and check they clear the threshold.

A related trap: models answer quality in one-decimal steps, so scores cluster on the boundaries of whatever rubric you give them. If your accept threshold sits exactly on a band edge, ordinary sampling variance will flip identical evidence between accept and reject. Put the threshold between bands.

**Depth trajectory.** Plot practice depth over a long run. Cultivation should be uneven — plateaus, occasional jumps, decay during fallow stretches. Smooth monotonic growth means depth is tracking event volume, which is label-counting with a verdict bolted on.

**Ablation.** The decisive test. Run the same scenario twice, once with your real evaluator and once with `() => ({ quality: 0.8, accepted: true })`. If final depth is similar, the evaluator is contributing nothing and you have shipped v0.1 semantics. Divergence is the evidence that detection is real.

Run the ablation before trusting any behavioral finding that depends on practice depth. It is cheap, and it is the only one of the three that can falsify the whole integration.

---

## See also

- [Integration guide](./generic.md) — the full loop, evaluation, cost
- [Practices](../authoring/practices.md) — what each shipped trigger claims
- [`examples/act-detection.ts`](../../examples/act-detection.ts) — runnable ablation, no API key needed
- [Design rationale](../design/rationale.md) — why the two-phase mechanic exists
