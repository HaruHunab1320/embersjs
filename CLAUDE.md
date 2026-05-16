# CLAUDE.md

Working instructions for the Claude Code agent working on the Embers library. Read this every session before touching code.

## Orientation

Before any work, read in this order:

1. `README.md` — the thesis and vocabulary
2. `docs/ARCHITECTURE.md` — the v0.2 primitives, types, and lifecycle
3. `docs/design/v0.2/foundation.md` — the design rationale for the current rebuild
4. `docs/ROADMAP.md` — what shipped, what's next
5. This file — how to work

If anything in the code contradicts the docs, the code wins and the docs should be updated. Surface contradictions before resolving them silently.

The v0.1 docs are archived in `docs/v0.1-archive/` for historical reference only. They describe an earlier architecture (practices as counters, drives that could be dampened, no collapse mechanic) that was corrected in v0.2.

## The Three Rules

Three discipline rules specific to this library. Violating any of them is how this project becomes less than what it's meant to be.

### 1. The word "agent" doesn't appear in this library

This library is about *beings*, not agents. Agents are what frameworks have. Beings are what this library models. The distinction matters because "agent" pre-loads a set of connotations (task-runner, tool-caller, session-bound) that we're explicitly moving away from. Beings want, cultivate, accumulate, develop over time. Agents execute.

In the library's source, docs, comments, and tests, use the vocabulary of the library: Being, Drive, Practice, Capability, Subscription, Substrate, Attempt, Wear. Avoid "agent" except when explicitly describing *consumers* of the library.

### 2. The library does not call models

`src/` must not import `@anthropic-ai/sdk`, `openai`, or any other LLM SDK. If you find yourself wanting to, stop. Consumers of the library call models — Embers signals when cognitive work is needed and integrates the verdict.

This is what makes the two-phase practice mechanic the architecture it is: the library defines the *shape* of cultivation in code; the framework supplies the cognition.

### 3. Drives stay loud, practices are real cultivation

Two conjoined invariants that came out of the v0.1 → v0.2 correction:

- **No mechanism in the library reduces felt drive pressure.** Practices add what the being can bring *to* pressure; they do not subtract from pressure. A being with deep gratitude practice is still hungry when it hasn't eaten. The `dampen-drive-pressure` mechanic from v0.1 was spiritual bypass as a code path; it is removed and must not return.
- **Practice depth derives from evaluated substrate.** No verdict, no growth. A `PracticeAttempt` that the framework never resolves contributes nothing — including zero depth. The adversarial test in `src/practices/two-phase.test.ts` catches the v0.1 failure mode at the library level.

If a proposed change would let a framework grow practice depth without supplying a verdict, or would dampen felt drive pressure under any condition, decline.

## v0.2 Working Discipline

### Practices

The conceptual heart of v0.2. Each practice is **protocol + substrate**, with depth derived from substrate via the depth function.

- `intent` (and per-trigger `intent`) are the **authorial seam** the framework's evaluator reads. Write them like prompts — be specific about what would qualify and what should evaluate low.
- `requiresPressure` is more than a flag; it expresses a structural claim about what kind of cultivation this is. Integrity without pressure isn't integrity. Be honest about it.
- Substrate is a ring buffer; old artifacts age out via the recency factor; under chronic wear they age out faster (`tickPractices` housekeeping). There is no separate decay clock.
- Authors that want a being to start with prior cultivation use `PracticeSeed.initialArtifacts` with negative `atMs` for aged substrate.

### Drives

Mostly stable from v0.1. Drift, satiation, tier organization preserved. The one change: `DominationRules.dampening` is renamed `attentionDampening` and applies in `weightAttention()` only — never to pressure itself.

### Wear

A separate scalar from orientation. Hysteresis: accumulate below `criticalThreshold` (0.2), accumulate above `recoveryThreshold` (0.4), hold between. Full recovery (12h above) clears chronic state. Recovery is asymmetric — descent is faster than climbing back. Above `orientationCollapseThreshold` (0.6), orientation is forced to `consumed`.

When you change wear-related code, run the recovery-asymmetry tests in `src/wear/tick.test.ts` to make sure the property holds.

### Metabolism

Structured output first; prose is opt-in. Default `metabolize()` returns no `felt` field. `feltMode: "prose"` uses the default voice or a supplied `VoiceModule`. The default voice is functional but plain — author custom voices for production beings.

The `selfModel` field auto-includes when witness depth ≥ 0.5. Frameworks decide how to inject it into prompts.

