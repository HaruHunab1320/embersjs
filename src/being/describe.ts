/**
 * Human-readable debug description of a Being's current state.
 */

import { drivePressure } from "../drives/query.js";
import { metabolize } from "../metabolism/metabolize.js";
import { computeDepth } from "../practices/depth.js";
import type { Being } from "../types.js";
import { isChronic } from "../wear/query.js";

/**
 * Returns a human-readable debug dump of the being's state.
 *
 * Useful for development and logging. Not intended for prompts —
 * use `metabolize()` for that.
 */
export function describe(being: Being): string {
  const lines: string[] = [];

  lines.push(`Being: ${being.name} (${being.id})`);
  lines.push(`Elapsed: ${formatMs(being.elapsedMs)}`);
  lines.push(`Wear: ${being.wear.chronicLoad.toFixed(2)} (chronic load)`);
  lines.push("");

  // Drives
  lines.push("Drives:");
  const drivesByTier = new Map<
    number,
    typeof being.drives.drives extends Map<string, infer V> ? V[] : never
  >();
  for (const drive of being.drives.drives.values()) {
    const tier = drivesByTier.get(drive.tier) ?? [];
    tier.push(drive);
    drivesByTier.set(drive.tier, tier);
  }

  for (let tier = 1; tier <= being.drives.tierCount; tier++) {
    const drives = drivesByTier.get(tier) ?? [];
    lines.push(`  Tier ${tier}:`);
    for (const drive of drives) {
      const pressure = drivePressure(drive);
      const bar = levelBar(drive.level);
      const chronic = isChronic(being.wear, drive.id, being.wearConfig) ? " CHRONIC" : "";
      lines.push(
        `    ${drive.name.padEnd(20)} ${bar} ${drive.level.toFixed(2)} (target: ${drive.target.toFixed(2)}, pressure: ${pressure.toFixed(2)})${chronic}`,
      );
    }
  }
  lines.push("");

  // Practices
  lines.push("Practices:");
  if (being.practices.practices.size === 0) {
    lines.push("  (none)");
  }
  for (const practice of being.practices.practices.values()) {
    const depth = computeDepth(practice, being.elapsedMs);
    const bar = levelBar(depth);
    const active = depth >= 0.1 ? "active" : "dormant";
    const substrateInfo = `${practice.substrate.artifacts.length}/${practice.substrate.capacity} artifacts`;
    lines.push(
      `    ${practice.name.padEnd(20)} ${bar} ${depth.toFixed(2)} (${active}, ${substrateInfo})`,
    );
  }
  lines.push("");

  // Pending attempts
  if (being.pendingAttempts.length > 0) {
    const pending = being.pendingAttempts.filter((a) => a.status === "pending");
    if (pending.length > 0) {
      lines.push(`Pending attempts: ${pending.length}`);
      for (const a of pending.slice(0, 5)) {
        lines.push(
          `    ${a.practiceId} (trigger ${a.triggerIndex}, age ${formatMs(being.elapsedMs - a.attemptedAtMs)})`,
        );
      }
      if (pending.length > 5) {
        lines.push(`    ... and ${pending.length - 5} more`);
      }
      lines.push("");
    }
  }

  // Metabolism snapshot
  const situation = metabolize(being);
  lines.push(`Orientation: ${situation.orientation}`);
  if (situation.felt) {
    lines.push(`Felt: "${situation.felt}"`);
  }
  lines.push("");

  // History summary
  lines.push("History:");
  lines.push(`  Trajectory points: ${being.history.driveTrajectory.length}`);
  lines.push(`  Recent entries: ${being.history.recentEntries.length}`);
  lines.push(`  Practice milestones: ${being.history.practiceMilestones.length}`);
  lines.push(`  Pressured choices: ${being.history.pressuredChoices.length}`);
  lines.push(`  Notable transitions: ${being.history.notableTransitions.length}`);

  return lines.join("\n");
}

function levelBar(value: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(value * 10)));
  return `[${"█".repeat(filled)}${"░".repeat(10 - filled)}]`;
}

function formatMs(ms: number): string {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}
