# CLAUDE.md

Working instructions for the Claude Code agent building the Embers library. Read this every session before touching code.

## Orientation

Before any work, read in this order:

1. `README.md` — the thesis and vocabulary
2. `docs/ARCHITECTURE.md` — the primitives, types, and lifecycle
3. `docs/ROADMAP.md` — the phased plan and the current phase
4. This file — how to work

If anything in the code contradicts the docs, the docs win. Surface contradictions before resolving them silently.

## The Three Rules

Three discipline rules specific to this library. Violating any of them is how this project becomes less than what it's meant to be.

### 1. The word "agent" doesn't appear in this library

This library is about *beings*, not agents. Agents are what frameworks have. Beings are what this library models. The distinction matters because "agent" pre-loads a set of connotations (task-runner, tool-caller, session-bound) that we're explicitly moving away from. Beings want, metabolize experience, and develop over time. Agents execute.

In the library's source, docs, comments, and tests, use the vocabulary of the library: Being, Drive, Practice, Capability, Subscription, Metabolism. Avoid "agent" except when explicitly describing *consumers* of the library.

### 2. The library does not call models

Metabolism ships in templated mode only for v0.1. The model-assisted mode is a Phase 2 concern and is explicitly scoped out of v0.1 except as a documented interface for later.

This means `src/` should not import `@anthropic-ai/sdk`, `openai`, or any other LLM SDK. If you find yourself wanting to, stop and pause. Consumers of the library call models. We don't.

### 3. Felt strings are a creative artifact, not a code artifact

The `felt` string generation templates in Phase 5 are the most prompt-engineering-sensitive output of the library. They're also the most *authorial* code in the project — they're not just returning data, they're generating prose that should read like a being noticing itself.

Treat them accordingly. Don't rush them. When editing a template, read its output aloud (actually, not metaphorically). If it sounds like a status report, rewrite it. If it sounds like a being with an inner life, keep going.

The four quadrants (satisfied+practiced, satisfied+unpracticed, unsatisfied+practiced, unsatisfied+unpracticed) should produce qualitatively distinct voices. If you can't tell the quadrants apart from their prose, the templates aren't done.

## Phase-Specific Discipline

### Phase 0 (Scaffolding)
Straightforward. Don't over-engineer. Flat config files, minimal dependencies, get out of the way.

### Phase 1 (Types)
The public type surface is the library's contract. Spend real care here. Every exported type should have TSDoc that a human could read and understand without reading implementation. If a type name doesn't communicate its role clearly, rename it.

### Phase 2 (Drive Dynamics)
The dynamics are the foundation. Drift and satiation math should be unambiguous and well-tested. Before writing the code, write the tests — this is a phase where test-first pays off.

### Phase 3 (Practices)
The conceptually subtle phase. The three things to get right:

- **`requiresPressure`** — practices develop through chosen integrity under pressure, not passive accumulation. An integrity-aligned action taken when it was easy shouldn't develop integrityPractice. This is core to the library's thesis and can't be fudged.
- **Decay** — practices erode when untended. A being that has been running for a month with no pressured moments should have weaker practices than at instantiation, unless something is regenerating them.
- **Effects** — practices modify metabolism, they don't modify drives. Level is level. Practices change how level is *felt*.

If any of these three feel wrong in implementation, pause and ask. This phase rewards slowness.

### Phase 4 (Capabilities)
Deliberately simple. If this phase is taking more than two days, something got over-scoped. The composite `any`/`all` evaluation is the only non-trivial part.

### Phase 5 (Metabolism)
The creative phase. Do not let this phase become a data-formatting phase. The output of `metabolize()` should move someone who reads it. Read aloud. Rewrite. Compare quadrants. If a `felt` string feels generic, it is — push further until it feels like a specific being in a specific moment.

When in doubt about a template, err toward *less* content, not more. A felt string that says too much loses its quality of *noticing*. One observation, honestly held, beats three observations listed.

### Phase 6 (Being & API)
The public surface. Resist adding methods. The library has five integration points (tick, integrate, metabolize, weightAttention, availableCapabilities). Keep it at five. If a consumer needs something else, that's a sign the internal primitives should be exposed differently, not that the API should grow.