### History

Load-bearing now. `recentEntries`, `recentPressuredChoices`, `trajectorySnippet`, `recurringPatterns` are the read API. Practice attempt context windows draw on these. Don't add a new persistent piece of state on Being if a history helper would do.

### Felt prose

Still a creative artifact when present, but it is **not the deliverable**. The deliverable is the structured `InnerSituation`. When you do edit felt prose:

- Read it aloud. If it sounds like a status report, rewrite.
- The four quadrants (clear/held/stretched/consumed) should produce qualitatively distinct prose.
- Err toward less content, not more. One observation honestly held beats three listed.

## Working Conventions

### Code style

- Strict TypeScript throughout.
- Pure functions where possible. `metabolize`, `weightAttention`, `availableCapabilities`, `getSelfModel`, all `recent*` helpers are pure.
- Impure functions (`tick`, `integrate`, `resolveAttempt`, `expirePendingAttempts`) clearly marked.
- No implicit `any`; no `any` without a comment.
- No wall-clock time dependencies; always take `dtMs` or read `being.elapsedMs`.
- No `node:*` imports in `src/`. The library targets browsers too. Use `globalThis.crypto.randomUUID()` (Node 19+, all modern browsers) with a fallback.

### Testing

- Vitest, colocated as `.test.ts`.
- Adversarial coverage: the two-phase test verifies 1000 unresolved attempts produce 0 depth. The anti-bypass test verifies practice substrate doesn't reduce drive pressure. The orientation test verifies wear ≥ 0.6 forces consumed.
- When adding a feature, add a test that fails before and passes after.
- No model calls in tests; supply synthetic evaluators.

### Commits

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- One logical change per commit.
- Only commit when explicitly asked.

### Dependencies

- Near-zero runtime dependencies. Current runtime deps: none.
- Before adding anything, consider whether the functionality could be implemented in ~20 lines. If yes, implement it.

## When to Pause and Ask

- **A practice's code looks indistinguishable from a drive's code.** Conceptual failure; pause and re-read the practice section of ARCHITECTURE.md.
- **A proposed change would let practice depth grow without an evaluator's verdict.** Decline; this is the v0.1 failure mode.
- **A proposed change would reduce felt drive pressure under any condition.** Decline; this is spiritual bypass as code.
- **The library is starting to feel like it's about rewards and punishments.** The design is explicitly not that; capabilities *expand* when conditions are met, they aren't *denied* otherwise.
- **An integration point that the architecture doc doesn't mention feels "necessary."** It's probably not. Pause and surface it. The five primary functions are intentional.
- **A new core practice feels obvious to add.** The six core practices were chosen carefully. If a seventh seems mandatory, pause; it might be that something existing should be refined instead.
- **The Haunt integration is revealing library design flaws.** Fix in the library, not in Haunt. The library has to stand alone.

## What Good Looks Like

- A developer can install the library, read the README, and author a working Being with evaluated practices in under an hour.
- A being's `metabolize()` output (structured, not prose) carries enough signal to compose a meaningful prompt without needing to call `feltMode: "prose"`.
- Practice substrate accumulates artifacts that are framework-meaningful — when you read a being's substrate, you can see what it's been cultivating.
- The four quadrants emerge naturally from authored configurations; authors don't have to specifically code to them.
- A being can descend into chronic collapse and recover through re-cultivation. Both arcs are visible across long simulations.
- The library's source stays under ~3000 lines of implementation (excluding types and tests). A single developer can read it end-to-end in an afternoon.

## What Not-Good Looks Like

- Practice depth is growing without an evaluator's verdict — the v0.1 failure mode is back.
- Drive pressure is being reduced somewhere — spiritual bypass is back.
- A capability subscription that uses `tier-satisfied` alone — the anti-coercion design is going decorative.
- A being can sit in chronic deprivation indefinitely with no behavioral consequence — collapse isn't real.
- The default voice is leaking literary register into every consumer because frameworks are using `feltMode: "prose"` without authoring their own voice.
- The docs read like reference material, not invitations.

## The Deepest Rule

This library is attempting something philosophically specific: to design agents as **beings with genuine inner architecture** rather than instruction-shaped behavior patterns. Every design decision is checked against this. If a decision makes the library more generic but less coherent to its thesis, the thesis wins.

You're not building an agent framework. You're building the inner life that agent frameworks have been missing. Keep that frame, and the hard decisions get easier.
