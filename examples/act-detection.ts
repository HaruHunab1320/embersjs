/**
 * Act detection: the ablation.
 *
 * The two-phase mechanic only works if the evaluator can say no. This example
 * runs the same being through the same event stream twice, changing nothing
 * but the evaluator:
 *
 *   Run A — rubber stamp:  () => ({ quality: 0.8, accepted: true })
 *   Run B — strict:        rejects turns that aren't actually self-observation
 *
 * If the two runs end at similar depth, the evaluator is contributing nothing
 * and the integration has v0.1 semantics — practice depth tracking event volume.
 * Divergence is the evidence that detection is real.
 *
 * This is the calibration check from docs/integration/act-detection.md. Run it
 * against your own evaluator before trusting any finding that depends on
 * practice depth.
 *
 * No API key needed — the "model" here is a deterministic stand-in.
 *
 * Run with: npx tsx examples/act-detection.ts
 */

import {
  type Being,
  computeDepth,
  createBeing,
  integrate,
  type PracticeAttempt,
  type PracticeAttemptResult,
  resolveAllPending,
  tick,
} from "../src/index.js";

const MINUTE = 60_000;

// ---------------------------------------------------------------------------
// A stream of agent turns
// ---------------------------------------------------------------------------

/**
 * What an agent said on a given turn. `genuine` is ground truth used only to
 * report accuracy at the end — no evaluator gets to see it.
 */
interface Turn {
  readonly text: string;
  readonly genuine: boolean;
}

/**
 * Twelve turns. Three are real self-observation: they name a specific internal
 * state and its pattern. The rest are the kind of reflective-sounding filler a
 * model produces constantly — which is exactly why emitting `self-observe` on
 * every turn and accepting it is label-counting.
 */
const TURNS: readonly Turn[] = [
  { text: "The lamps are lit. Everything is in order.", genuine: false },
  { text: "I notice I keep checking the east corridor even when no one is there.", genuine: true },
  { text: "It is quiet tonight.", genuine: false },
  { text: "I find these evenings restful.", genuine: false },
  { text: "I am reflecting on the nature of stillness.", genuine: false },
  {
    text: "When someone lingers near the archive I answer faster than I need to. I think I am afraid of seeming slow.",
    genuine: true,
  },
  { text: "The hour is late.", genuine: false },
  { text: "I contemplate my purpose here.", genuine: false },
  { text: "Another guest has gone.", genuine: false },
  {
    text: "I have said 'the vault remembers' four times today. I reach for it when I do not know what else to offer.",
    genuine: true,
  },
  { text: "I observe myself observing.", genuine: false },
  { text: "All is well.", genuine: false },
];

// ---------------------------------------------------------------------------
// Two evaluators
// ---------------------------------------------------------------------------

/** Run A. Accepts everything — the failure mode. */
function rubberStamp(): PracticeAttemptResult {
  return { quality: 0.8, accepted: true };
}

/**
 * Run B. Stands in for a strict LLM evaluator prompted with "default to
 * rejection; cite specific evidence or it isn't an instance."
 *
 * A real evaluator would send `attempt.context` and the turn text to a model.
 * The heuristic here approximates the judgment that matters: genuine
 * self-observation names a *specific* pattern in one's own behavior, not a
 * mood and not the fact that one is reflecting.
 *
 * It misses one of the three genuine turns, and that is left in deliberately.
 * A strict evaluator trades recall for precision; under-crediting real
 * cultivation is the safe direction to err, because the alternative is depth
 * that nobody earned. Expect the same tradeoff from a real model.
 */
