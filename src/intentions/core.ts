/**
 * Intentions: the place where pressure becomes something the being pursues.
 *
 * Three states, not two:
 *
 *   LATENT     pressure biases attention, gates capabilities, colors tone.
 *              Never articulated. Most pressure stays here. (v0.2 behavior,
 *              unchanged — this module adds nothing to it.)
 *   SURFACED   the impulse has become an object the being can consider, and
 *              has acquired an `aim`.
 *   COMMITTED  taken up as a standing intention, acted toward, terminated in
 *              a recorded way.
 *
 * The principle is unchanged: **Embers signals. The framework cognizes. Embers
 * integrates.** This module does not decide what surfaces, does not author
 * aims, and does not decide what to commit to. It records those decisions and
 * folds them into a current view.
 *
 * Two filters, and they reject for different reasons. Most latent pressure
 * never surfaces; of what surfaces, most is declined. A being whose every
 * pressure both surfaces and commits has no interior — everything it feels
 * immediately becomes something it is doing.
 *
 * See docs/design/v0.3/intention.md.
 */

import { drivePressure, weightedPressure } from "../drives/query.js";
import type {
  Being,
  Intention,
  IntentionEnd,
  IntentionEvent,
  Satisfier,
  SurfacedCandidate,
  SurfacingTrigger,
} from "../types.js";

/** Ring buffer capacity for the intention log. */
const DEFAULT_INTENTION_LOG_CAPACITY = 500;

/**
 * Maximum simultaneous **active pursuits**.
 *
 * Small because an `Intention` is a thing the being is doing now, not a value
 * it holds — see the note on {@link Intention} in types.ts. Three is not
 * derived from anything; it is small enough that committing has to displace
 * something, which is what keeps the adjudicator honest.
 *
 * Reaching the cap is a normal condition, not an error: `commit` supersedes the
 * least urgent pursuit and records it. A framework that wants to decline
 * instead can inspect `currentIntentions()` first — it is already sorted, so
 * the last element is what would be displaced.
 */
export const MAX_COMMITTED_INTENTIONS = 3;

/**
 * Age half-life for urgency.
 *
 * Six hours is active-pursuit pacing: something nobody has acted on since
 * yesterday has stopped being a pursuit whatever the log says. A standing
 * commitment would want a half-life measured in weeks, or none — which is
 * precisely why the two are not the same primitive.
 */
const URGENCY_AGE_HALFLIFE_MS = 6 * 3_600_000;

/** Diminishing return per failed attempt. */
const ATTEMPT_DECAY = 0.8;

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

function append(being: Being, event: IntentionEvent): void {
  being.history.intentionLog.push(event);
  while (being.history.intentionLog.length > DEFAULT_INTENTION_LOG_CAPACITY) {
    being.history.intentionLog.shift();
  }
}

/**
 * Records that a latent pressure has surfaced.
 *
 * The framework decides *that* something surfaced and authors *what the being
 * takes itself to want*. Embers supplies neither — it does not know what a
 * satisfier refers to, and it does not write prose.
 *
 * **Mutates** the being. Returns the candidate so the caller can adjudicate it.
 */
export function surface(
  being: Being,
  input: {
    sourceDriveId: string;
    satisfier: Satisfier;
    aim: string;
    trigger: SurfacingTrigger;
    /** Injectable for deterministic tests. */
    id?: string;
  },
): SurfacedCandidate {
  if (!being.drives.drives.has(input.sourceDriveId)) {
    throw new Error(
      `Cannot surface a candidate for unknown drive "${input.sourceDriveId}". ` +
        `Known drives: ${Array.from(being.drives.drives.keys()).join(", ") || "(none)"}`,
    );
  }

  const candidate: SurfacedCandidate = {
    id: input.id ?? nextId(being, "cand"),
    sourceDriveId: input.sourceDriveId,
    satisfier: input.satisfier,
    aim: input.aim,
    surfacedAtMs: being.elapsedMs,
    trigger: input.trigger,
  };

  append(being, { kind: "surfaced", atMs: being.elapsedMs, candidate });
  return candidate;
}

