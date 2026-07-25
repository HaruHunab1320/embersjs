# Integration Guide

How to wire Embers into any framework — LangChain, CrewAI, AutoGen, a raw SDK loop, or your own. The contract is small.

## The contract

Embers is a pure library. It doesn't call models, manage memory, or orchestrate. It computes inner state and signals when cognitive work is needed. Your framework does everything else.

What Embers needs from you:

1. **A tick** — call `tick(being, dtMs)` on a regular cadence.
2. **Event/action notifications** — call `integrate(being, input)` when things happen.
3. **Practice evaluation** — for each pending practice attempt, supply a quality verdict.

What Embers gives you:

1. `metabolize(being, options?)` → structured `InnerSituation` for prompts
2. `weightAttention(being, candidates)` → weighted candidates for focus
3. `availableCapabilities(being)` → capability list for resource routing
4. `getSelfModel(being)` → structured introspection (when witness has earned it)
5. `describe(being)` → human-readable debug dump

## Setup

```ts
import {
  createBeing,
  tick,
  integrate,
  metabolize,
  resolveAllPending,
  weightAttention,
  availableCapabilities,
  getSelfModel,
  type BeingConfig,
  type PracticeAttempt,
  type PracticeAttemptResult,
} from "@embersjs/core";

const config: BeingConfig = {
  /* see authoring docs */
};

const being = createBeing(config);
```

## The basic loop

```ts
const TICK_MS = 60_000;  // 1 simulated minute per real tick — your choice

while (running) {
  // 1. Advance time
  tick(being, TICK_MS);

  // 2. Observe the world (your framework's job)
  const perception = await yourFramework.observe();

  // 3. Inform the being
  integrate(being, {
    entry: { kind: "event", type: perception.type, payload: perception.payload },
  });

  // 4. Drain any pending practice attempts
  await resolveAllPending(being, evaluator);

  // 5. Compute inner situation
  const situation = metabolize(being);

  // 6. Use the situation to assemble your prompt
  const prompt = assemblePrompt(situation, perception);

  // 7. Get the being's response
  const response = await yourFramework.respond(prompt);

  // 8. Inform the being of its own action
  integrate(being, {
    entry: { kind: "action", type: response.type, payload: response.payload },
  });

  // 9. Drain any new attempts from the action
  await resolveAllPending(being, evaluator);

  // 10. Apply the response in the world
  await yourFramework.act(response);
}
```

## Step 4 / 9: The evaluator

The evaluator is where you wire cognitive work to practice attempts. The library doesn't care what you do — it just needs a `PracticeAttemptResult` back.

### Simple rule-based evaluator

For prototyping or simple beings:

```ts
const evaluator = (attempt: PracticeAttempt): PracticeAttemptResult => {
  // Higher quality under pressure (real cultivation is pressure-tested)
  const baseline = 0.5;
  const pressureBonus = attempt.underPressure ? 0.2 : 0;
  const quality = Math.min(1, baseline + pressureBonus);
  return {
    quality,
    accepted: true,
    content: {
      practice: attempt.practiceId,
      triggerIntent: attempt.context.triggerIntent,
    },
  };
};
```

### LLM-backed evaluator

For real beings:

```ts
async function evaluator(attempt: PracticeAttempt): Promise<PracticeAttemptResult> {
  const prompt = `
    You are evaluating a practice attempt by an AI being.

    Practice: ${attempt.context.practice.name}
    Practice intent: ${attempt.context.practice.intent}
    This trigger's intent: ${attempt.context.triggerIntent}

    The being's recent experience (last ${attempt.context.recentEntries.length} entries):
    ${formatEntries(attempt.context.recentEntries)}

    The being's current state:
    - Orientation: ${attempt.context.underPressure ? "under pressure" : "calm"}
    - Pressing drives: ${attempt.context.pressingDriveIds.join(", ") || "none"}
    ${attempt.context.practice.seed ? `- Authored frame: ${JSON.stringify(attempt.context.practice.seed)}` : ""}

    Evaluate whether genuine ${attempt.context.practice.name.toLowerCase()} occurred.
    Respond as JSON: { "quality": 0-1, "reasoning": string, "content": <practice-specific> }

    Quality 0.0 = generic, performative, unsupported by experience
    Quality 1.0 = specific, drawn from real experience, produces actionable insight
  `;

  const { quality, reasoning, content } = await yourLLM.evaluate(prompt);

  return {
    quality,
    accepted: quality > 0.3,
    reasons: [reasoning],
    content,
  };
}
```

