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
  DrainFailure,
  DrainOptions,
  DrainResult,
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
 * The shared drain loop.
 *
 * Takes the resolver as a parameter so callers can supply a wrapped one —
 * `lifecycle.resolveAllPending` passes its milestone-recording variant. This
 * exists so there is exactly one drain implementation; a second copy would
 * inevitably diverge on which resolver it called.
 *
 * Evaluators are usually model calls, which fail intermittently. A failure on
 * one attempt does not abort the drain: that attempt is left pending (so a
 * later drain can retry it) and reported in `failures`. Every other attempt
 * still resolves.
 *
 * Set `concurrency` above 1 to evaluate attempts in parallel. Resolution
 * itself stays serialized, so substrate ordering is deterministic given a
 * deterministic evaluator.
 */
export async function drainPending(
  being: Being,
  evaluate: (attempt: PracticeAttempt) => PracticeAttemptResult | Promise<PracticeAttemptResult>,
  resolveOne: (being: Being, attemptId: string, result: PracticeAttemptResult) => AttemptResolution,
  options: DrainOptions = {},
): Promise<DrainResult> {
  const pending = being.pendingAttempts.filter((a) => a.status === "pending");
  if (pending.length === 0) return { resolutions: [], failures: [] };

  const concurrency = Math.max(1, Math.floor(options.concurrency ?? 1));

  // Phase 1 — evaluate (parallelizable, no mutation).
  type Verdict = { ok: true; value: PracticeAttemptResult } | { ok: false; error: unknown };
  const verdicts: Verdict[] = new Array(pending.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < pending.length) {
      const index = cursor++;
      const attempt = pending[index]!;
      try {
        verdicts[index] = { ok: true, value: await evaluate(attempt) };
      } catch (error) {
        verdicts[index] = { ok: false, error };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, () => worker()));

  // Phase 2 — apply (serialized, in the original attempt order).
  const resolutions: AttemptResolution[] = [];
  const failures: DrainFailure[] = [];

  for (let i = 0; i < pending.length; i++) {
    const attempt = pending[i]!;
    const verdict = verdicts[i]!;

    if (!verdict.ok) {
      failures.push({
        attemptId: attempt.id,
        practiceId: attempt.practiceId,
        error: verdict.error,
      });
      continue;
    }

    try {
      resolutions.push(resolveOne(being, attempt.id, verdict.value));
    } catch (error) {
      failures.push({ attemptId: attempt.id, practiceId: attempt.practiceId, error });
    }
  }

  return { resolutions, failures };
}

function appendArtifact(substrate: PracticeSubstrate, artifact: Artifact): PracticeSubstrate {
  const next = [...substrate.artifacts, artifact];
  if (next.length > substrate.capacity) {
    next.splice(0, next.length - substrate.capacity);
  }
  return { artifacts: next, capacity: substrate.capacity };
}