/**
 * Commits to a surfaced candidate. **Mutates** the being.
 *
 * At {@link MAX_COMMITTED_INTENTIONS} this supersedes the least urgent pursuit
 * rather than refusing. That is deliberate on two counts.
 *
 * Refusing would put the library in a judgment it has no standing to make: the
 * framework is the adjudicator, and it knows things urgency cannot express —
 * whether a satisfier is reachable right now, whether the being is somewhere it
 * can act. A less urgent pursuit may be the only actionable one.
 *
 * And superseding is not silent. The displaced pursuit ends with
 * `{ kind: "superseded", byIntentionId }`, so churn is visible in the log
 * instead of being smuggled through a caught exception. A framework that
 * commits carelessly is detectable by counting supersedes.
 *
 * A framework that would rather decline can inspect `currentIntentions()`
 * first — it is sorted by urgency, so the last element is what would go.
 *
 * Throws only for genuine caller errors: an unknown candidate, or one already
 * committed or declined.
 */
export function commit(being: Being, candidateId: string, intentionId?: string): Intention {
  const candidate = findCandidate(being, candidateId);
  if (!candidate) {
    throw new Error(`Unknown candidate "${candidateId}".`);
  }
  if (isResolved(being, candidateId)) {
    throw new Error(`Candidate "${candidateId}" was already committed or declined.`);
  }

  const id = intentionId ?? nextId(being, "int");

  // Sorted most-urgent-first, so the tail is what yields.
  const current = currentIntentions(being);
  if (current.length >= MAX_COMMITTED_INTENTIONS) {
    const displaced = current[current.length - 1]!;
    append(being, {
      kind: "ended",
      atMs: being.elapsedMs,
      intentionId: displaced.id,
      end: { kind: "superseded", byIntentionId: id },
    });
  }

  append(being, {
    kind: "committed",
    atMs: being.elapsedMs,
    candidateId,
    intentionId: id,
  });

  return foldIntentions(being).get(id)!;
}

/**
 * Declines a surfaced candidate. **Mutates** the being.
 *
 * Not a failure state. The being goes on being shaped by the pressure; it is
 * simply not pursuing it. Declines are recorded as richly as commitments,
 * because if the adjudicator is wrong the evidence of *how* it was wrong should
 * already be in the log.
 */
export function decline(being: Being, candidateId: string, reason: string): void {
  const candidate = findCandidate(being, candidateId);
  if (!candidate) {
    throw new Error(`Unknown candidate "${candidateId}".`);
  }
  if (isResolved(being, candidateId)) {
    throw new Error(`Candidate "${candidateId}" was already committed or declined.`);
  }

  append(being, { kind: "declined", atMs: being.elapsedMs, candidateId, reason });
}

/**
 * Records an action taken toward a commitment. **Mutates** the being.
 *
 * Attempts decay urgency: a commitment repeatedly acted on without discharging
 * its drive should lose ground to one that has not been tried.
 */
export function recordAction(being: Being, intentionId: string): void {
  if (!currentIntentions(being).some((i) => i.id === intentionId)) {
    throw new Error(`Intention "${intentionId}" is not currently committed.`);
  }
  append(being, { kind: "acted", atMs: being.elapsedMs, intentionId });
}

/**
 * Ends a commitment with its reason. **Mutates** the being.
 *
 * An intention that quietly vanishes is a hole in the attribution chain, which
 * is the one thing this design cannot tolerate — hence no untyped "remove".
 */
export function end(being: Being, intentionId: string, endState: IntentionEnd): void {
  if (!currentIntentions(being).some((i) => i.id === intentionId)) {
    throw new Error(`Intention "${intentionId}" is not currently committed.`);
  }
  append(being, { kind: "ended", atMs: being.elapsedMs, intentionId, end: endState });
}

// ---------------------------------------------------------------------------
// The fold
// ---------------------------------------------------------------------------

/** Replays the log into the set of live commitments. */
function foldIntentions(being: Being): Map<string, Intention> {
  const candidates = new Map<string, SurfacedCandidate>();
  const live = new Map<string, Intention>();

  for (const event of being.history.intentionLog) {
    switch (event.kind) {
      case "surfaced":
        candidates.set(event.candidate.id, event.candidate);
        break;

      case "committed": {
        const candidate = candidates.get(event.candidateId);
        // A commitment whose surfacing has aged out of the ring buffer cannot
        // be reconstructed. Dropping it is correct: an intention with no
        // reachable origin is exactly the dead end this design exists to avoid.
        if (!candidate) break;
        live.set(event.intentionId, {
          id: event.intentionId,
          aim: candidate.aim,
          sourceDriveId: candidate.sourceDriveId,
          satisfier: candidate.satisfier,
          fromCandidateId: candidate.id,
          formedAtMs: event.atMs,
          attempts: 0,
        });
        break;
      }

      case "acted": {
        const existing = live.get(event.intentionId);
        if (existing) {
          live.set(event.intentionId, { ...existing, attempts: existing.attempts + 1 });
        }
        break;
      }

      case "ended":
        live.delete(event.intentionId);
        break;

      case "declined":
        break;
    }
  }

  return live;
}