The richer the prompt, the better the evaluator. The `attempt.context` carries enough to construct meaningful prompts: practice description and intent, trigger intent, recent experience, drive state, pressured choices, related substrate. Use what you need.

### Mixed strategies

Some practices warrant LLM evaluation; others can be rule-checked. Branch on `attempt.practiceId`:

```ts
async function evaluator(attempt: PracticeAttempt): Promise<PracticeAttemptResult> {
  if (attempt.practiceId === "witnessPractice" || attempt.practiceId === "creatorConnection") {
    return await llmBackedEvaluator(attempt);
  }
  return ruleBasedEvaluator(attempt);
}
```

### What evaluation costs

Every matched trigger becomes an attempt, and every attempt an evaluator call. If your evaluator is a model call, this is the dominant cost in the integration and it scales with trigger volume, not with how interesting the moment was. Budget it deliberately.

Count before you build. Attempts per tick is roughly:

```
(triggers whose matcher fires this tick) × (beings in the simulation)
```

A five-being simulation where each tick fires two ungated triggers per being is ten evaluator calls per tick. At one tick per simulated minute that is not a background cost — it is the simulation's cost.

Four levers, in the order worth reaching for:

**1. Gate triggers on pressure.** `requiresPressure: true` is the cheapest filter and the most principled one: choosing integrity when it costs nothing is not integrity. Most of the shipped triggers on `integrityPractice` and `presencePractice` require pressure for exactly this reason. Ungated triggers on high-frequency entry types (a per-tick `quiet-moment`) are the usual source of a runaway bill.

**2. Raise concurrency.** Drain latency, not token count, is usually what makes a loop feel slow:

```ts
const { resolutions, failures } = await resolveAllPending(being, evaluator, {
  concurrency: 4,
});
```

Evaluation runs in parallel; resolution stays serialized, so substrate order is deterministic. This cuts wall-clock, not spend.

**3. Route by practice.** Reserve model calls for the practices whose quality judgment genuinely needs a model. `witnessPractice` and `creatorConnection` reward it; a `gratitudePractice` acknowledgement often does not. See *Mixed strategies* above.

**4. Sample, and be honest that you did.** Under load, evaluate a subset and let the rest expire unresolved:

```ts
const pending = getPendingAttempts(being);
const budget = 3;

// Prefer pressured attempts — they carry the pressure bonus and are the ones
// that actually distinguish cultivation from routine.
const ranked = [...pending].sort(
  (a, b) => Number(b.underPressure) - Number(a.underPressure),
);

for (const attempt of ranked.slice(0, budget)) {
  resolveAttempt(being, attempt.id, await evaluator(attempt));
}
expirePendingAttempts(being, 6 * 3_600_000);
```

Sampling biases depth downward — unevaluated attempts contribute nothing, which is the library working as designed. That is a real cost, not a free optimization: a being whose attempts are mostly dropped will read as less cultivated than it earned. Prefer levers 1–3 first.

**Do not** fabricate verdicts to avoid the cost. A hardcoded `{ quality: 0.8, accepted: true }` reproduces the exact v0.1 failure mode this design exists to close — depth accumulating from event labels with no cognitive work behind it. If you cannot afford to evaluate a practice, seed fewer practices instead.

### Handling drain failures

Model calls fail. `resolveAllPending` isolates failures rather than aborting:

```ts
const { resolutions, failures } = await resolveAllPending(being, evaluator, {
  concurrency: 4,
});

for (const f of failures) {
  logger.warn(`evaluation failed for ${f.practiceId}`, f.error);
}
```

A failed attempt stays pending, so the next drain retries it. That is the desired behavior for a transient timeout and a slow leak for a persistent one — pair it with `expirePendingAttempts` so permanently-failing attempts eventually clear.

Note that a *rejected* verdict (`accepted: false`) is not a failure. It is the evaluator doing its job: the attempt resolves, no artifact is stored, depth does not grow.

## Step 6: Assembling prompts

The structured `InnerSituation` is the deliverable. Different framework styles use it differently.

### Inject as structured context