### Phase 7 (Haunt Integration)
Easy to go wrong because you're working across two repos. Principles:
- The library itself doesn't change for Haunt integration. If it needs to, the library design is wrong and should be fixed in isolation first.
- Haunt's character files gain a drives section; this is additive, not breaking
- The pre-drives behavior must remain possible (a character without a drives section falls back to Phase 1/2 behavior) — backward compatibility with existing Haunt authors is non-negotiable

### Phase 8 (Docs)
Write docs as the developer you wish had written them for you. Not as a reference manual, but as a set of invitations into using the library well. The rationale doc is particularly important — it's where the philosophical foundations live, and users who want to use the library deeply will read it.

## Working Conventions

### Code style

- Strict TypeScript throughout
- Pure functions where possible. `tick`, `metabolize`, `weightAttention`, `availableCapabilities` are all pure: same input → same output, no side effects.
- Impure functions (`integrate` mutates) clearly marked with both naming and JSDoc
- No implicit `any`; no `any` without a comment
- No wall-clock time dependencies; always take `dtMs` or `Clock` as input so tests can simulate

### Testing

- Vitest, colocated as `.test.ts`
- Unit tests for every pure function
- Integration tests at the `Being` level for Phase 6
- Snapshot tests for `felt` string templates — but update snapshots *thoughtfully*, not mechanically. A changed snapshot might mean the template got better or worse; a human should judge.
- No model calls in tests; everything templated

### Commits

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- Reference phase in commit body when relevant: `Phase 3: implement pressure-gated strengthening`
- One logical change per commit

### Dependencies

- Absolute minimum. The library should have near-zero runtime dependencies. Current target runtime deps: none. Dev deps: TypeScript, Vitest, ESLint, Prettier.
- Before adding anything, consider whether the functionality could be implemented in ~20 lines. If yes, implement it.

## When to Pause and Ask

Beyond the Phase 1 rules from Haunt, these are Embers-specific:

- **A practice's code looks indistinguishable from a drive's code.** This is a conceptual failure; pause and re-read the architecture doc's section on the distinction.
- **The library is starting to feel like it's about rewards and punishments.** The design is explicitly not that; capabilities *expand* when conditions are met, they aren't *denied* otherwise. If the code starts feeling coercive, the framing is leaking.
- **An integration point that the architecture doc doesn't mention feels "necessary."** It's probably not. Pause and surface it.
- **A new core practice feels obvious to add.** The six core practices were chosen carefully. If a seventh seems mandatory, pause and discuss; it might be that something existing should be refined instead.
- **The Haunt integration is revealing library design flaws.** Fix in the library, not in Haunt. The library has to stand alone.

## What Good Looks Like

At the end of v0.1:

- A developer can install the library, read the README, and author a working Being in under an hour
- A being's `felt` string makes someone who reads it think "oh, that's a *voice*, not a data dump"
- Haunt's Poe, with drives enabled, feels meaningfully more alive than Haunt's Poe without drives
- The library's source is small enough (target: <2500 lines of implementation, not counting types and tests) that a single developer can read it end-to-end in an afternoon
- The "four quadrants" emerge naturally from authored configurations; authors don't have to specifically code to them

## What Not-Good Looks Like

- The library works but its `felt` output is forgettable
- Practices have been implemented as "just drives with extra steps"
- A capability system exists but every subscription in examples uses `tier-satisfied` — nobody uses the practice-depth paths, which means the anti-coercion design is decorative
- The library has grown to 5000+ lines implementing features that weren't in the roadmap
- Haunt's drives integration looks like a giant config object and doesn't feel authored
- The docs read like reference material, not invitations

---

## The Deepest Rule

This library is attempting something philosophically specific: to design agents as beings with genuine inner architecture rather than instruction-shaped behavior patterns. Every design decision should be checked against this. If a decision makes the library more generic but less coherent to its thesis, the thesis wins.

You're not building an agent framework. You're building the inner life that agent frameworks have been missing. Keep that frame, and the hard decisions get easier.
