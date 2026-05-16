/**
 * Practice attempt resolution: phase 2 of the two-phase evaluation mechanic.
 *
 * The framework supplies a verdict (quality + accepted + content); Embers
 * stores the resulting artifact in the practice's substrate. Depth derives
 * from substrate, so accepted attempts grow depth while rejected attempts
 * leave it unchanged.
 *
 * No verdict means no growth. The library never invents quality.
 */

import type {
  Artifact,
  AttemptResolution,
  Being,
  PracticeAttempt,
  PracticeAttemptResult,
  PracticeSubstrate,
} from "../types.js";
import { clamp01 } from "../util.js";
import { computeDepth } from "./depth.js";

/**
 * Resolves a pending practice attempt.
 *
 * If accepted (and quality > 0), creates an Artifact and adds it to the
 * practice's substrate (FIFO eviction at capacity). The attempt's status
 * transitions to "resolved" or "rejected".
 *
 * Mutates the being. Throws if the attempt is unknown or not pending.
 */
export function resolveAttempt(
  being: Being,
  attemptId: string,
  result: PracticeAttemptResult,
): AttemptResolution {
  const attempt = being.pendingAttempts.find((a) => a.id === attemptId);
  if (!attempt) {
    throw new Error(`Unknown practice attempt id: "${attemptId}"`);
  }
  if (attempt.status !== "pending") {
    throw new Error(`Attempt "${attemptId}" is not pending (status: ${attempt.status})`);
  }

  const practice = being.practices.practices.get(attempt.practiceId);
  if (!practice) {
    throw new Error(`Attempt references unknown practice: "${attempt.practiceId}"`);
  }

  const depthBefore = computeDepth(practice, being.elapsedMs);
  const accepted = result.accepted && result.quality > 0;

  let artifactStored: Artifact | undefined;

  if (accepted) {
    artifactStored = {
      attemptId: attempt.id,
      atMs: being.elapsedMs,
      quality: clamp01(result.quality),
      underPressure: attempt.underPressure,
      content: result.content,
      reasons: result.reasons,
    };
    practice.substrate = appendArtifact(practice.substrate, artifactStored);
  }

  being.pendingAttempts = being.pendingAttempts.map((a) =>
    a.id === attemptId
      ? { ...a, status: accepted ? ("resolved" as const) : ("rejected" as const) }
      : a,
  );

  const depthAfter = computeDepth(practice, being.elapsedMs);

  return {
    attemptId: attempt.id,
    practiceId: attempt.practiceId,
    accepted,
    artifactStored,
    depthBefore,
    depthAfter,
  };
}

/**
 * Drains all pending attempts using the supplied evaluator.
 *
 * Calls the evaluator for each pending attempt and resolves with the result.
 * Errors from the evaluator propagate; the corresponding attempt remains pending.
 */
export async function resolveAllPending(
  being: Being,
  evaluate: (attempt: PracticeAttempt) => PracticeAttemptResult | Promise<PracticeAttemptResult>,
): Promise<AttemptResolution[]> {
  const pending = being.pendingAttempts.filter((a) => a.status === "pending");
  const resolutions: AttemptResolution[] = [];

  for (const attempt of pending) {
    const result = await evaluate(attempt);
    resolutions.push(resolveAttempt(being, attempt.id, result));
  }

  return resolutions;
}

function appendArtifact(substrate: PracticeSubstrate, artifact: Artifact): PracticeSubstrate {
  const next = [...substrate.artifacts, artifact];
  if (next.length > substrate.capacity) {
    next.splice(0, next.length - substrate.capacity);
  }
  return { artifacts: next, capacity: substrate.capacity };
}