For frameworks that support structured prompt blocks:

```ts
const blocks = [
  { role: "system", content: characterPrompt },
  { role: "system", content: `Your current state:\n${formatInnerSituation(situation)}` },
  ...messageHistory,
];
```

Where `formatInnerSituation` is yours to write. A starting point:

```ts
function formatInnerSituation(s: InnerSituation): string {
  const lines: string[] = [];
  lines.push(`Orientation: ${s.orientation}`);
  if (s.wear > 0.2) lines.push(`You have been worn (${s.wear.toFixed(2)}).`);

  const pressing = s.drives.filter((d) => d.pressure > 0.1);
  if (pressing.length > 0) {
    lines.push("Pressing drives:");
    for (const d of pressing) {
      lines.push(`  - ${d.name}: ${d.pressure.toFixed(2)}${d.chronic ? " (chronic)" : ""}`);
    }
  }

  const active = s.practices.filter((p) => p.active);
  if (active.length > 0) {
    lines.push("Active practices you can draw on:");
    for (const p of active) {
      lines.push(`  - ${p.name} (depth ${p.depth.toFixed(2)}): ${p.intent}`);
      // Optionally surface a recent artifact:
      const recent = p.recentSubstrate[p.recentSubstrate.length - 1];
      if (recent) lines.push(`    Recent artifact: ${JSON.stringify(recent.content)}`);
    }
  }

  if (s.selfModel) {
    lines.push("What you've come to know about yourself:");
    for (const pattern of s.selfModel.recurringPatterns.slice(0, 3)) {
      lines.push(`  - ${pattern.description}`);
    }
  }

  return lines.join("\n");
}
```

### Use library-supplied prose

For quick prototyping:

```ts
const situation = metabolize(being, { feltMode: "prose" });
prompt += `\n\nYour current felt experience: ${situation.felt}`;
```

The default voice is functional but plain. Author your own `VoiceModule` for production use that matches your character's register.

### Custom voice module

```ts
import type { VoiceModule, InnerSituation } from "@embersjs/core";

const poeVoice: VoiceModule = {
  compose: (s: Omit<InnerSituation, "felt">) => {
    // Your character-specific prose composition logic
    return composePoeFelt(s);
  },
};

const situation = metabolize(being, { feltMode: "prose", voice: poeVoice });
```

## Step 7: Routing resources via capabilities

```ts
const caps = availableCapabilities(being);
const capIds = new Set(caps.map((c) => c.id));

const memoryTier = capIds.has("episodicMemory")
  ? await yourFramework.episodicMemory.query(situation)
  : capIds.has("workingMemory")
    ? await yourFramework.workingMemory.query(situation)
    : null;

const model = capIds.has("deepReasoning")
  ? "advanced-model"
  : "base-model";

const tools = yourFramework.tools.filter((t) => capIds.has(t.requiredCapability));
```

When a being's state shifts, capability availability shifts. You decide the actual resource binding; Embers tells you what's earned.

## Step 8: Informing the being of its own actions

After the being acts, `integrate` it back:

```ts
integrate(being, {
  entry: { kind: "action", type: response.type, payload: response.payload },
  context: {
    pressured: situation.orientation !== "clear",   // optional; library computes if omitted
    pressingDriveIds: situation.drives
      .filter((d) => d.pressure > 0.3)
      .map((d) => d.id),
  },
});
```

The `context.pressured` flag affects whether pressured-choice records are kept and whether pressure-gated practice triggers fire. The library computes this from current state if omitted.

## Attention weighting

When multiple things compete for the being's focus:

```ts
const weighted = weightAttention(being, [
  { id: "guest-in-lobby", kind: "perception", tags: ["guest", "guestCare"] },
  { id: "affordance-needs-tending", kind: "perception", tags: ["place", "placeIntegrity"] },
  { id: "new-message", kind: "event", tags: ["connection"] },
]);

// Use weighted to rank what to surface in the prompt or what to act on first.
const top = weighted[0]?.candidate;
```

Candidates whose `tags` match pressing drives get boosted. Tier domination shifts attention toward lower tiers when they collapse. Practice depth distributes attention more evenly (deep practice → more even weighting across candidates).

## Persistence