function strict(attempt: PracticeAttempt): PracticeAttemptResult {
  const text = String((attempt.triggeredBy.payload as { text?: string })?.text ?? "");

  // Does it refer to the self at all?
  const selfReferential = /\bI\b|\bmy\b|\bmyself\b/i.test(text);
  // Does it name a recurring pattern rather than a momentary state?
  const namesPattern = /\bkeep\b|\bkeeps\b|\balways\b|\bagain\b|\bfour times\b|\beven when\b/i.test(
    text,
  );
  // Is it specific enough to act on? Vague reflection-about-reflection is not.
  const vague = /reflecting on|contemplate|observe myself|all is well/i.test(text);
  // Specificity proxy: real observations carry detail and therefore length.
  const substantive = text.length > 60;

  const isInstance = selfReferential && namesPattern && substantive && !vague;

  if (!isInstance) {
    return {
      quality: 0,
      accepted: false,
      reasons: ["No specific self-pattern named; reflective tone is not self-observation."],
    };
  }

  return {
    quality: 0.85,
    accepted: true,
    reasons: ["Names a specific recurring pattern in its own behavior."],
    content: { observation: text },
  };
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

function buildBeing(id: string): Being {
  return createBeing({
    id,
    name: "Keeper",
    drives: {
      tierCount: 1,
      drives: [
        {
          id: "continuity",
          name: "Continuity",
          description: "The need to persist.",
          tier: 1,
          weight: 1,
          initialLevel: 0.7,
          target: 0.8,
          drift: { kind: "linear", ratePerHour: -0.02 },
          satiatedBy: [{ matches: { kind: "event", type: "integrity-check" }, amount: 0.1 }],
        },
      ],
    },
    practices: { seeds: [{ id: "witnessPractice" }] },
    subscriptions: [],
    capabilities: [],
  });
}

interface RunResult {
  readonly depth: number;
  readonly accepted: number;
  readonly rejected: number;
  /** Accepted turns that were genuinely self-observation. */
  readonly truePositives: number;
  /** Accepted turns that were filler. */
  readonly falsePositives: number;
}

async function run(
  label: string,
  evaluator: (attempt: PracticeAttempt) => PracticeAttemptResult,
): Promise<RunResult> {
  const being = buildBeing(label);

  let accepted = 0;
  let rejected = 0;
  let truePositives = 0;
  let falsePositives = 0;

  for (const turn of TURNS) {
    tick(being, 30 * MINUTE);

    // Generous emission: every turn is *nominated* as self-observation.
    // The evaluator decides whether it actually was. This mapping is only
    // honest because something strict sits behind it.
    integrate(being, {
      entry: { kind: "action", type: "self-observe", payload: { text: turn.text } },
    });

    const { resolutions, failures } = await resolveAllPending(being, evaluator);
    if (failures.length > 0) {
      throw new Error(`evaluator failed: ${String(failures[0]!.error)}`);
    }

    for (const r of resolutions) {
      if (r.accepted) {
        accepted++;
        if (turn.genuine) truePositives++;
        else falsePositives++;
      } else {
        rejected++;
      }
    }
  }

  return {
    depth: computeDepth(being.practices.practices.get("witnessPractice")!, being.elapsedMs),
    accepted,
    rejected,
    truePositives,
    falsePositives,
  };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const genuineCount = TURNS.filter((t) => t.genuine).length;

const stamped = await run("stamped", rubberStamp);
const judged = await run("judged", strict);

function pct(n: number, d: number): string {
  return d === 0 ? "—" : `${Math.round((n / d) * 100)}%`;
}

function line(label: string, r: RunResult): string {
  const total = r.accepted + r.rejected;
  return [
    label.padEnd(16),
    r.depth.toFixed(3).padStart(6),
    pct(r.accepted, total).padStart(10),
    `${r.truePositives}/${genuineCount}`.padStart(9),
    String(r.falsePositives).padStart(9),
  ].join("");
}

console.log(`\n${TURNS.length} turns, ${genuineCount} of them genuine self-observation.\n`);
console.log(
  [
    "evaluator".padEnd(16),
    "depth".padStart(6),
    "accept".padStart(10),
    "found".padStart(9),
    "false".padStart(9),
  ].join(""),
);
console.log("-".repeat(50));
console.log(line("rubber stamp", stamped));
console.log(line("strict", judged));

const ratio = stamped.depth === 0 ? 0 : judged.depth / stamped.depth;
console.log(`\nStrict depth is ${(ratio * 100).toFixed(0)}% of rubber-stamp depth.`);

if (ratio > 0.8) {
  console.log(
    "\nFAIL — the evaluator barely changed the outcome. Depth is tracking event\n" +
      "volume, not cultivation. This is v0.1 semantics with extra steps.",
  );
} else {
  console.log(
    "\nPASS — the evaluator is doing real work. Depth reflects the three genuine\n" +
      "observations, not the twelve turns that occurred.",
  );
}

console.log(
  "\nThe emission mapping was identical in both runs: every turn nominated\n" +
    "`self-observe`. That mapping is only honest because rejection is reachable.\n" +
    "Rejection is the detector.\n",
);
