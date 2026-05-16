# Roadmap

## Status

**v0.2.0** — Shipped. A corrected foundation that fixes the v0.1 drift identified in five real-world Haunt simulations.

Headline changes:
- Drives never dampened — felt pressure stays loud (anti-bypass guarantee).
- Practices are real cultivation: protocol + accumulating substrate, depth derived from substrate, evaluated by the consuming framework.
- Wear tracks chronic deprivation; recovery is asymmetric; chronic collapse forces orientation to `consumed`.
- History is load-bearing — read by the attempt context, the self-model, and attention weighting.
- Felt prose decoupled from the deliverable; structured InnerSituation is what `metabolize()` returns.

See [`design/v0.2/foundation.md`](design/v0.2/foundation.md) for the full design rationale. v0.1 docs are archived in [`v0.1-archive/`](v0.1-archive/).

## What v0.2 proves

- An agent with v0.2 Embers has internal pressures it didn't have before.
- Practice depth is *substantiated*: backed by an artifact trail of evaluated cognitive engagement, not a counter.
- Chronic deprivation degrades the being structurally — the being can collapse, and recovery requires re-cultivation.
- The library remains framework-agnostic (no LLM in `src/`) while signaling exactly when cognitive work is required.

## What v0.2 deliberately doesn't prove

- Whether substrate-driven metabolism enriches `metabolize()` output meaningfully — substrate is stored but not yet *read* by metabolism. (v0.3 candidate.)
- Whether emergent drive weights work — drives are still authored. (Phase 2 concern.)
- Whether multi-being dynamics are tractable. (Phase 2 concern.)
- Whether richer practice content schemas (typed `content` for each practice) help framework evaluators. (Could ship as a separate package or RFC.)

## Candidates for v0.3

In rough priority order, none committed:

1. **Substrate-driven metabolism.** When `metabolize()` runs, surface relevant artifacts in the InnerSituation so frameworks can inject them as resources the being brings to current pressure.
2. **Self-model refinement.** Richer recurring-pattern detection, optional patterns supplied by frameworks, sample artifacts ranked by relevance rather than recency.
3. **Voice composition helpers.** Make it easier to author custom `VoiceModule`s — utilities for choosing among substrate, formatting drive state, etc.
4. **Practice content schemas.** Per-practice TypeScript types for what `Artifact.content` looks like (noticings, chosen-moments, insights, etc.), helping framework evaluators construct meaningful prompts.
5. **Cross-practice substrate sharing.** Currently `includeRelatedSubstrate` is a boolean; could be more nuanced (per-practice relations).
6. **Better default voice.** The current default voice is functional but plain. A richer authoring pass on the four-quadrant prose.

## Beyond v0.3

- Emergent drives — drive weights shifting based on history
- Practice transmission — beings learning practices from other beings
- Multi-being dynamics
- Visualization / debug UI
- Authored → emergent migration paths

## Working principle

The roadmap is small-surface by design. Every addition should be checked against the thesis: *real inner architecture, modeled on human inner life*. If a feature is interesting but doesn't make beings more coherent, more human, or more cultivatable, it waits.