/**
 * The being's current commitments, most urgent first. **Pure.**
 *
 * Derived from the log on every call rather than stored, which is what makes
 * "when did it decide that, and on what basis" answerable by construction
 * instead of by logging discipline.
 */
export function currentIntentions(being: Being): Intention[] {
  return Array.from(foldIntentions(being).values()).sort(
    (a, b) => urgency(being, b) - urgency(being, a),
  );
}

/** Candidates that have surfaced and not yet been committed or declined. **Pure.** */
export function pendingCandidates(being: Being): SurfacedCandidate[] {
  const surfaced = new Map<string, SurfacedCandidate>();
  const resolved = new Set<string>();

  for (const event of being.history.intentionLog) {
    if (event.kind === "surfaced") surfaced.set(event.candidate.id, event.candidate);
    if (event.kind === "committed" || event.kind === "declined") resolved.add(event.candidateId);
  }

  return Array.from(surfaced.values()).filter((c) => !resolved.has(c.id));
}

/** Everything that has been declined, most recent first. **Pure.** */
export function recentDeclines(
  being: Being,
  limit = 20,
): Array<{ candidate: SurfacedCandidate; reason: string; atMs: number }> {
  const surfaced = new Map<string, SurfacedCandidate>();
  const out: Array<{ candidate: SurfacedCandidate; reason: string; atMs: number }> = [];

  for (const event of being.history.intentionLog) {
    if (event.kind === "surfaced") surfaced.set(event.candidate.id, event.candidate);
    if (event.kind === "declined") {
      const candidate = surfaced.get(event.candidateId);
      if (candidate) out.push({ candidate, reason: event.reason, atMs: event.atMs });
    }
  }

  return out.reverse().slice(0, limit);
}

// ---------------------------------------------------------------------------
// Urgency
// ---------------------------------------------------------------------------

/**
 * How pressing a commitment is right now. **Pure.**
 *
 * Deliberately *not* a stored field. Urgency reads the source drive's
 * **current** pressure, so a commitment whose drive has since been satisfied by
 * other means decays rather than being doggedly pursued. Freezing it at
 * formation is the same defect as storing depth instead of deriving it, and
 * this library already knows better.
 *
 * Three factors:
 * - current weighted pressure of the source drive (the dominant term)
 * - age, so a commitment nobody acts on fades rather than lingering forever
 * - attempts, so repeated failure yields to something untried
 *
 * Returns 0 when the source drive no longer exists.
 */
export function urgency(being: Being, intention: Intention): number {
  const drive = being.drives.drives.get(intention.sourceDriveId);
  if (!drive) return 0;

  const pressure = weightedPressure(drive);
  const ageMs = Math.max(0, being.elapsedMs - intention.formedAtMs);
  const ageFactor = 0.5 ** (ageMs / URGENCY_AGE_HALFLIFE_MS);
  const attemptFactor = ATTEMPT_DECAY ** intention.attempts;

  return pressure * ageFactor * attemptFactor;
}

/**
 * Raw (unweighted) pressure of a commitment's source drive. **Pure.**
 *
 * Exposed because a framework deciding whether to supersede one commitment with
 * another usually wants the need itself, not the need scaled by authoring
 * weight and decayed by age.
 */
export function sourcePressure(being: Being, intention: Intention): number {
  const drive = being.drives.drives.get(intention.sourceDriveId);
  return drive ? drivePressure(drive) : 0;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function findCandidate(being: Being, candidateId: string): SurfacedCandidate | undefined {
  for (let i = being.history.intentionLog.length - 1; i >= 0; i--) {
    const event = being.history.intentionLog[i]!;
    if (event.kind === "surfaced" && event.candidate.id === candidateId) {
      return event.candidate;
    }
  }
  return undefined;
}

function isResolved(being: Being, candidateId: string): boolean {
  return being.history.intentionLog.some(
    (e) => (e.kind === "committed" || e.kind === "declined") && e.candidateId === candidateId,
  );
}

/**
 * Monotonic per-being id.
 *
 * Derived from log length and elapsed time rather than a random source, because
 * `Math.random()` would make a being's history unreproducible — and replaying a
 * log to explain a decision is the point of having one.
 */
function nextId(being: Being, prefix: string): string {
  return `${prefix}-${being.history.intentionLog.length}-${being.elapsedMs}`;
}
