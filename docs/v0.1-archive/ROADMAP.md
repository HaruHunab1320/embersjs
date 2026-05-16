# Roadmap

Phased execution plan for the Embers library. Each phase has explicit deliverables, checkpoints, and a pause point. Build in order. Do not start Phase N+1 until Phase N's checkpoints pass.

## Design Discipline

This library is small-surface by design. The temptation will be strong to add features because they'd be "interesting" — emergent drives, multi-being interactions, visualization tooling, etc. These are all Phase 2+ concerns. Ship a minimum viable inner-architecture library first and let real usage inform what comes next.

The thesis that has to be proven in v0.1: **drives + practices + capabilities compose into agents that behave more coherently, more interestingly, and more humanly than agents without them.** Everything in v0.1 exists to prove that thesis. Anything that doesn't contribute to that proof waits.

---

## Phase 0 — Scaffolding

**Goal:** A standalone TypeScript package with tooling in place, ready to build into.

**Deliverables:**
- `package.json` configured for publication (scope TBD pending name decision)
- TypeScript config: strict mode, Node 20+ target, ESM first with CJS fallback if simple
- ESLint + Prettier (flat config)
- Vitest for testing
- Root scripts: `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm dev` (watch mode)
- `.gitignore`, `.nvmrc`, `CHANGELOG.md` starter
- `LICENSE` — MIT
- Directory structure:
  ```
  src/
    types.ts            # (empty, to be filled Phase 1)
    index.ts            # (empty)
    drives/             # (empty)
    practices/          # (empty)
    capabilities/       # (empty)
    being/              # (empty)
    metabolism/         # (empty)
  docs/
    ARCHITECTURE.md
    ROADMAP.md
    CLAUDE.md
    authoring/
    integration/
  examples/
    minimal.ts          # (stub)
  ```
- A README that mirrors the repo-root README committed

**Checkpoints:**
- `pnpm install` succeeds
- `pnpm test` runs (no tests yet, exits cleanly)
- `pnpm lint` passes
- `pnpm build` builds the empty package
- `pnpm typecheck` passes

**Pause point:** After Phase 0. Confirm the scope structure and package naming before any code is written.

---

## Phase 1 — Core Types

**Goal:** Every type from `ARCHITECTURE.md` exists in TypeScript, with no runtime behavior yet. This is the contract phase.

