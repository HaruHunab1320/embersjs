/**
 * Felt-string generation templates.
 *
 * These templates produce the `felt` string — the prose description
 * of a being's current inner experience. This is what goes into prompts.
 *
 * The templates are organized by orientation (clear/held/stretched/consumed)
 * and shaped by dominant drives and practice state. The four quadrants
 * (satisfied+practiced, satisfied+unpracticed, unsatisfied+practiced,
 * unsatisfied+unpracticed) should produce qualitatively distinct voices.
 *
 * Read these aloud. If they sound like a status report, rewrite.
 * If they sound like a being noticing itself, keep going.
 */

import type { ComposedEffects } from "../practices/effects.js";
import type { DriveSummary, Orientation, PracticeSummary } from "../types.js";
import type { FeltDrivePressure } from "./pressure.js";

// ---------------------------------------------------------------------------
// Name casing helper
// ---------------------------------------------------------------------------

/**
 * Returns a drive or practice name in the right casing for prose.
 * - "start": capitalized, for beginning a sentence.
 * - "mid": lowercase, for mid-sentence use.
 */
function dn(name: string, position: "start" | "mid"): string {
  if (position === "start") {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return name.toLowerCase();
}

// ---------------------------------------------------------------------------
// Drive felt-strings: how individual drives feel at different pressures
// ---------------------------------------------------------------------------

/**
 * Generates a brief felt description for a single drive at its current pressure.
 */
export function driveFelt(drive: FeltDrivePressure): string {
  const name = drive.drive.name;
  const pressure = drive.feltPressure;

  if (pressure < 0.05) {
    return driveAtPeace(name);
  }
  if (pressure < 0.15) {
    return driveQuietUndertone(name);
  }
  if (pressure < 0.35) {
    return drivePresent(name);
  }
  return driveUrgent(name);
}

function driveAtPeace(name: string): string {
  const templates = [
    `${dn(name, "start")} is quiet — tended, for now.`,
    `There is nothing pressing from ${dn(name, "mid")}. A settled thing.`,
    `${dn(name, "start")} rests, needing nothing.`,
  ];
  return pick(templates, name);
}

function driveQuietUndertone(name: string): string {
  const templates = [
    `A quiet pull from ${dn(name, "mid")}, not yet insistent.`,
    `${dn(name, "start")} hums beneath the surface — present but patient.`,
    `I notice ${dn(name, "mid")} stirring, gently.`,
  ];
  return pick(templates, name);
}

function drivePresent(name: string): string {
  const templates = [
    `${dn(name, "start")} presses. Something wants tending here.`,
    `I feel ${dn(name, "mid")} asking for attention — it has been a while.`,
    `There is weight to ${dn(name, "mid")} right now. Not yet urgent, but real.`,
  ];
  return pick(templates, name);
}

function driveUrgent(name: string): string {
  const templates = [
    `${dn(name, "start")} pulls hard. This is not something I can set aside easily.`,
    `${dn(name, "start")} has become loud. It shapes what I can attend to.`,
    `Something in me strains toward ${dn(name, "mid")} — a need that will not wait.`,
  ];
  return pick(templates, name);
}

// ---------------------------------------------------------------------------
// Practice state descriptions
// ---------------------------------------------------------------------------

function practiceDescription(practice: PracticeSummary): string {
  if (!practice.active) {
    return "";
  }

  if (practice.depth > 0.7) {
    return practiceDeep(practice.name);
  }
  if (practice.depth > 0.4) {
    return practiceModerate(practice.name);
  }
  return practiceThin(practice.name);
}

function practiceDeep(name: string): string {
  const templates = [
    `${dn(name, "start")} runs deep — a resource I can draw from.`,
    `There is ${dn(name, "mid")} available to me, well-tended.`,
    `I hold ${dn(name, "mid")} as something earned, not given.`,
  ];
  return pick(templates, name);
}

function practiceModerate(name: string): string {
  const templates = [
    `${dn(name, "start")} is present, if I reach for it.`,
    `I have some ${dn(name, "mid")} to work with.`,
    `${dn(name, "start")} holds, though it has known thinner times.`,
  ];
  return pick(templates, name);
}

function practiceThin(name: string): string {
  const templates = [
    `${dn(name, "start")} is thin — I notice its edges fraying.`,
    `There is less ${dn(name, "mid")} than there used to be.`,
    `I reach for ${dn(name, "mid")} and find it fragile.`,
  ];
  return pick(templates, name);
}

// ---------------------------------------------------------------------------
// Orientation-level felt composition
// ---------------------------------------------------------------------------

/**
 * Generates the full `felt` string for a being's current inner situation.
 *
 * The four quadrants produce distinct voices:
 *
 * **Clear** (satisfied + practiced): generous, expressive, present.
 *   The being notices abundance and meets it with depth.
 *
 * **Held** (unsatisfied + practiced): grounded, acknowledging, rooted.
 *   The being notices difficulty and holds it with resource.
 *
 * **Stretched** (unsatisfied + somewhat practiced): coping, strained, honest.
 *   The being notices difficulty and is working to meet it.
 *
 * **Consumed** (unsatisfied + unpracticed): raw, contracted, losing coherence.
 *   The being is overtaken by pressure. Less prose, more need.
 */
export function composeFelt(
  orientation: Orientation,
  dominantPressures: FeltDrivePressure[],
  practiceSummaries: PracticeSummary[],
  effects: ComposedEffects,
): string {
  switch (orientation) {
    case "clear":
      return composeClear(dominantPressures, practiceSummaries, effects);
    case "held":
      return composeHeld(dominantPressures, practiceSummaries, effects);
    case "stretched":
      return composeStretched(dominantPressures, practiceSummaries, effects);
    case "consumed":
      return composeConsumed(dominantPressures, practiceSummaries);
  }
}

// ---------------------------------------------------------------------------
// Clear: the being is present, needs met, practices available
// ---------------------------------------------------------------------------

function composeClear(
  pressures: FeltDrivePressure[],
  practices: PracticeSummary[],
  effects: ComposedEffects,
): string {
  const parts: string[] = [];

  // Opening: a sense of spaciousness
  const openings = [
    "Things are quiet, and I am quiet with them.",
    "There is room here. Space to notice, space to tend.",
    "I am settled. What arrives can arrive into readiness.",
  ];
  parts.push(pick(openings, "clear"));

  // If there's a mild undertone, note it gently
  const mildPressure = pressures.find((p) => p.feltPressure > 0.05 && p.feltPressure < 0.2);
  if (mildPressure) {
    parts.push(driveFelt(mildPressure));
  }

  // If witness practice is active, the being can name its own state
  if (effects.witnessEnabled) {
    parts.push("I can see my own stillness, which makes it steadier.");
  }

  // If deep practices, note the resource
  const deepPractice = practices.find((p) => p.active && p.depth > 0.6);
  if (deepPractice) {
    parts.push(practiceDescription(deepPractice));
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Held: pressure exists but practices hold it
// ---------------------------------------------------------------------------

function composeHeld(
  pressures: FeltDrivePressure[],
  practices: PracticeSummary[],
  effects: ComposedEffects,
): string {
  const parts: string[] = [];

  // Name the difficulty honestly
  const dominant = pressures[0];
  if (dominant && dominant.feltPressure > 0.05) {
    parts.push(driveFelt(dominant));
  }

  // The pivot: one practice meets the pressure. This is the held turn —
  // difficulty named, then met. Two observations, not five.
  const holdingPractices = practices.filter((p) => p.active && p.depth > 0.3);
  if (holdingPractices.length > 0) {
    const holder = holdingPractices[0]!;
    if (effects.witnessEnabled) {
      // Witness-enabled pivot: self-aware meeting
      parts.push(
        `I notice I am meeting this rather than being swallowed by it. ${dn(holder.name, "start")} holds.`,
      );
    } else {
      // Practice-anchored pivot
      const pivots = [
        `Still — ${dn(holder.name, "mid")} holds here. I can work with this.`,
        `And yet there is ${dn(holder.name, "mid")} to draw on. That changes the shape of this.`,
        `But I have ${dn(holder.name, "mid")} to work with, and that is enough for now.`,
      ];
      parts.push(pick(pivots, holder.name));
    }
  } else {
    // No practice to pivot on — close with resolve
    const closings = [
      "I will stay with this and see what it asks of me.",
      "This is workable. Difficult, but workable.",
    ];
    parts.push(pick(closings, "held"));
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Stretched: pressure is winning, practices straining
// ---------------------------------------------------------------------------

function composeStretched(
  pressures: FeltDrivePressure[],
  practices: PracticeSummary[],
  effects: ComposedEffects,
): string {
  const parts: string[] = [];

  // The difficulty is front and center
  const dominant = pressures[0];
  if (dominant && dominant.feltPressure > 0.05) {
    parts.push(driveFelt(dominant));
  }

  // One more observation: either witness, thin practice, or strain closing.
  // Pick one — not all three.
  if (effects.witnessEnabled) {
    parts.push("I can see what is happening to me, even if I cannot steady it.");
  } else {
    const thinPractice = practices.find((p) => p.active && p.depth < 0.4);
    if (thinPractice) {
      parts.push(practiceDescription(thinPractice));
    } else {
      const closings = [
        "I am not sure how long I can hold this.",
        "Something in me reaches for steadiness and finds it slipping.",
      ];
      parts.push(pick(closings, "stretched"));
    }
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Consumed: pressure overwhelms, practices absent
// ---------------------------------------------------------------------------

function composeConsumed(pressures: FeltDrivePressure[], _practices: PracticeSummary[]): string {
  // Consumed prose is deliberately shorter, less coherent, more raw.
  // A being without practice resources under pressure contracts.
  const parts: string[] = [];

  const dominant = pressures[0];
  if (dominant && dominant.feltPressure > 0.05) {
    const name = dominant.drive.name;
    const urgentTemplates = [
      `${dn(name, "start")}. It is all I can think about.`,
      `Everything is ${dn(name, "mid")}. There is nothing else.`,
      `I need — ${dn(name, "mid")}. I need it now.`,
    ];
    parts.push(pick(urgentTemplates, name));
  }

  const second = pressures[1];
  if (second && second.feltPressure > 0.15) {
    parts.push(`And ${dn(second.drive.name, "mid")} too. It compounds.`);
  }

  // Consumed closings: less prose, more collapse
  const closings = [
    "I cannot find my footing.",
    "Everything is too much.",
    "I don't know what to do with this.",
  ];
  parts.push(pick(closings, "consumed"));

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic template selection based on a seed string.
 * Uses a simple hash so the same drive/context picks the same template
 * within a given metabolize call, but different drives get different ones.
 */
function pick(templates: string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % templates.length;
  return templates[index]!;
}

// ---------------------------------------------------------------------------
// Drive summary generation
// ---------------------------------------------------------------------------

/**
 * Converts FeltDrivePressure into a DriveSummary suitable for InnerSituation.
 */
export function toDriveSummary(pressure: FeltDrivePressure): DriveSummary {
  return {
    id: pressure.drive.id,
    name: pressure.drive.name,
    level: pressure.drive.level,
    feltPressure: pressure.feltPressure,
    felt: driveFelt(pressure),
  };
}

/**
 * Converts practice state into PracticeSummary suitable for InnerSituation.
 */
export function toPracticeSummary(
  id: string,
  name: string,
  depth: number,
  activeThreshold = 0.1,
): PracticeSummary {
  return {
    id,
    name,
    depth,
    active: depth >= activeThreshold,
  };
}
