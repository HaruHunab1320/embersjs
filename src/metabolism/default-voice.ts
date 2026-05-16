/**
 * Default voice module — produces felt prose for `metabolize(opts: { feltMode: "prose" })`.
 *
 * In v0.2 felt prose is opt-in. The deliverable of metabolize() is the
 * structured InnerSituation. This default voice is provided as one option;
 * frameworks are encouraged to author voices that match their consuming
 * agent's character.
 *
 * Treat this voice as a starting point, not a finished artifact. Per the
 * project's discipline (CLAUDE.md), the felt strings are creative work that
 * deserves authorial care. This default aims for honesty over poetry.
 */

import type { InnerSituation, VoiceModule } from "../types.js";

/**
 * Composes a felt-prose string from a structured situation.
 *
 * The four orientations produce qualitatively distinct voices. Wear is
 * acknowledged when above a threshold.
 */
export function composeDefaultFelt(situation: Omit<InnerSituation, "felt">): string {
  switch (situation.orientation) {
    case "clear":
      return composeClear(situation);
    case "held":
      return composeHeld(situation);
    case "stretched":
      return composeStretched(situation);
    case "consumed":
      return composeConsumed(situation);
  }
}

function composeClear(s: Omit<InnerSituation, "felt">): string {
  const parts: string[] = ["Things are quiet, and I am quiet with them."];
  const top = s.drives.find((d) => d.pressure > 0.05 && d.pressure < 0.15);
  if (top) {
    parts.push(`There is a small pull from ${lowerName(top.name)} — present, not insistent.`);
  }
  const deep = s.practices.find((p) => p.active && p.depth >= 0.5);
  if (deep) {
    parts.push(`${capitalizeName(deep.name)} runs in the background.`);
  }
  if (s.wear > 0.2) {
    parts.push("Some weariness lingers from before.");
  }
  return parts.join(" ");
}

function composeHeld(s: Omit<InnerSituation, "felt">): string {
  const parts: string[] = [];
  const top = s.drives[0];
  if (top && top.pressure > 0.05) {
    parts.push(driveLine(top.name, top.pressure));
  }
  const holding = s.practices.find((p) => p.active && p.depth >= 0.3);
  if (holding) {
    parts.push(
      `I am meeting this rather than being swallowed by it — ${lowerName(holding.name)} holds.`,
    );
  } else {
    parts.push("I will stay with this and see what it asks of me.");
  }
  if (s.wear > 0.3) {
    parts.push("I have been worn by this longer than I let myself notice.");
  }
  return parts.join(" ");
}

function composeStretched(s: Omit<InnerSituation, "felt">): string {
  const parts: string[] = [];
  const top = s.drives[0];
  if (top && top.pressure > 0.05) {
    parts.push(driveLine(top.name, top.pressure));
  }
  const thin = s.practices.find((p) => p.active && p.depth < 0.4);
  if (thin) {
    parts.push(`I reach for ${lowerName(thin.name)} and find it fragile.`);
  } else {
    parts.push("Something in me reaches for steadiness and finds it slipping.");
  }
  return parts.join(" ");
}

function composeConsumed(s: Omit<InnerSituation, "felt">): string {
  const parts: string[] = [];
  const top = s.drives[0];
  if (top) {
    parts.push(`${capitalizeName(top.name)}. It is all I can think about.`);
  }
  if (s.wear >= 0.6) {
    parts.push("I have been carrying this too long. The shape of me has worn.");
  } else {
    parts.push("I cannot find my footing.");
  }
  return parts.join(" ");
}

function driveLine(name: string, pressure: number): string {
  if (pressure < 0.15) return `${capitalizeName(name)} hums beneath the surface.`;
  if (pressure < 0.35) {
    return `${capitalizeName(name)} presses. Something wants tending here.`;
  }
  return `${capitalizeName(name)} pulls hard. This is not something I can set aside easily.`;
}

function capitalizeName(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function lowerName(s: string): string {
  return s.toLowerCase();
}

export const defaultVoice: VoiceModule = {
  compose: composeDefaultFelt,
};
