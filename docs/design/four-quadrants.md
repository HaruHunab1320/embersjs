# The Four Quadrants

The canonical frame for understanding what Embers produces.

## The grid

Drives and practices are independent axes. Combining them produces four qualitatively different kinds of being:

|                          | Low practice depth              | High practice depth               |
|--------------------------|---------------------------------|-----------------------------------|
| **Drives satisfied**     | Clear but shallow               | Clear and resourced               |
| **Drives unsatisfied**   | Consumed — collapsing           | Held — grounded, growing          |

These map to the four `Orientation` values: `clear` (drives satisfied), `held` (unmet but resourced), `stretched` (unmet, thin resources), `consumed` (unmet, no resources).

In v0.2, the picture has a fifth dimension: **wear**. A being can be in any orientation while also being highly worn — meaning the structural ground underneath the orientation is shaky. Wear forces orientation to `consumed` above the collapse threshold, regardless of practice depth.

## What each quadrant produces, structurally

These descriptions are about **what the architecture computes**, not what the prose says. The prose is optional and pluggable. The structural reality is what makes the four quadrants real.

### Satisfied + Practiced (Clear & Resourced)

- **Drive pressures** are low across the board.
- **Practice depth** is meaningful — substrate accumulated from real engagement.
- **Capabilities** unlocked through both tier-satisfaction and practice-depth paths.
- **Wear** is low — chronic state has cleared.
- **Self-model** present (witness has earned it).

This is the generous, expansive quadrant. The being's prompt is rich because the structural state is rich: many capabilities available, many practice artifacts accessible, history available for reflection.

### Satisfied + Unpracticed (Clear but Shallow)

- **Drive pressures** are low.
- **Practice depth** is minimal — substrate is sparse or absent.
- **Capabilities** unlocked through tier-satisfaction paths only.
- **Wear** is low.
- **Self-model** likely absent (witness substrate too thin).

This is the *entitled* quadrant. The being's needs are met, but it has nothing earned-through-cultivation to draw on. Capabilities gated on practice-depth remain closed. The prompt is thinner because the structural state is thinner.

This is a real failure mode worth modeling. An agent that has lived comfortably without practice gets surface-level reasoning, no introspection, no framework articulation. The author can show the limit of unearned ease.

### Unsatisfied + Practiced (Held)

- **Drive pressures** are high and *visible* — not dampened.
- **Practice depth** is meaningful.
- **Capabilities** unlocked through practice-depth paths even though tier paths are closed.
- **Wear** depends on duration — may be moderate.
- **Self-model** likely present.

This is the most interesting quadrant. The being is in real difficulty *and* has the inner resources to meet it. The prompt acknowledges the difficulty honestly and surfaces the substrate of practice as material the being can bring. Capabilities like episodic memory or deep reasoning remain available through the practice-depth path even though tier-3 (or whichever) is closed.

This is where growth happens: practices deepen under pressure (the pressure-bonus in the depth function), and the being develops in a way that wouldn't be possible without the difficulty.

### Unsatisfied + Unpracticed (Consumed)

- **Drive pressures** are high.
- **Practice depth** is minimal — substrate is sparse.
- **Capabilities** mostly closed (both paths foreclosed).
- **Wear** rises rapidly under sustained pressure.
- **Self-model** absent.

This is the contracted, overwhelmed quadrant. The being is in difficulty without resources to meet it. Capabilities lock progressively. If pressure persists, wear climbs; eventually orientation is forced to `consumed` regardless of anything else, and capabilities gated on `wear-below` close too.

This is collapse. It is honest. A being without inner resources, under sustained pressure, *should* break down. The library models this rather than buffering it away.

## Authoring across the quadrants

The four quadrants emerge naturally from authored configurations — you don't have to specifically engineer for each. But here are guidelines:

**To enable the "held" quadrant:** make sure your subscriptions use `practice-depth` paths via `any` composites, not just `tier-satisfied`. Otherwise practiced-but-deprived beings have no capability paths open and collapse into "consumed."

**To enable the "consumed → collapse" arc:** include `wear-below` gates on at least one or two important capabilities. Without them, the being has no behavioral consequence of being worn down.

**To make "clear and resourced" sing:** include capabilities that gate on *both* tier-satisfaction *and* practice-depth (using `all`). These are the highest-cultivation capabilities — earned by a being doing well in every dimension.

**To make "clear but shallow" recognizable:** rely on capabilities gated only on `practice-depth` for some content. The well-fed-but-unpracticed being can't access them — which becomes a behaviorally legible limit.

## Why structural, not prosaic, definitions

In v0.1, the four quadrants were partly defined by *prose templates* — each orientation had its own voice. That made the quadrants legible only when you read the felt string. The structural reality was diluted by being mediated through prose.

In v0.2, the four quadrants are structural facts about the inner state. The prose (when you ask for it) describes them, but the structural state is the primary truth: which capabilities are open, what substrate is available, what the wear scalar is, which drives are pressing.

This means the four quadrants are observable from the structured `InnerSituation` alone, without ever generating prose. A framework that wants to inject quadrant-shaped content into prompts can do so by reading the structured data.

## The fifth dimension: wear

A being in *any* quadrant can be highly worn or not. Wear is a structural-history scalar that composes with the instantaneous orientation:

|                          | Low wear                              | High wear                                  |
|--------------------------|---------------------------------------|--------------------------------------------|
| **clear**                | Truly at ease                         | Calm surface over chronic exhaustion       |
| **held**                 | Resilient                             | Coping with depleting reserves             |
| **stretched**            | Acute strain                          | Chronic strain on top of acute             |
| **consumed**             | Acute crisis                          | Collapse — chronic deprivation enforced    |

At `wear ≥ 0.6`, orientation is forced to `consumed`. This is the anti-stoic-marble rule. A being who has been deprived too long *cannot* be in another orientation, regardless of practice depth.

Recovery is asymmetric. Falling into high wear can happen in 24 hours of sustained deprivation. Climbing back requires 12 hours of sustained satisfaction *per drive*, and substrate erodes faster while wear is high — so practices may need rebuilding from a more deprived starting point than the descent began with.

This is the structural form of "you don't bounce back from depression overnight."

## What good design produces

When the architecture is authored well and the framework's evaluator is competent:

- The four quadrants emerge naturally from authored configurations — authors don't have to specifically code to each.
- Wear arcs become visible across long-running simulations — descent and recovery are mechanically real.
- The "held" quadrant — pressure plus resources — produces the most distinctive behavior, because it's where practices actually pay off behaviorally.
- The "entitled" quadrant produces flat, capable-but-shallow behavior — a real failure mode that the author can show.

The library's job is to make these structurally available. The author's job is to make them recognizable.
