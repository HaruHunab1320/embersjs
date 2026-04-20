# Changelog

All notable changes to this project will be documented in this file.

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