**Deliverables:**
- `src/types.ts` — every interface/type from the architecture doc
- Thorough TSDoc on every exported type
- `src/index.ts` — re-exports the public type surface
- Example files in `examples/` that construct (but don't execute) a Poe-like being using the types, purely for type-level verification

**Tests:**
- Type-level tests that verify valid configurations compile and invalid ones don't
- No runtime tests yet — this is types-only

**Checkpoints:**
- A developer can look at `types.ts` and understand the library's conceptual model without reading prose
- The examples compile and the type system catches obvious authoring mistakes (e.g., referencing a non-existent drive ID in a subscription)

**Pause point:** After Phase 1. The type surface is the library's public shape — pause for a careful review before building the runtime.

---

## Phase 2 — Drive Dynamics

**Goal:** Drives work. They can be constructed, they drift over time, they can be satiated by events, and their state can be queried.

**Deliverables in `src/drives/`:**
- `construct.ts` — `createDrive()`, `createDriveStack()` factory functions with sensible defaults
- `drift.ts` — drift function implementations (linear, exponential, custom)
- `tick.ts` — `tickDrives(stack, dtMs): DriveStack` pure function that advances state
- `satiate.ts` — `satiateDrives(stack, event): DriveStack` pure function that matches events to satiation bindings
- `query.ts` — helpers like `pressingDrives(stack, threshold)`, `dominantTier(stack)`, `isTierSatisfied(stack, tier, threshold)`
- `index.ts` — re-exports

**Tests:**
- Drift: a linear-drift drive at level 0.8 with `ratePerHour: -0.1` is at level 0.75 after 30 simulated minutes
- Exponential drift: correctly half-lives
- Satiation: an event matching a binding increments the drive level by the binding's amount
- Multiple satiation bindings on one drive stack correctly fire for one event
- Tier-domination: `pressingDrives` correctly identifies drives at/below threshold
- Edge cases: drive level never exceeds 1 or falls below 0; drift with dtMs of 0 is a no-op

**Checkpoints:**
- A ticker test runs 24 hours of simulated time on a stack and the drive trajectory matches expectation
- Coverage >90% in `src/drives/`

**Pause point:** After Phase 2. Drives are working in isolation. Pause here because practices (Phase 3) will modify how drives are *felt*, and the drive-only behavior should be clearly correct first.

---

## Phase 3 — Practice Dynamics

**Goal:** Practices work. They can be constructed with seed depth, they decay over time, they develop through pressure-choices, and they have effects that can be queried.

**Deliverables in `src/practices/`:**
- `construct.ts` — `createPractice()`, `createPracticeSet()`, plus the six core practices pre-built as factories (`gratitudePractice()`, `integrityPractice()`, etc.)
- `decay.ts` — decay functions
- `tick.ts` — `tickPractices(set, dtMs)` pure function
- `strengthen.ts` — `strengthenPractices(set, event, driveState)` — applies strengtheners, respecting `requiresPressure`
- `query.ts` — `practiceDepth(set, id)`, `hasPracticeAtDepth(set, id, threshold)`
- `effects.ts` — the effect-composition machinery that combines active practices' effects into a bundle that metabolism can apply
- `index.ts` — re-exports

**Tests:**
- Core practice factories produce correctly-shaped `Practice` objects with appropriate defaults
- Decay: an untended practice at depth 0.5 decays toward 0 at its configured rate
- Strengthening without pressure: a `requiresPressure: true` strengthener does nothing if the relevant drive isn't pressing
- Strengthening with pressure: same strengthener correctly increments depth when drive is pressing
- Effect composition: multiple practices with overlapping effects compose correctly (e.g., two practices that both dampen the same drive stack their dampening, within bounds)

**Checkpoints:**
- A simulated 7-day run where a being with integrityPractice seed 0.2 makes 50 pressured-integrity choices shows practice depth growing to >0.6
- A simulated 30-day run with no pressure-choices shows the seed decaying appropriately
- Coverage >90% in `src/practices/`

**Pause point:** After Phase 3. Before moving to capabilities, review whether the practice semantics feel right. In particular: does `requiresPressure` work cleanly? Do the core practices each feel distinct in what develops them? This is the conceptually subtle phase.

---

## Phase 4 — Capabilities & Subscriptions

**Goal:** Capability access is contingent and computable. Given a Being's state, the library can accurately report which capabilities are currently available.

**Deliverables in `src/capabilities/`:**
- `construct.ts` — `createCapability()`, `createSubscription()`
- `evaluate.ts` — `evaluateCondition(being, condition)`: returns boolean; recursively handles `any`, `all`, composites
- `available.ts` — `availableCapabilities(being)`: returns Capability[] currently accessible
- `diff.ts` — `capabilityDiff(before, after)`: useful for logging when capabilities change
- `index.ts` — re-exports

**Tests:**
- `tier-satisfied` conditions work with various thresholds
- `practice-depth` conditions correctly gate by depth
- `any` composites return true if any sub-condition is true
- `all` composites require all sub-conditions
- Nested composites (any-of-alls, etc.) evaluate correctly
- `always` and `never` behave as expected
- A capability that was available becomes unavailable as its unlock condition lapses, and vice versa

**Checkpoints:**
- A scripted test: construct a Being with low drive state but high practice depth. Assert that capabilities accessible via practice are available, while capabilities requiring both drives AND practice are not.
- Coverage >90% in `src/capabilities/`

**Pause point:** After Phase 4. Capabilities are deliberately simple — data + conditions — and this phase should be short. Pause for a quick review that the `any`/`all` semantics are behaving intuitively.

---

## Phase 5 — Metabolism (Templated)

**Goal:** The library can take a Being's current state and produce a rich, prompt-ready `InnerSituation`. This phase implements the templated (non-model-assisted) version.

**Deliverables in `src/metabolism/`:**
- `metabolize.ts` — the core `metabolize(being): InnerSituation` function
- `pressure.ts` — computes raw + felt pressure per drive
- `orientation.ts` — determines overall orientation (`clear`/`held`/`stretched`/`consumed`)
- `felt-templates.ts` — templated string generators per (character-voice × orientation × dominant-drive) combination. This is the creative-writing-heavy file.
- `attention.ts` — `weightAttention(being, candidates)` function
- `index.ts` — re-exports

**Tests:**
- Unit tests for pressure computation under various tier-domination and practice-effect combinations
- Unit tests for orientation determination
- Snapshot tests for felt-string generation: given a fixed Being state, the generated `felt` matches expectation
- Integration tests: metabolize a Being across the four-quadrant states (satisfied+practiced, satisfied+unpracticed, unsatisfied+practiced, unsatisfied+unpracticed) and assert the outputs are qualitatively distinct

**Checkpoints:**
- The `felt` strings for the four quadrants read clearly different when viewed side by side
- A human reviewer (pause for this) looks at sample `felt` strings and can tell, without metadata, which quadrant each belongs to
- Coverage >85% in `src/metabolism/` (templates are lower-coverage-ceiling because of text variance)

**Pause point:** After Phase 5. This is the phase most worth pausing on for creative review. The `felt` strings are the being's voice — they deserve care. Sample 20-30 outputs and review: do they read like beings noticing themselves, or like status reports with prose decoration?

---

## Phase 6 — Being Container & Integration API

**Goal:** The public API for integrating the library into an agent framework. Everything before this was internal; this phase exposes it cleanly.

**Deliverables in `src/being/`:**
- `create.ts` — `createBeing(config)`: the main constructor
- `lifecycle.ts` — `tick(being, dtMs)`, `integrate(being, event)`, wrappers that orchestrate drives, practices, and history
- `describe.ts` — `describe(being)`: human-readable debug dump
- `serialize.ts` — `serializeBeing(being)` → JSON; `deserializeBeing(json)` → Being (for persistence by consumers)
- `history.ts` — the History ring-buffer implementation; records trajectory without reading from it yet
- `index.ts` — the main public export of the library

**Tests:**
- Full lifecycle: construct a Being, run it through 100 simulated ticks with interspersed events, verify final state is coherent
- Serialize + deserialize round-trip preserves Being state exactly
- History records correctly across a run
- Every integration-API function handles edge cases (empty stacks, missing practices, invalid events) gracefully

**Checkpoints:**
- A fully-featured `examples/poe.ts` that constructs a Poe-like being, runs a 7-day simulated scenario with pressured moments and recovery, and outputs a trajectory
- The example is the documentation for how consuming frameworks will use the library

**Pause point:** After Phase 6. This is v0.1 feature-complete. Pause for a thorough demo and review before the remaining polish phases.

---

## Phase 7 — Haunt Integration

**Goal:** The library is integrated into Haunt as the reference consumer. A Haunt resident now has a Being. Its prompts include `felt` strings. Its capabilities are contingent.

**Deliverables (in Haunt repo, not this one):**
- New dependency on this library from `@hauntjs/resident`
- Character files gain a `drives` section that authors drives, practices, and subscriptions
- The `ResidentSystem` in Haunt's pipeline calls `metabolize()` before assembling the prompt
- The `AutonomySystem` incorporates drive pressure into its invoke-or-not decision
- The `MemorySystem` queries `availableCapabilities()` and accesses only permitted memory layers
- Character file for Poe is updated to include a thoughtful drive stack and practice seeds

**Tests (in Haunt):**
- Scripted scenarios: Poe alone for 24 hours → `connection` drive climbs, visible in both `felt` strings and behavior
- Poe welcoming a return guest → drive satisfaction, practice strengthening recorded
- Poe with corrupted files (simulated `continuity` drive collapse) → reverts to lower-tier concerns, visible in prompt

**Checkpoints:**
- A human interacting with drives-enabled Poe should feel that Poe has *wants* in a way that v0.1 Poe did not
- The drive/practice state visible in debug mode is legible and useful

**Pause point:** After Phase 7, review the Haunt integration carefully. This is the phase where the thesis gets tested against real use. If drives-enabled Poe doesn't feel qualitatively different from non-drives Poe, something is wrong — in the prompt assembly, in the drive tuning, or in the metabolism. Diagnose before proceeding.

---

## Phase 8 — Documentation & Examples

**Goal:** The library is adoptable by someone who isn't us. Documentation is thorough, examples are plentiful, design rationale is captured.

**Deliverables:**
- `docs/authoring/drives.md` — how to author a drive stack well
- `docs/authoring/practices.md` — how to author/seed practices; guidance on which core practices fit which beings
- `docs/authoring/capabilities.md` — how to design subscription hierarchies
- `docs/integration/haunt.md` — the Haunt integration guide
- `docs/integration/langchain.md` — a sketch of LangChain integration (stretch)
- `docs/integration/generic.md` — the "bring your own framework" guide
- `docs/design/rationale.md` — the philosophical foundations, for curious readers
- `docs/design/four-quadrants.md` — the quadrant framework and how to author for each
- Multiple examples: `examples/poe.ts` (Haunt-style), `examples/librarian.ts` (different character), `examples/minimum.ts` (smallest possible Being)
- A thorough CHANGELOG entry for v0.1

**Checkpoints:**
- A developer who hasn't seen the library can read the docs cold and author a working Being in under an hour
- The examples cover enough variety to seed users' imaginations

---

## Phase 9 — Publish v0.1

**Goal:** The library exists publicly.

**Deliverables:**
- Package published under the chosen name
- Repository made public
- A launch post — the thesis is fresh and worth articulating
- Discussions enabled on GitHub for early feedback

**Checkpoints:**
- Installable via `npm install [package-name]`
- README renders cleanly on GitHub and the package registry

---

## Order-of-Magnitude Sizing

- Phase 0: ½ day
- Phase 1: 1-2 days
- Phase 2: 2-3 days
- Phase 3: 2-3 days (the subtle phase)
- Phase 4: 1-2 days
- Phase 5: 3-4 days (the creative phase — felt templates deserve care)
- Phase 6: 1-2 days
- Phase 7: 2-3 days (Haunt integration — depends on where Haunt is)
- Phase 8: 2 days
- Phase 9: ½ day

Total: ~3-4 weeks of focused work.

---

## Anti-Patterns to Watch For

Specific failure modes that would indicate the library is going off the rails:

- **The `felt` strings all sound the same.** This means metabolism isn't actually using the inputs. Look at four-quadrant outputs and make sure they're distinct.
- **Practices are just drives with a different label.** They're meant to be structurally different — practices modify metabolism, they're not pressure sources. If practice code looks identical to drive code, it's conceptually confused.
- **Capability subscriptions are all `tier-satisfied`.** Authors not using the `any`/`practice-depth` paths means the anti-coercion design isn't being used. In examples, deliberately show subscriptions that unlock via practice as an alternative path.
- **The library ends up knowing about models.** It shouldn't. If `src/` needs to import an SDK, something is wrong.
- **Beings become status reports.** If the Being's output reads like a dashboard instead of a felt experience, the metabolism templates need deeper authorial work.
- **Emergent behavior features creep into v0.1.** History-driven drive-weight evolution is cool. It's also Phase 2 material. Keep v0.1 authored-first.
- **The word "agent" appears in the library's vocabulary.** Consumers have agents. We have beings.

---

## What v0.1 Proves

- Drives + practices + capabilities compose into a coherent inner-architecture API
- The "contingent capability unlocked by drives *or* practices" design pattern works and feels non-coercive in practice
- Haunt residents are measurably more coherent with Embers than without
- The library is small enough to integrate into any agent framework in under an hour

## What v0.1 Deliberately Doesn't Prove

- Whether emergent drives work
- Whether multi-being dynamics are tractable
- Whether the authoring experience scales to complex beings
- Whether practice transmission between beings is buildable
- Whether the "felt" string model-assisted mode is worth the cost

All of those are Phase 2+ questions, worth answering with real usage data from v0.1 in hand.
