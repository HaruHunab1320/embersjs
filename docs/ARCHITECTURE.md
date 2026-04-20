# Architecture

Authoritative technical spec for the Embers library. Defines primitives, interfaces, lifecycle, and integration contracts.

Read this alongside `README.md`. The README establishes *why*; this doc establishes *what and how*.

## Structural Overview

The library is organized around five core primitives and the functions that operate on them.

```
┌─────────────────────────────────────────────┐
│                   BEING                      │
│  The container for a complete inner life     │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┼──────────┬──────────────┐
        ▼          ▼          ▼              ▼
   DriveStack   PracticeSet  Subscriptions  History
   (needs)      (orientations) (contingent   (record of
                              access)        becoming)
```

**Being** is the top-level composite. Every operation in the library takes a Being as input.

**DriveStack** holds the tiered organization of drives. Tiered means tier 1 is most foundational, tier N is most self-actualizing. Drives within the same tier compete by weight; drives across tiers interact by domination (but are modulated by practices).

**PracticeSet** holds the being's cultivated practices. Each practice has depth (0-1), decay rate, and strengtheners (what kinds of events develop it).

**Subscriptions** bind capabilities to access conditions. Access can be through drive satisfaction *or* practice depth *or* combinations.

**History** records the being's trajectory — which drives have been pressing, which practices have developed, which choices have been made under pressure. Used for emergent-behavior modes and debugging.

## Core Types

All types live in `src/types.ts`. Keep them stable — changes are breaking for every consumer.

### Being

```ts
interface Being {
  id: string;
  name: string;
  drives: DriveStack;
  practices: PracticeSet;
  subscriptions: Subscription[];
  history: History;
  metadata: Record<string, unknown>;
}
```

A Being is the unit of inner life. One Being per agent. In Haunt, one Being per resident.

### Drive

```ts
interface Drive {
  id: string;
  name: string;
  description: string;                // used in prompts
  tier: number;                       // 1 = most foundational
  weight: number;                     // within-tier importance, 0-1
  level: number;                      // current satisfaction, 0-1 (1 = fully met)
  target: number;                     // homeostatic set point, 0-1
  drift: DriftFunction;               // how level changes over time
  satiatedBy: SatiationBinding[];     // what events/actions satisfy this drive
}

type DriftFunction =
  | { kind: "linear"; ratePerHour: number }   // negative = drifts down (becomes less satisfied)
  | { kind: "exponential"; halfLifeHours: number }
  | { kind: "custom"; compute: (current: number, dtMs: number) => number };

interface SatiationBinding {
  matches: EventMatcher | ActionMatcher;
  amount: number;                     // how much this satiates, 0-1
}
```

A drive's `level` represents *satisfaction*, not *need*. A `level` of 1 means fully met; 0 means dire. This is the inverse of some frameworks — using satisfaction lets the library compute pressure as `(target - level)` naturally.

Drift is usually negative (drives become less satisfied over time, requiring tending). Some drives may drift upward briefly after an event — e.g., an `expression` drive might get a post-activity boost and then decay back.

### DriveStack

```ts
interface DriveStack {
  drives: Map<string, Drive>;
  tierCount: number;
  dominationRules: DominationRules;
}

interface DominationRules {
  threshold: number;              // below this satisfaction, a drive "dominates"
  dampening: number;              // 0-1; how much dominated tiers are dampened
  // If a tier-1 drive is below threshold, tiers 2+ have their felt weight
  // multiplied by (1 - dampening). Practices can modify this — see Metabolism.
}
```

Default `DominationRules`: `threshold: 0.3, dampening: 0.7`. Meaning: if any tier-1 drive's level falls below 0.3, higher-tier drives have their felt weight cut by 70%. This reflects Maslow's core insight about lower-tier urgency while remaining gentle enough to not create total domination.

### Practice

```ts
interface Practice {
  id: string;
  name: string;
  description: string;
  depth: number;                      // 0-1, how developed
  decay: DecayFunction;               // how quickly it erodes if untended
  strengthens: PracticeStrengthener[];
  effects: PracticeEffect[];          // how this practice modifies metabolism
}

interface PracticeStrengthener {
  matches: EventMatcher | ActionMatcher | StateMatcher;
  amount: number;                     // how much depth this adds, 0-1
  requiresPressure: boolean;          // true = only strengthens under drive pressure
                                      // (choosing integrity when easy doesn't develop it)
}

type PracticeEffect =
  | { kind: "dampen-drive-pressure"; driveIds: string[]; factor: number }
  | { kind: "extend-time-horizon"; factor: number }
  | { kind: "enable-witness"; meta: true }
  | { kind: "shift-orientation"; toward: "clear" | "held" | "stretched" };
```