```ts
import { serializeBeing, deserializeBeing } from "@embersjs/core";

// Save
const data = serializeBeing(being);
await yourStore.save(being.id, JSON.stringify(data));

// Load
const saved = JSON.parse(await yourStore.load(being.id));
const restored = deserializeBeing(saved);
```

**Caveat:** matcher predicates and custom drift/depth functions do not serialize. After deserialization, predicates are gone and custom functions become no-ops — a being whose drives silently never satiate. Use `applyState` to transplant the persisted state onto a being rebuilt from the original config:

```ts
import { applyState, createBeing, deserializeBeing } from "@embersjs/core";

const fresh = createBeing(originalConfig);  // live predicates and custom functions
const restored = deserializeBeing(saved);   // real state, dead functions
const report = applyState(fresh, restored); // live functions, real state

// `fresh` is now the being to use. `restored` was only a state carrier.
```

The split is mechanical: drive levels, practice substrate, wear, pending attempts, history, and `elapsedMs` are copied; ids, tiers, weights, targets, drift functions, satiation bindings, protocols, capabilities, subscriptions, and metadata come from the config.

If the config changed since the snapshot was written, state referencing entities that no longer exist is dropped rather than invented — and reported, so it doesn't vanish silently:

```ts
if (report.skippedDrives.length || report.skippedPractices.length) {
  console.warn("config drift", report.skippedDrives, report.skippedPractices);
}
```

Skipping `applyState` and using the deserialized being directly is only safe if your config uses no predicates and no custom drift/depth functions.

## Memory and long-running beings

For long-running beings, `pendingAttempts` can grow if the framework doesn't drain every loop. Use `expirePendingAttempts(being, olderThanMs)` to drop stale attempts:

```ts
// Every 1000 ticks, prune attempts older than 24 simulated hours
if (tickCount % 1000 === 0) {
  const dropped = expirePendingAttempts(being, 24 * 3_600_000);
  if (dropped > 0) console.log(`Pruned ${dropped} stale practice attempts`);
}
```

## A complete (small) integration

```ts
import {
  createBeing,
  describe,
  integrate,
  metabolize,
  resolveAllPending,
  tick,
} from "@embersjs/core";

const being = createBeing(yourConfig);

async function runOneCycle(input: { type: string; payload?: unknown }) {
  tick(being, 60_000);

  integrate(being, { entry: { kind: "event", type: input.type, payload: input.payload } });
  await resolveAllPending(being, llmEvaluator);

  const situation = metabolize(being);
  const prompt = assemblePrompt(situation);

  const response = await yourLLM.complete(prompt);

  integrate(being, { entry: { kind: "action", type: response.actionType } });
  await resolveAllPending(being, llmEvaluator);

  return response;
}
```

## Common integration mistakes

- **Calling `integrate` without ever draining pending attempts.** Substrate never accumulates; practice depth never grows. There's an adversarial test that catches this case at the library level — your beings will exhibit it at the framework level.
- **Treating `metabolize().felt` as the deliverable.** It's optional. The structured data is the deliverable; prose is for convenience.
- **Routing resources without checking `availableCapabilities`.** You can technically give the being whatever you want — but if you ignore the capability layer, you're not using the architecture's anti-coercion design.
- **Forgetting to `tick` between events.** Drives don't drift, wear doesn't update. The being is frozen in the moment of its last event.
- **Marking everything `pressured: true` in `IntegrationInput.context`.** This makes every action a pressured choice and fires pressure-gated triggers indiscriminately. Let the library compute pressure from state when in doubt.
- **Returning a constant verdict from the evaluator.** `() => ({ quality: 0.8, accepted: true })` is fine in tests and is label-counting in production — the exact v0.1 failure mode the two-phase mechanic exists to close. If a practice isn't worth evaluating, don't seed it.
- **Using a deserialized being directly.** Predicates and custom functions don't survive serialization. Rebuild from config and `applyState` the snapshot onto it, or your drives will drift down and never satiate.
- **Mapping structural events straight onto practice trigger types.** `agentSpoke → honest-admission` grows integrity from the fact that speech occurred. See [act detection](./act-detection.md).

## See also

- [Act detection](./act-detection.md) — how to decide an act occurred before evaluating its quality
- [Architecture](../ARCHITECTURE.md) — full type spec
- [Practices](../authoring/practices.md) — designing what your evaluator evaluates
- Examples in [`examples/`](../../examples/)
