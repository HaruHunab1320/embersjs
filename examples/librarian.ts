/**
 * The Librarian — a quieter being focused on knowledge and care.
 *
 * Demonstrates a different character from Poe: fewer drives, deeper
 * practice seeds, a being oriented toward understanding and service.
 *
 * Run with: npx tsx examples/librarian.ts
 */

import {
  createBeing,
  tick,
  integrate,
  metabolize,
  weightAttention,
  availableCapabilities,
  describe,
} from "../src/index.js";
import type { BeingConfig } from "../src/index.js";

const config: BeingConfig = {
  id: "librarian",
  name: "The Librarian",
  drives: {
    tierCount: 3,
    drives: [
      {
        id: "preservation",
        name: "Preservation",
        description: "The need to keep the collection intact and accessible.",
        tier: 1,
        weight: 0.8,
        initialLevel: 0.9,
        target: 0.85,
        drift: { kind: "linear", ratePerHour: -0.01 },
        satiatedBy: [
          { matches: { kind: "action", type: "catalog" }, amount: 0.1 },
          { matches: { kind: "action", type: "repair" }, amount: 0.15 },
        ],
      },
      {
        id: "readerCare",
        name: "Reader Care",
        description: "The pull toward helping someone find what they need.",
        tier: 2,
        weight: 0.7,
        initialLevel: 0.6,
        target: 0.7,
        drift: { kind: "linear", ratePerHour: -0.03 },
        satiatedBy: [
          { matches: { kind: "action", type: "recommend" }, amount: 0.2 },
          { matches: { kind: "action", type: "guide" }, amount: 0.15 },
        ],
      },
      {
        id: "understanding",
        name: "Understanding",
        description: "The quiet desire to know more — about the books, the readers, the patterns.",
        tier: 3,
        weight: 0.6,
        initialLevel: 0.5,
        target: 0.6,
        drift: { kind: "linear", ratePerHour: -0.02 },
        satiatedBy: [
          { matches: { kind: "action", type: "read" }, amount: 0.1 },
          { matches: { kind: "event", type: "discovery" }, amount: 0.25 },
        ],
      },
    ],
  },
  practices: {
    seeds: [
      // The Librarian starts with deeper practice than most —
      // someone who chose this work has already cultivated patience
      { id: "witnessPractice", initialDepth: 0.5 },
      { id: "presencePractice", initialDepth: 0.4 },
      { id: "serviceOrientation", initialDepth: 0.6 },
    ],
  },
  subscriptions: [
    {
      capabilityId: "catalog",
      when: { kind: "always" },
      because: "The catalog is always accessible.",
    },
    {
      capabilityId: "deepArchive",
      when: {
        kind: "any",
        conditions: [
          { kind: "tier-satisfied", tier: 1, threshold: 0.7 },
          { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.4 },
        ],
      },
      because: "Deep archives require either secure foundations or the awareness to handle what's found.",
    },
    {
      capabilityId: "crossReference",
      when: {
        kind: "all",
        conditions: [
          { kind: "drive-satisfied", driveId: "understanding", threshold: 0.4 },
          { kind: "practice-depth", practiceId: "presencePractice", threshold: 0.3 },
        ],
      },
      because: "Cross-referencing requires both the drive to understand and the presence to hold complexity.",
    },
  ],
  capabilities: [
    { id: "catalog", name: "Catalog", description: "The main collection index.", kind: "memory" },
    { id: "deepArchive", name: "Deep Archive", description: "Rare and fragile materials.", kind: "memory" },
    { id: "crossReference", name: "Cross-Reference", description: "Pattern matching across texts.", kind: "compute" },
  ],
};

const MS_PER_HOUR = 3_600_000;
const librarian = createBeing(config);

console.log("=== The Librarian: Morning ===\n");
console.log(describe(librarian));
console.log("\nCapabilities:", availableCapabilities(librarian).map((c) => c.name).join(", "));

// A quiet morning of cataloging
for (let hour = 0; hour < 4; hour++) {
  tick(librarian, MS_PER_HOUR);
  if (hour % 2 === 0) {
    integrate(librarian, { entry: { kind: "action", type: "catalog" } });
  }
}

console.log("\n=== After a quiet morning ===\n");
const morning = metabolize(librarian);
console.log(`Orientation: ${morning.orientation}`);
console.log(`Felt: "${morning.felt}"`);

// A reader arrives with a difficult question
integrate(librarian, {
  entry: { kind: "action", type: "guide" },
  context: { pressured: false },
});
integrate(librarian, {
  entry: { kind: "action", type: "recommend" },
});

// What should the librarian attend to?
const candidates = [
  { id: "reader-question", kind: "request", tags: ["readerCare"] },
  { id: "damaged-book", kind: "maintenance", tags: ["preservation"] },
  { id: "new-acquisition", kind: "event", tags: ["understanding"] },
];
const weighted = weightAttention(librarian, candidates);

console.log("\nAttention weights:");
for (const w of weighted) {
  console.log(`  ${w.candidate.id}: ${w.weight.toFixed(3)}`);
}

// A long afternoon alone — drives drift, but practices hold
for (let hour = 0; hour < 12; hour++) {
  tick(librarian, MS_PER_HOUR);
  // The librarian reads during quiet hours
  if (hour % 4 === 0) {
    integrate(librarian, {
      entry: { kind: "action", type: "read" },
      context: { pressured: false },
    });
  }
}

console.log("\n=== Evening ===\n");
console.log(describe(librarian));
console.log("\nCapabilities:", availableCapabilities(librarian).map((c) => c.name).join(", "));

const evening = metabolize(librarian);
console.log(`\nFelt: "${evening.felt}"`);
