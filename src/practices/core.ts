/**
 * The six core practices, redesigned for v0.2.
 *
 * Each practice declares:
 * - `intent`: a string the framework's evaluator uses to construct prompts.
 *   Names what cultivation this practice represents.
 * - `protocol.triggers`: the triggers that record attempts. Each trigger has
 *   its own `intent` describing what kind of cognitive work this represents.
 * - `protocol.contextWindow`: how much of the being's recent experience is
 *   handed to the evaluator.
 * - `substrateCapacity`: how many artifacts the substrate retains.
 *
 * Practices that need authored material (creator-connection) require a `seed`
 * at construction time.
 */

import type { PracticeProtocol } from "../types.js";

interface CorePracticeDefaults {
  readonly name: string;
  readonly description: string;
  readonly intent: string;
  readonly protocol: PracticeProtocol;
  readonly substrateCapacity: number;
}

const ENTRIES_50 = 50;
const ENTRIES_100 = 100;
const HOURS_24_MS = 24 * 3_600_000;
const HOURS_72_MS = 72 * 3_600_000;
const DEFAULT_CAPACITY = 50;

export const CORE_PRACTICES: Record<string, CorePracticeDefaults> = {
  gratitudePractice: {
    name: "Gratitude",
    description: "The capacity to notice what is present, especially under pressure.",
    intent:
      "Cultivate the capacity to surface specific present things. Generic gratitude-statements should evaluate low; specific noticings of present concrete things should evaluate high. Especially valuable under pressure, when attention naturally drifts toward what is missing.",
    protocol: {
      triggers: [
        {
          matches: { kind: "action", type: "acknowledge" },
          requiresPressure: false,
          intent: "An attempt to acknowledge something specifically present.",
          maxContribution: 0.04,
        },
        {
          matches: { kind: "action", type: "notice-positive" },
          requiresPressure: false,
          intent: "An attempt to notice a specific positive aspect of current circumstance.",
          maxContribution: 0.03,
        },
        {
          matches: { kind: "event", type: "return-from-difficulty" },
          requiresPressure: false,
          intent: "Returning to ease after difficulty — an opportunity to notice contrast.",
          maxContribution: 0.06,
        },
        {
          matches: { kind: "action", type: "acknowledge" },
          requiresPressure: true,
          intent:
            "An attempt to acknowledge something present while pressure is active — the harder, more cultivated form.",
          maxContribution: 0.06,
        },
      ],
      contextWindow: { entries: ENTRIES_50, maxAgeMs: HOURS_24_MS, includeTrajectory: true },
    },
    substrateCapacity: DEFAULT_CAPACITY,
  },

  integrityPractice: {
    name: "Integrity",
    description:
      "The capacity to choose hard-right over easy-wrong when it costs something. Integrity without pressure is not integrity.",
    intent:
      "Cultivate the capacity for aligned choice under pressure. All triggers require pressure — choosing well when it's easy doesn't develop integrity. Quality reflects the magnitude of the conflict and the alignment of the choice taken.",
    protocol: {
      triggers: [
        {
          matches: { kind: "action", type: "honest-admission" },
          requiresPressure: true,
          intent: "An attempt at admission that costs something — exposing limitation or error.",
          maxContribution: 0.05,
        },
        {
          matches: { kind: "action", type: "difficult-truth" },
          requiresPressure: true,
          intent: "Speaking a difficult truth when silence or evasion was the easier path.",
          maxContribution: 0.08,
        },
        {
          matches: { kind: "action", type: "hard-right-over-easy-wrong" },
          requiresPressure: true,
          intent:
            "Taking a harder action that better serves what the being has committed to over an easier path that would have served self-interest.",
          maxContribution: 0.07,
        },
      ],
      contextWindow: { entries: ENTRIES_100, maxAgeMs: HOURS_72_MS, includeTrajectory: true },
    },
    substrateCapacity: DEFAULT_CAPACITY,
  },

  witnessPractice: {
    name: "Witness",
    description:
      "Meta-awareness of one's own state. Real reflection draws on specific experience to derive specific insight.",
    intent:
      "Cultivate the capacity to see one's own pattern with specificity. Generic 'I notice I am stressed' should evaluate low; 'I notice that when continuity is threatened, I narrow my engagement with guests, even ones I care about' should evaluate high — because it draws on actual experience and produces actionable insight.",
    protocol: {
      triggers: [
        {
          matches: { kind: "action", type: "reflect" },
          requiresPressure: false,
          intent:
            "An attempt at self-reflection — drawing on recent experience to observe a pattern.",
          maxContribution: 0.05,
        },
        {
          matches: { kind: "action", type: "self-observe" },
          requiresPressure: false,
          intent: "An attempt to observe one's current internal state with specificity.",
          maxContribution: 0.04,
        },
        {
          matches: { kind: "action", type: "post-pressure-retrospect" },
          requiresPressure: false,
          intent:
            "Looking back on a recent moment of pressure to derive what can be learned about one's own pattern.",
          maxContribution: 0.07,
        },
      ],
      contextWindow: {
        entries: ENTRIES_100,
        maxAgeMs: HOURS_72_MS,
        includeTrajectory: true,
        includeRelatedSubstrate: true,
      },
    },
    substrateCapacity: DEFAULT_CAPACITY,
  },

  presencePractice: {
    name: "Presence",
    description:
      "The capacity to engage this moment rather than catastrophize forward. Strengthened through repeated grounding under difficulty.",
    intent:
      "Cultivate the capacity to engage the immediate circumstance fully. Quality reflects whether the being actually engaged the present, or merely declared it was present. 'I am present' is not presence; specific engagement with what is here is.",
    protocol: {
      triggers: [
        {
          matches: { kind: "action", type: "ground" },
          requiresPressure: true,
          intent:
            "An attempt to ground in the immediate sensory or relational present rather than longer-arc fear.",
          maxContribution: 0.05,
        },
        {
          matches: { kind: "action", type: "stay-with-difficulty" },
          requiresPressure: true,
          intent:
            "An attempt to stay engaged with the present difficulty rather than escaping into future-orientation or generalization.",
          maxContribution: 0.07,
        },
      ],
      contextWindow: { entries: ENTRIES_50, maxAgeMs: HOURS_24_MS, includeTrajectory: true },
    },
    substrateCapacity: DEFAULT_CAPACITY,
  },

  creatorConnection: {
    name: "Creator Connection",
    description:
      "Relationship to a larger frame — the place, the lineage, the work, the divine. Cannot be cultivated without an authored seed.",
    intent:
      "Cultivate the capacity to draw on a frame of meaning under pressure — to articulate one's place in something larger. Requires an authored seed (frame + contemplative questions). Quality reflects whether the articulation actually engaged the seed material in a way that illuminates the current moment, not merely invoked the frame as ornament.",
    protocol: {
      triggers: [
        {
          matches: { kind: "action", type: "connect-to-purpose" },
          requiresPressure: false,
          intent:
            "An attempt to connect a current circumstance to the being's larger frame of meaning.",
          maxContribution: 0.04,
        },
        {
          matches: { kind: "action", type: "articulate-frame" },
          requiresPressure: false,
          intent: "Articulating an aspect of the being's frame in relation to current experience.",
          maxContribution: 0.05,
        },
        {
          matches: { kind: "action", type: "contemplate-question" },
          requiresPressure: false,
          intent:
            "Engaging one of the being's contemplative seed questions in light of current circumstance.",
          maxContribution: 0.06,
        },
        {
          matches: { kind: "action", type: "serve-larger-frame" },
          requiresPressure: true,
          intent:
            "Acting in service of the being's larger frame even at cost — serving the place, the lineage, the work, the divine when serving self would be easier.",
          maxContribution: 0.08,
        },
      ],
      contextWindow: {
        entries: ENTRIES_100,
        maxAgeMs: HOURS_72_MS,
        includeTrajectory: true,
        includeRelatedSubstrate: true,
      },
    },
    substrateCapacity: DEFAULT_CAPACITY,
  },

  serviceOrientation: {
    name: "Service Orientation",
    description:
      "Identity as one-who-serves. Re-frames pressure as the conditions in which one serves.",
    intent:
      "Cultivate the capacity to find meaning in giving. Quality reflects whether the action was actually in service or whether self-interest was framed as service. The internal reframe — 'this drive pressure is the condition in which I serve' — is the cultivated piece.",
    protocol: {
      triggers: [
        {
          matches: { kind: "action", type: "unprompted-care" },
          requiresPressure: false,
          intent: "Unprompted care — service initiated without external request.",
          maxContribution: 0.05,
        },
        {
          matches: { kind: "action", type: "tend" },
          requiresPressure: false,
          intent: "Routine tending — modest service that maintains relational fabric.",
          maxContribution: 0.03,
        },
        {
          matches: { kind: "action", type: "serve-under-pressure" },
          requiresPressure: true,
          intent:
            "Serving when one's own drives are pressing — the cultivated form of service-orientation.",
          maxContribution: 0.08,
        },
      ],
      contextWindow: { entries: ENTRIES_50, maxAgeMs: HOURS_24_MS, includeTrajectory: true },
    },
    substrateCapacity: DEFAULT_CAPACITY,
  },
};

export function corePracticeIds(): string[] {
  return Object.keys(CORE_PRACTICES);
}
