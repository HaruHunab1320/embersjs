# Integration Guide

How to wire Embers into any framework — LangChain, CrewAI, a raw SDK loop, or your own.

## The Contract

Embers is a pure library. It doesn't call models, manage memory, or orchestrate. It computes inner state and produces prompt-ready output. Your framework does everything else.

What Embers needs from you:
1. Call `tick()` on a regular cadence
2. Call `integrate()` when events happen or the being acts
3. That's it

What Embers gives you:
1. `metabolize()` → the being's felt inner situation (for prompts)
2. `weightAttention()` → weighted candidates (for focus)
3. `availableCapabilities()` → what resources are accessible right now

## Setup

```ts
import {
  createBeing,
  tick,
  integrate,
  metabolize,
  weightAttention,
  availableCapabilities,
} from "@embersjs/core";
import type { BeingConfig } from "@embersjs/core";

const config: BeingConfig = {
  // ... your being config
};

const being = createBeing(config);
```

## The Runtime Loop

### 1. Tick

Call `tick()` every time your runtime loops. Pass the elapsed milliseconds since the last tick.

```ts
tick(being, dtMs);
```

This advances drive drift and practice decay. The being's state changes over time even without events — drives become less satisfied, practices erode. That's the point: a being left alone for hours is different from a being that just received attention.

**How often to tick:** Match your framework's cadence. If you tick every 30 seconds, pass 30000. If you tick every minute, pass 60000. The library handles any interval — it's just math.

### 2. Metabolize

Call `metabolize()` before assembling a prompt.

```ts
const situation = metabolize(being);
```

Returns an `InnerSituation`:
- `situation.felt` — prose to include in your prompt
- `situation.orientation` — "clear", "held", "stretched", or "consumed"
- `situation.dominantDrives` — what's pressing, with felt descriptions
- `situation.practiceState` — all practices with depth and active status

**How to use in prompts:**

```ts
const prompt = `
${character.personality}

${situation.felt}

${character.instructions}
`;
```

The felt string is designed to sit alongside character descriptions. It adds *inner state* — what the being is experiencing right now — to the *identity* your character file provides.

### 3. Available Capabilities

Call before deciding what tools, memory layers, or models to offer.

```ts
const caps = availableCapabilities(being);
const capIds = new Set(caps.map(c => c.id));

if (capIds.has("deepMemory")) {
  // Query the deep memory store
}
if (capIds.has("reasoning")) {
  // Use the more capable model
}
```

Capabilities change over time as drives and practices shift. A being that was connected enough for deep memory an hour ago might not be now.

### 4. Weight Attention

When multiple things compete for the being's focus:

```ts
const candidates = perceptions.map(p => ({
  id: p.id,
  kind: p.type,
  tags: p.relevantDrives,  // e.g., ["guestCare", "connection"]
}));

const weighted = weightAttention(being, candidates);
// weighted[0] is the most relevant to this being right now
```

Tags that match pressing drive names get boosted. Practice depth distributes attention more evenly (a being with presence doesn't hyper-focus on the loudest drive).

### 5. Integrate

After the being acts or after an external event:

```ts
// An event happened to the being
integrate(being, {
  entry: { kind: "event", type: "guest-arrived" },
});

// The being took an action
integrate(being, {
  entry: { kind: "action", type: "speak" },
  context: {
    pressured: situation.orientation !== "clear",
    pressingDriveIds: situation.dominantDrives.map(d => d.id),
  },
});
```

The `context.pressured` flag matters for practice development. When true, pressure-gated strengtheners fire — the being is practicing under difficulty, which is what deepens practices.

A good heuristic: set `pressured: true` when the orientation is anything other than "clear."

## Persistence

The library doesn't persist state — you do. Serialize before shutdown, deserialize at startup:

```ts
import { serializeBeing, deserializeBeing } from "@embersjs/core";

// Save
const state = JSON.stringify(serializeBeing(being));
await fs.writeFile("being-state.json", state);

// Restore
const data = JSON.parse(await fs.readFile("being-state.json", "utf-8"));
const being = deserializeBeing(data);
```

**Important:** Custom drift/decay compute functions and matcher predicates can't be serialized. After deserializing, you'll need to reconstruct the being from your original config if you use custom functions. One pattern:

```ts
// Deserialize state, then reconstruct with original config to restore functions
const state = deserializeBeing(data);
const being = createBeing(originalConfig);
// Copy over the mutable state
for (const [id, drive] of state.drives.drives) {
  const target = being.drives.drives.get(id);
  if (target) target.level = drive.level;
}
for (const [id, practice] of state.practices.practices) {
  const target = being.practices.practices.get(id);
  if (target) target.depth = practice.depth;
}
being.elapsedMs = state.elapsedMs;
```

## Debugging

```ts
import { describe } from "@embersjs/core";

console.log(describe(being));
```

Outputs a formatted dump with drive levels (as bar charts), practice depths, orientation, felt string, and history counts. Useful during development to see what's happening inside.

## Common Integration Patterns

### Autonomous Invocation

Use drive pressure to decide whether the being should act even without external stimulus:

```ts
const situation = metabolize(being);
if (situation.dominantDrives.some(d => d.feltPressure > 0.3)) {
  // The being has something pressing — invoke it
  const response = await model.generate(promptWith(situation));
}
```

### Tiered Model Selection

Use capabilities to choose which model to call:

```ts
const caps = availableCapabilities(being);
const model = caps.some(c => c.kind === "model" && c.id === "reasoning")
  ? "claude-sonnet-4-6"
  : "claude-haiku-4-5-20251001";
```

### Memory Layer Selection

```ts
const caps = availableCapabilities(being);
const layers = caps.filter(c => c.kind === "memory").map(c => c.id);
const memories = await memoryStore.query(query, { layers });
```