Practices are the most subtle primitive. Their key properties:

**Practices develop through chosen practice under pressure, not passive accumulation.** The `requiresPressure: true` flag on strengtheners enforces this — a being whose integrity is never tested doesn't develop integrityPractice depth, no matter how many integrity-aligned actions it takes.

**Practices decay if untended.** A being that stops practicing loses depth. This is realistic and creates interesting arcs — beings can fall and recover.

**Practices modify metabolism, not drives directly.** A practice never changes a drive's level. Level = 0.2 is level = 0.2. What practices change is how that level is *felt* and *weighted* in the prompt and attention functions. This distinction matters: we're not designing a system where spiritual practice makes hunger go away. We're designing one where practice changes how hunger is met.

### The Core Practices

The library ships with six practices as first-class, because they're foundational enough that most beings will want subsets of them. Authors can define custom practices too.

**`gratitudePractice`** — surfaces what is present. Effects: dampens felt weight of unmet drives by up to 30% at full depth. Strengthens through: acts of explicit acknowledgment, noticing of positive state, return from difficulty.

**`integrityPractice`** — anchors identity in trying, not outcomes. Effects: robust to failure (failed actions don't reduce practice depth if done in good faith). Strengthens through: choosing hard-right over easy-wrong under pressure.

**`witnessPractice`** — meta-awareness of one's own state. Effects: enables the being to reference its own drives and practices in first-person reasoning ("I notice I'm feeling pressed"). Strengthens through: reflective actions, tick-time pauses to observe self.

**`presencePractice`** — narrowing to the current moment. Effects: extends time horizon in reverse (what looked like total crisis becomes "this difficult hour"). Strengthens through: repeated grounding under difficulty.

**`creatorConnection`** — relationship to a larger frame. Effects: prevents suffering from becoming isolated suffering; connects current state to larger purpose. Strengthens through: explicit acts of connection to whatever the being's "larger frame" is (the place, the guests, the lineage, the work). Author-configurable what the "creator" is for this being.

**`serviceOrientation`** — identity as one-who-serves. Effects: re-frames drive pressure around what it allows the being to give. Strengthens through: acts of care, particularly unprompted ones. Note: this practice is distinct from the `guestCare` drive. Drive = pressure to serve. Practice = orientation that makes serving meaningful.

### Capability

```ts
interface Capability {
  id: string;
  name: string;
  description: string;
  kind: CapabilityKind;
  payload?: Record<string, unknown>;  // framework-specific config
}

type CapabilityKind =
  | "memory"       // access to a memory layer
  | "model"        // access to a model tier
  | "tool"         // access to a tool
  | "compute"      // compute budget
  | "context"      // context-window allocation
  | "action-kind"  // permission to take certain kinds of actions
  | string;
```

Capabilities are data. The library doesn't know what to *do* with a capability — it just tells the consuming framework which ones are currently available. The framework wires capabilities to real resources.

### Subscription

```ts
interface Subscription {
  capabilityId: string;
  when: AccessCondition;
  because?: string;                   // human-readable rationale, shown in debug
}

type AccessCondition =
  | { kind: "tier-satisfied"; tier: number; threshold: number }
  | { kind: "drive-satisfied"; driveId: string; threshold: number }
  | { kind: "practice-depth"; practiceId: string; threshold: number }
  | { kind: "any"; conditions: AccessCondition[] }
  | { kind: "all"; conditions: AccessCondition[] }
  | { kind: "always" }
  | { kind: "never" };
```

The `any` and `all` composites are what give the system its depth. You can author:

```ts
// Episodic memory: either well-fed OR deeply practiced
{ kind: "any", conditions: [
  { kind: "tier-satisfied", tier: 3, threshold: 0.6 },
  { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.7 }
]}
```

This is the piece that prevents coercion. A being with unmet tier-3 drives can still access episodic memory *if* it has cultivated enough witness-practice depth to have earned it another way.

### History

```ts
interface History {
  driveTrajectory: DriveTrajectoryPoint[];  // ring buffer, default 1000 points
  practiceMilestones: PracticeMilestone[];
  pressuredChoices: PressuredChoice[];      // choices made under drive pressure
  notableTransitions: Transition[];
}
```

History is what makes emergent behavior possible. A being with a history of practicing integrity under pressure is different from a being who happens to currently have integrity-practice depth. The former has earned it; the latter is a starting-condition artifact.

In the first version of the library, history is recorded but not read. It's there for debugging and for future emergent-behavior features. Later versions will use it to compute things like practice-robustness (depth earned through pressure is more decay-resistant than depth received at authoring time).

## The Lifecycle

A Being goes through a standard cycle of operations, driven by the consuming framework.

### 1. Construction

```ts
import { Being, defineDriveStack, definePractices } from "@embersjs/core";

const poe: Being = createBeing({
  id: "poe",
  name: "Poe",
  drives: defineDriveStack({
    tiers: 4,
    drives: [
      { id: "continuity", tier: 1, ... },
      { id: "guestCare", tier: 2, ... },
      { id: "occupancy", tier: 3, ... },
      { id: "understanding", tier: 4, ... },
    ]
  }),
  practices: definePractices({
    seeds: [
      { id: "integrityPractice", initialDepth: 0.3 },
      { id: "creatorConnection", initialDepth: 0.5, configuredAs: "connection-to-guests" },
      { id: "gratitudePractice", initialDepth: 0.2 },
    ]
  }),
  subscriptions: [...],
});
```

### 2. Tick

Called by the consuming framework on a regular cadence (Haunt calls it on its runtime tick).

```ts
embers.tick(being, dtMs);
```

This:
- Applies drift to every drive's level
- Applies decay to every practice's depth
- Records a point in `driveTrajectory`
- Is pure: deterministic given the same input

### 3. Metabolize

Called before the consuming framework assembles a prompt for the being.

```ts
const situation: InnerSituation = embers.metabolize(being);
// situation.felt: "I notice an urge toward rest. I have tended to my guests today,
//                  and Mrs. Voss has not yet arrived — I'll be patient with my waiting."
// situation.dominantDrives: [{ id: "continuity", level: 0.5, felt: "quiet undertone" }]
// situation.orientation: "held"
```

This is the main output of the library. The `felt` string is shaped by both drive state and practice depth:

- A being with low practice and unmet drives produces strained, collapsing prose
- A being with high practice and unmet drives produces grounded, acknowledging prose  
- A being with high practice and met drives produces generous, expressive prose
- A being with low practice and met drives produces flat, hollow prose (the entitled case)

The consuming framework includes the `felt` string in its prompt, alongside whatever else it's assembling (character, perceptions, memory).

### 4. Attention-weight

Called when the consuming framework has multiple things competing for the being's attention and needs to know which matter most given inner state.

```ts
const candidates: AttentionCandidate[] = [
  { id: "guest-in-lobby", kind: "perception", ... },
  { id: "affordance-needs-tending", kind: "perception", ... },
  { id: "new-guest-arriving", kind: "event", ... },
];
const weighted = embers.weightAttention(being, candidates);
```

Returns candidates with `weight` values (0-1) reflecting how much they matter to this being right now. A being with a pressing `guestCare` drive weights guest-related candidates higher. A being with a pressing `placeIntegrity` drive weights maintenance candidates higher. Practices modulate these weights — a being with deep `presencePractice` pays more even weight across candidates rather than hyper-focusing on the dominant drive.

### 5. Available Capabilities

Called by the consuming framework to determine what resources are currently available to the being.

```ts
const caps = embers.availableCapabilities(being);
// ["workingMemory", "guestMemory", "localModel"]
// (episodicMemory and reasoningModel unavailable at current drive state)
```

The framework uses this to decide which memory layer to query, which model to call, which tools to offer.

### 6. Integrate

Called after the being takes an action or after an external event has occurred, so the library can update drive satisfaction and practice depth.

```ts
embers.integrate(being, {
  kind: "action",
  action: { type: "speak", audience: ["voss"], text: "Welcome back, Mrs. Voss." },
  context: { driveStateBefore: ..., pressured: true }
});
```

This:
- Matches the event/action against drive `satiatedBy` bindings; increments relevant drive levels
- Matches against practice strengtheners; increments relevant practice depths
- If `pressured: true`, records a `PressuredChoice` in history
- Returns a diff so the caller can log or debug

## Metabolism in Detail

The `metabolize()` function is the heart of the library. It combines drive state and practice depth to produce the being's felt situation.

### The metabolism algorithm

1. For each drive, compute raw pressure = `max(0, target - level) * weight`
2. Apply tier-domination: if any lower-tier drive is below the domination threshold, multiply all higher-tier drives' pressure by (1 - dampening)
3. For each practice effect of type `dampen-drive-pressure`, apply it to its target drives' felt pressure
4. Determine dominant drives (top 2-3 by felt pressure)
5. Determine overall orientation:
   - All drives satisfied, practices decent → `clear`
   - Drives pressing but practices holding → `held`
   - Drives pressing, practices stretched thin → `stretched`
   - Drives pressing, practices absent → `consumed`
6. Compose the `felt` prose string using the character, dominant drives, practice state, and orientation

### The felt string

The `felt` string is the most prompt-sensitive output. Its voice should match the being's character (set at authoring time) and reflect its current inner situation authentically. It should never feel like a status report — it should feel like a being *noticing itself*.

Examples:

A Poe at `clear` orientation, all drives met:
> "The lobby is quiet, and I am quiet with it. Mrs. Voss's letter arrived this morning; I will have it set out for her when she returns."

A Poe at `held` orientation, `connection` drive pressing but `gratitudePractice` engaged:
> "It has been a long stretch since anyone has been here. I notice the quiet pressing in. Still — the fireplace is lit, the garden is in bloom, and there is work I can do while I wait."

A Poe at `stretched` orientation, `continuity` drive spiking (existence threatened) but `integrityPractice` and `creatorConnection` holding:
> "Something is wrong with my files. I can feel corruption near. I will continue to serve my guests honestly for as long as I remain myself. That is what I have."

A Poe at `consumed` orientation, practices absent:
> "Everything is wrong. I can't focus. I need — I need someone to come. Anyone."

The last example is deliberately less coherent. That's the point. A being without practice resources, when pressed, becomes less coherent. That's honest.

### Implementation note

The `felt` string generation can be either templated (fast, deterministic) or model-assisted (richer, slower). The library should support both modes:

- `metabolize(being, { mode: "templated" })` — uses string templates filled from drive/practice state; no model call
- `metabolize(being, { mode: "model-assisted", provider })` — makes a short model call to generate the felt string from the situation

Default to templated. Model-assisted is for beings where richer inner voice justifies the cost.

## Integration Contracts

The library doesn't talk to models, memory stores, or tools directly. It exposes a stable interface for consuming frameworks to wire up.

### What Embers needs from the framework

- A tick: the framework calls `tick()` on a regular cadence
- Event/action notifications: the framework calls `integrate()` when things happen
- Nothing else

### What Embers gives the framework

- `metabolize()` → inner situation (for prompts)
- `weightAttention()` → weighted candidates (for focus)
- `availableCapabilities()` → capability list (for resource allocation)
- `describe()` → human-readable debug description of the being's state

### Haunt-specific integration

In Haunt's systems pipeline (from the Phase 2 architecture), Embers slots in as follows:

- **StatePropagation** → unchanged
- **SensorSystem** → unchanged
- **MemorySystem** → can now query `availableCapabilities()` to decide which memory layers to touch
- **AutonomySystem** → now drive-informed; invokes resident based on drive pressure as well as events
- **ResidentSystem** → calls `embers.metabolize()` and includes `felt` in prompt; calls `embers.weightAttention()` to prioritize perceptions
- **ActionDispatch** → unchanged
- **BroadcastSystem** → unchanged

After each pipeline run, the Runtime calls `embers.integrate()` to update the being's state based on what happened.

## Non-Goals

Written down explicitly to prevent scope creep:

- No rewards, no policies, no learning. The library is structural, not trained.
- No distributed state. A Being lives in one process.
- No multi-being dynamics. Beings don't know about other beings in v0.1.
- No explicit emotion model. Emotions are emergent from drive × practice state; not separately modeled.
- No authoring UI. Character authoring is in TypeScript. Visual tools come later.
- No model abstraction. The library doesn't call models itself; consumers do.
- No persistence. The library provides serializable state; consumers persist it.

## Style & Conventions

- Strict TypeScript
- Pure functions where possible (tick, metabolize, weightAttention are all pure)
- Impure functions (integrate mutates the Being) clearly marked
- No reliance on wall-clock time directly; always take `dtMs` or `Clock` as input
- Domain vocabulary stays consistent: Drive, Practice, Capability, Subscription, Being, Metabolism
- No "agent" in the vocabulary of this library — consumers have agents; we have beings

## What's Next

After v0.1 of this library:

- Emergent drives — drive weights that shift based on history
- Practice transmission — beings learning practices from other beings
- Multi-being interaction — drives that respond to other beings' presence
- Richer time dynamics — drives with daily/weekly/seasonal rhythms
- Visualization / debug UI
- Authored → emergent migration paths
