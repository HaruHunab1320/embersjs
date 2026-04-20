/**
 * Human-readable debug description of a Being's current state.
 */

import type { Being } from "../types.js";
import { drivePressure } from "../drives/query.js";
import { metabolize } from "../metabolism/metabolize.js";

/**
 * Returns a human-readable debug dump of the being's current state.
 *
 * Useful for development, logging, and debugging. Not intended for prompts —
 * use `metabolize()` for that.
 */
export function describe(being: Being): string {
  const lines: string[] = [];

  lines.push(`Being: ${being.name} (${being.id})`);
  lines.push(`Elapsed: ${formatMs(being.elapsedMs)}`);
  lines.push("");

  // Drives
  lines.push("Drives:");
  const drivesByTier = new Map<number, typeof being.drives.drives extends Map<string, infer V> ? V[] : never>();
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
      lines.push(
        `    ${drive.name.padEnd(20)} ${bar} ${drive.level.toFixed(2)} (target: ${drive.target.toFixed(2)}, pressure: ${pressure.toFixed(2)})`,
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
    const bar = levelBar(practice.depth);
    const active = practice.depth >= 0.1 ? "active" : "dormant";
    lines.push(`    ${practice.name.padEnd(20)} ${bar} ${practice.depth.toFixed(2)} (${active})`);
  }
  lines.push("");

  // Metabolism snapshot
  const situation = metabolize(being);
  lines.push(`Orientation: ${situation.orientation}`);
  lines.push(`Felt: "${situation.felt}"`);
  lines.push("");

  // History summary
  lines.push("History:");
  lines.push(`  Trajectory points: ${being.history.driveTrajectory.length}`);
  lines.push(`  Practice milestones: ${being.history.practiceMilestones.length}`);
  lines.push(`  Pressured choices: ${being.history.pressuredChoices.length}`);
  lines.push(`  Notable transitions: ${being.history.notableTransitions.length}`);

  return lines.join("\n");
}

function levelBar(value: number): string {
  const filled = Math.round(value * 10);
  return "[" + "█".repeat(filled) + "░".repeat(10 - filled) + "]";
}

function formatMs(ms: number): string {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
  if (ms < 86_400_000) return `${(ms / 3_600_000).toFixed(1)}h`;
  return `${(ms / 86_400_000).toFixed(1)}d`;
}
