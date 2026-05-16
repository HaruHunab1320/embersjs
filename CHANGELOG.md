# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0]

A foundational rebuild. Five real-world Haunt simulations exposed v0.1 as a
felt-prose generator with practices as label-counters. v0.2 corrects the
architecture: drives press constantly and are never quieted, practices become
real cultivation backed by evaluated substrate, wear tracks chronic
deprivation, and the path back up exists.

**Backward compatibility:** NONE. v0.2 is not additive — it is a corrected
foundation. Consumers must migrate. See `docs/design/v0.2/foundation.md`.

### Added
- **Two-phase practice mechanic.** `integrate()` records `PracticeAttempt`s
  with rich context; depth changes only via `resolveAttempt()` after the
  framework supplies a quality verdict. Embers never invents quality.
  New auxiliaries: `getPendingAttempts`, `resolveAttempt`, `resolveAllPending`.
- **Practice substrate.** Each practice has an accumulating ring buffer of
  `Artifact`s (framework-supplied content, evaluator quality, pressure status).
  Depth derives from substrate via `defaultDepthFunction` (quality × recency
  half-life × pressure bonus).
- **Wear state and chronic collapse.** Per-drive trackers accumulate
  `sustainedBelowMs` below the critical threshold and `sustainedAboveMs`
  during recovery. `wear.chronicLoad` (0–1) is derived, tier-weighted.
  Wear above `orientationCollapseThreshold` forces orientation to `consumed`
  regardless of practice depth — the anti-stoic-marble rule. Recovery is
  asymmetric (12h above threshold to fully clear chronic state).
- **`wear-below` access condition.** Capabilities can gate against
  collapsed states.
- **`SelfModel` and `getSelfModel()`.** Structured introspection (pressing
  drives, active practices with sample artifacts, recurring patterns,
  recent pressured choices), auto-included in `InnerSituation` when
  witness practice depth crosses threshold.
- **History helpers.** `recentEntries`, `recentPressuredChoices`,
  `trajectorySnippet`, `recurringPatterns`. History is now load-bearing.
- **Recent entries ring buffer.** `History.recentEntries` records every
  integration entry for self-reflection retrieval.
- **Practice intent and trigger intent.** First-class strings the framework's
  evaluator uses to construct meaningful prompts.
- **`MetabolizeOptions`** — `feltMode`, custom `voice`, `substrateLimit`,
  `includeSelfModel`, `includeWearDetail`. Felt prose is decoupled and opt-in.
- **`VoiceModule` interface** and `defaultVoice`. Frameworks can supply
  their own voice; the literary register no longer leaks by default.
- **`PracticeSeed.initialArtifacts`** — authors can preload aged substrate
  to represent prior cultivation (use negative `atMs` for aged artifacts).
- **`creatorConnection` requires an authored seed** (frame + contemplative
  questions). Throws on construction if seed is absent.
- **Adversarial test suite.** Verifies 1000 unresolved attempts produce
  exactly zero depth — the failure mode that motivated this rebuild.
- **`expirePendingAttempts(being, olderThanMs)`** — opt-in cleanup helper
  for long-running beings whose framework doesn't resolve every attempt.
  Returns the number of attempts removed.
- **v0.2 documentation pass.** New README, `docs/ARCHITECTURE.md`,
  `docs/ROADMAP.md`, `docs/authoring/{drives,practices,capabilities}.md`,
  `docs/integration/generic.md`, `docs/design/{rationale,four-quadrants}.md`.
  v0.1 docs archived at `docs/v0.1-archive/` for historical reference.
  `CLAUDE.md` updated to reflect v0.2 discipline.

### Removed
- **`dampen-drive-pressure` practice effect.** Spiritual bypass as a code
  path. Drives now stay loud forever.
- **`Practice.effects`** field entirely. Practices influence the being
  through substrate retrieval (in metabolize) and depth-gated capabilities,
  not through generic "effects."
- **`Practice.depth`** stored field. Depth is derived from substrate at
  read time via the depth function.
- **`Practice.decay`** field. Decay is automatic via the recency factor in
  the depth function; tick handles substrate eviction by hard age cap.
- **`enable-witness`** flag effect. Witness is now a real practice with
  substrate, and unlocks `SelfModel` via depth threshold.
- **`shift-orientation`** effect. Orientation derives from current state
  and wear, not from practice flags.
- **`PracticeStrengthener`**, **`PracticeSeed.initialDepth`**,
  **`composeEffects`**, **`tickPractices` decay loop** — all removed.
- **Felt prose as required output.** `InnerSituation.felt` is optional;
  the deliverable is structured inner architecture.

### Changed
- **`DominationRules.dampening` → `attentionDampening`.** Tier domination
  now affects attention weighting (in `weightAttention`), not pressure.
- **`metabolize()` returns restructured `InnerSituation`** — drives,
  practices, capabilities, orientation, wear, optional selfModel, optional felt.
- **`integrate()` returns `pendingAttemptIds`** in `IntegrationResult`.
- **`InnerSituation.drives` includes raw weighted pressure** (`pressure`)
  and a `chronic` flag, no longer "feltPressure" after dampening.
- **`PracticeSummary` includes `recentSubstrate`** (top N artifacts) and
  derived `depth`.
- **`tickPractices`** is now housekeeping (artifact eviction with
  wear-driven age acceleration), not depth advancement.
- **`Being` now carries** `wear`, `wearConfig`, `pendingAttempts`, and
  `history.recentEntries`.
- **Six core practices reauthored** with `intent` strings, trigger-specific
  intent strings, context windows, and clear substrate content shapes
  (noticings, chosen-moments, insights, groundings, articulations, services).
- **Examples reauthored** to demonstrate the v0.2 mechanics including
  two-phase evaluation, wear accumulation/recovery, and self-model emergence.

## [0.1.1]

### Fixed
- Corrected GitHub repository URLs in package.json and README

## [0.1.0]

### Added
- **Core types** — Drive, Practice, Capability, Subscription, Being, and all supporting types with full TSDoc
- **Drive dynamics** — construction, linear/exponential/custom drift, tick, satiation with event/action matching, query helpers
- **Practice dynamics** — six core practices (gratitude, integrity, witness, presence, creator connection, service orientation), decay, pressure-gated strengthening, effect composition
- **Capabilities & subscriptions** — recursive `any`/`all` condition evaluation, capability availability computation, capability diffing
- **Metabolism** — pressure pipeline with tier-domination and practice dampening, four-quadrant orientation determination, felt-string templates, attention weighting
- **Being container** — `createBeing`, `tick`, `integrate`, `metabolize`, `weightAttention`, `availableCapabilities` (the five integration points)
- **Serialization** — JSON-safe serialize/deserialize for persistence by consuming frameworks
- **Debug output** — `describe()` for human-readable being state dumps
- **History** — trajectory recording, practice milestones, pressured choice tracking
- **Examples** — Poe (hotel concierge, 7-day simulation), Librarian (knowledge-oriented being), Minimum (smallest working config)
- **Documentation** — authoring guides (drives, practices, capabilities), integration guide, four-quadrants framework, design rationale
