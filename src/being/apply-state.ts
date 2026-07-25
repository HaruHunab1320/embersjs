/**
 * Applying persisted state onto a freshly-constructed Being.
 *
 * `deserializeBeing()` restores data faithfully but cannot restore functions —
 * matcher predicates, custom drift functions, and custom depth functions are
 * stripped by serialization. A deserialized Being therefore has correct state
 * but dead behavior: its satiation predicates never match, its custom drift
 * is identity, its custom depth falls back to the default.
 *
 * The fix is to rebuild from the original config (which restores every
 * function) and then transplant the persisted state onto it:
 *
 * ```ts
 * const fresh = createBeing(originalConfig);      // live functions, initial state
 * const restored = deserializeBeing(saved);       // real state, dead functions
 * applyState(fresh, restored);                    // live functions, real state
 * ```
 *
 * The split is mechanical: everything mutable on `Being` is state and gets
 * copied; everything readonly is config and is left alone.
 *
 * Copied:   drive levels, practice substrate, wear, pendingAttempts,
 *           history, elapsedMs
 * Retained: ids, names, tiers, weights, targets, drift functions, satiation
 *           bindings, practice protocols, capabilities, subscriptions,
 *           wearConfig, metadata
 */

import type { Being } from "../types.js";

/**
 * What `applyState` transplanted, and what it could not.
 *
 * Non-empty `skipped*` arrays mean the persisted state referenced entities the
 * current config no longer defines — usually a sign the config changed since
 * the snapshot was written. That state is dropped.
 */
export interface ApplyStateResult {
  /** Drive ids whose level was transplanted. */
  readonly drivesApplied: readonly string[];
  /** Drive ids present in the snapshot but absent from the target's config. */
  readonly skippedDrives: readonly string[];
  /** Practice ids whose substrate was transplanted. */
  readonly practicesApplied: readonly string[];
  /** Practice ids present in the snapshot but absent from the target's config. */
  readonly skippedPractices: readonly string[];
  /** Pending attempts dropped because their practice no longer exists. */
  readonly skippedAttempts: number;
}

/**
 * Copies persisted state from `source` onto `target`, preserving `target`'s
 * live functions and configuration.
 *
 * `target` is normally a fresh `createBeing(config)`; `source` is normally the
 * output of `deserializeBeing(saved)`. Entities in `source` that `target`'s
 * config does not define are skipped and reported, never invented.
 *
 * Mutates `target`. Does not read functions from `source`, so it is safe to
 * pass a deserialized Being whose functions are already stripped.
 */
export function applyState(target: Being, source: Being): ApplyStateResult {
  const drivesApplied: string[] = [];
  const skippedDrives: string[] = [];

  for (const [driveId, sourceDrive] of source.drives.drives) {
    const targetDrive = target.drives.drives.get(driveId);
    if (!targetDrive) {
      skippedDrives.push(driveId);
      continue;
    }
    // Level is the only per-drive state. Everything else — tier, weight,
    // target, drift, satiatedBy — is config and belongs to the target.
    targetDrive.level = sourceDrive.level;
    drivesApplied.push(driveId);
  }

  const practicesApplied: string[] = [];
  const skippedPractices: string[] = [];

  for (const [practiceId, sourcePractice] of source.practices.practices) {
    const targetPractice = target.practices.practices.get(practiceId);
    if (!targetPractice) {
      skippedPractices.push(practiceId);
      continue;
    }
    // Substrate is the practice's entire state — depth derives from it.
    // Respect the target's capacity, which is config, not state.
    const capacity = targetPractice.substrate.capacity;
    const artifacts = sourcePractice.substrate.artifacts.slice(-capacity);
    targetPractice.substrate = { artifacts, capacity };
    practicesApplied.push(practiceId);
  }

  // Attempts referencing practices the target no longer defines can never be
  // resolved — resolveAttempt would throw on them. Drop them.
  const keptAttempts = source.pendingAttempts.filter((a) =>
    target.practices.practices.has(a.practiceId),
  );

  target.wear = {
    perDrive: new Map(source.wear.perDrive),
    chronicLoad: source.wear.chronicLoad,
  };
  target.pendingAttempts = keptAttempts;
  target.history = source.history;
  target.elapsedMs = source.elapsedMs;

  return {
    drivesApplied,
    skippedDrives,
    practicesApplied,
    skippedPractices,
    skippedAttempts: source.pendingAttempts.length - keptAttempts.length,
  };
}
