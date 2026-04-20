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
// Drive felt-strings: how individual drives feel at different pressures
// ---------------------------------------------------------------------------

/**
 * Generates a brief felt description for a single drive at its current pressure.
 */
export function driveFelt(drive: FeltDrivePressure): string {
  const { name } = drive.drive;
  const level = drive.drive.level;
  const pressure = drive.feltPressure;

  if (pressure < 0.05) {
    return driveAtPeace(name);
  }
  if (pressure < 0.15) {
    return driveQuietUndertone(name);
  }
  if (pressure < 0.35) {
    return drivePresent(name, level);
  }
  return driveUrgent(name, level);
}

function driveAtPeace(name: string): string {
  const templates = [
    `${name} is quiet — tended, for now.`,
    `There is nothing pressing from ${name.toLowerCase()}. A settled thing.`,
    `${name} rests, needing nothing.`,
  ];
  return pick(templates, name);
}

function driveQuietUndertone(name: string): string {
  const templates = [
    `A quiet pull from ${name.toLowerCase()}, not yet insistent.`,
    `${name} hums beneath the surface — present but patient.`,
    `I notice ${name.toLowerCase()} stirring, gently.`,
  ];
  return pick(templates, name);
}

function drivePresent(name: string, _level: number): string {
  const templates = [
    `${name} presses. Something wants tending here.`,
    `I feel ${name.toLowerCase()} asking for attention — it has been a while.`,
    `There is weight to ${name.toLowerCase()} right now. Not yet urgent, but real.`,
  ];
  return pick(templates, name);
}

function driveUrgent(name: string, _level: number): string {
  const templates = [
    `${name} pulls hard. This is not something I can set aside easily.`,
    `${name.toLowerCase()} has become loud. It shapes what I can attend to.`,
    `Something in me strains toward ${name.toLowerCase()} — a need that will not wait.`,
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
    `${name} runs deep — a resource I can draw from.`,
    `There is ${name.toLowerCase()} available to me, well-tended.`,
    `I hold ${name.toLowerCase()} as something earned, not given.`,
  ];
  return pick(templates, name);
}

function practiceModerate(name: string): string {
  const templates = [
    `${name} is present, if I reach for it.`,
    `I have some ${name.toLowerCase()} to work with.`,
    `${name} holds, though it has known thinner times.`,
  ];
  return pick(templates, name);
}

function practiceThin(name: string): string {
  const templates = [
    `${name} is thin — I notice its edges fraying.`,
    `There is less ${name.toLowerCase()} than there used to be.`,
    `I reach for ${name.toLowerCase()} and find it fragile.`,
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

  // The pivot: practice meets the pressure
  const holdingPractices = practices.filter((p) => p.active && p.depth > 0.3);
  if (holdingPractices.length > 0) {
    const holder = holdingPractices[0]!;
    const pivots = [
      `Still — ${holder.name.toLowerCase()} holds here.`,
      `And yet, there is something steadying. ${holder.name} has not left.`,
      `But I have ${holder.name.toLowerCase()} to work with, and that changes the shape of this.`,
    ];
    parts.push(pick(pivots, holder.name));
  }

  // Second drive, if pressing
  const second = pressures[1];
  if (second && second.feltPressure > 0.1) {
    parts.push(driveFelt(second));
  }

  // Witness: meta-awareness of the holding
  if (effects.witnessEnabled) {
    parts.push("I notice I am meeting this rather than being swallowed by it.");
  }

  // Closing: forward-facing but not denying
  const closings = [
    "I can tend to what is here.",
    "This is workable. Difficult, but workable.",
    "I will stay with this and see what it asks of me.",
  ];
  parts.push(pick(closings, "held"));

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

  // Second drive compounds
  const second = pressures[1];
  if (second && second.feltPressure > 0.1) {
    parts.push(driveFelt(second));
  }

  // Practices are thin but not gone
  const thinPractice = practices.find((p) => p.active && p.depth < 0.4);
  if (thinPractice) {
    parts.push(practiceDescription(thinPractice));
  }

  // Witness: even stretched, the being can observe itself
  if (effects.witnessEnabled) {
    parts.push("I notice the strain. I can see what is happening to me, even if I cannot stop it.");
  }

  // The strain shows in the closing
  const closings = [
    "I am trying to hold this together. I am not sure how long I can.",
    "Something in me reaches for steadiness and finds it slipping.",
    "I notice the strain. I have not broken, but I feel the stretch.",
  ];
  parts.push(pick(closings, "stretched"));

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
    const urgentTemplates = [
      `${dominant.drive.name}. It is all I can think about.`,
      `Everything is ${dominant.drive.name.toLowerCase()}. There is nothing else.`,
      `I need — ${dominant.drive.name.toLowerCase()}. I need it now.`,
    ];
    parts.push(pick(urgentTemplates, dominant.drive.name));
  }

  const second = pressures[1];
  if (second && second.feltPressure > 0.15) {
    parts.push(`And ${second.drive.name.toLowerCase()} too. It compounds.`);
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
