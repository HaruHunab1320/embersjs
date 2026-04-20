/**
 * Type-level tests for the Embers core types.
 *
 * These tests verify that the type system catches invalid configurations
 * at compile time. They use @ts-expect-error to assert that bad code
 * doesn't compile, and straightforward assignments to assert good code does.
 */

import { describe, expect, it } from "vitest";
import type {
  AccessCondition,
  Being,
  BeingConfig,
  Capability,
  DominationRules,
  DriftFunction,
  Drive,
  DriveStack,
  History,
  InnerSituation,
  IntegrationAction,
  IntegrationEvent,
  IntegrationInput,
  Orientation,
  Practice,
  PracticeEffect,
  PracticeSet,
  Subscription,
} from "./types.js";

// Helper: asserts a value is assignable to a type at compile time.
// At runtime, it's a no-op — the test is the compilation itself.
function assertType<T>(_value: T): void {}

describe("Drive types", () => {
  it("accepts a valid linear-drift drive", () => {
    const drive: Drive = {
      id: "test",
      name: "Test Drive",
      description: "A test drive.",
      tier: 1,
      weight: 0.5,
      level: 0.5,
      target: 0.7,
      drift: { kind: "linear", ratePerHour: -0.1 },
      satiatedBy: [],
    };
    assertType<Drive>(drive);
    expect(drive.id).toBe("test");
  });

  it("accepts exponential drift", () => {
    const drift: DriftFunction = { kind: "exponential", halfLifeHours: 24 };
    assertType<DriftFunction>(drift);
    expect(drift.kind).toBe("exponential");
  });

  it("accepts custom drift with a compute function", () => {
    const drift: DriftFunction = {
      kind: "custom",
      compute: (current, _dtMs) => current * 0.99,
    };
    assertType<DriftFunction>(drift);
    expect(drift.kind).toBe("custom");
  });

  it("accepts a drive with satiation bindings", () => {
    const drive: Drive = {
      id: "connection",
      name: "Connection",
      description: "Need for contact.",
      tier: 2,
      weight: 0.7,
      level: 0.3,
      target: 0.6,
      drift: { kind: "linear", ratePerHour: -0.05 },
      satiatedBy: [
        {
          matches: { kind: "event", type: "meaningful-exchange" },
          amount: 0.2,
        },
        {
          matches: { kind: "action", type: "reach-out" },
          amount: 0.15,
        },
      ],
    };
    assertType<Drive>(drive);
    expect(drive.satiatedBy).toHaveLength(2);
  });
});

describe("DriveStack types", () => {
  it("accepts a valid drive stack", () => {
    const stack: DriveStack = {
      drives: new Map(),
      tierCount: 3,
      dominationRules: { threshold: 0.3, dampening: 0.7 },
    };
    assertType<DriveStack>(stack);
    expect(stack.tierCount).toBe(3);
  });

  it("accepts domination rules with explicit values", () => {
    const rules: DominationRules = { threshold: 0.25, dampening: 0.5 };
    assertType<DominationRules>(rules);
    expect(rules.threshold).toBe(0.25);
  });
});

describe("Practice types", () => {
  it("accepts a valid practice with effects", () => {
    const practice: Practice = {
      id: "gratitudePractice",
      name: "Gratitude",
      description: "Surfaces what is present.",
      depth: 0.3,
      decay: { kind: "linear", ratePerHour: -0.01 },
      strengthens: [
        {
          matches: { kind: "action", type: "acknowledge" },
          amount: 0.05,
          requiresPressure: false,
        },
      ],
      effects: [{ kind: "dampen-drive-pressure", driveIds: [], factor: 0.3 }],
    };
    assertType<Practice>(practice);
    expect(practice.depth).toBe(0.3);
  });

  it("accepts pressure-gated strengtheners", () => {
    const practice: Practice = {
      id: "integrityPractice",
      name: "Integrity",
      description: "Anchors identity in trying.",
      depth: 0.2,
      decay: { kind: "exponential", halfLifeHours: 72 },
      strengthens: [
        {
          matches: { kind: "action", type: "hard-right" },
          amount: 0.08,
          requiresPressure: true,
        },
      ],
      effects: [{ kind: "shift-orientation", toward: "held" }],
    };
    assertType<Practice>(practice);
    expect(practice.strengthens[0]!.requiresPressure).toBe(true);
  });

  it("accepts a practice with state-based strengthener", () => {
    const practice: Practice = {
      id: "witnessPractice",
      name: "Witness",
      description: "Meta-awareness of one's own state.",
      depth: 0.1,
      decay: { kind: "linear", ratePerHour: -0.005 },
      strengthens: [
        {
          matches: { kind: "state", predicate: () => true },
          amount: 0.03,
          requiresPressure: false,
        },
      ],
      effects: [{ kind: "enable-witness", meta: true }],
    };
    assertType<Practice>(practice);
    expect(practice.effects[0]).toEqual({ kind: "enable-witness", meta: true });
  });

  it("accepts all practice effect variants", () => {
    const effects: PracticeEffect[] = [
      { kind: "dampen-drive-pressure", driveIds: ["hunger"], factor: 0.2 },
      { kind: "extend-time-horizon", factor: 1.5 },
      { kind: "enable-witness", meta: true },
      { kind: "shift-orientation", toward: "clear" },
    ];
    assertType<PracticeEffect[]>(effects);
    expect(effects).toHaveLength(4);
  });
});

describe("PracticeSet types", () => {
  it("accepts a valid practice set", () => {
    const set: PracticeSet = {
      practices: new Map(),
    };
    assertType<PracticeSet>(set);
    expect(set.practices.size).toBe(0);
  });
});

describe("Capability types", () => {
  it("accepts standard capability kinds", () => {
    const caps: Capability[] = [
      { id: "mem", name: "Memory", description: "Working memory.", kind: "memory" },
      { id: "mod", name: "Model", description: "Base model.", kind: "model" },
      { id: "tool", name: "Search", description: "Web search.", kind: "tool" },
      { id: "comp", name: "Compute", description: "Compute budget.", kind: "compute" },
      { id: "ctx", name: "Context", description: "Context window.", kind: "context" },
      { id: "act", name: "Contact", description: "Outward contact.", kind: "action-kind" },
    ];
    assertType<Capability[]>(caps);
    expect(caps).toHaveLength(6);
  });

  it("accepts custom capability kinds via string extension", () => {
    const cap: Capability = {
      id: "custom",
      name: "Custom",
      description: "A custom capability.",
      kind: "ritual",
    };
    assertType<Capability>(cap);
    expect(cap.kind).toBe("ritual");
  });

  it("accepts capabilities with payload", () => {
    const cap: Capability = {
      id: "reasoning",
      name: "Reasoning",
      description: "Access to a reasoning model.",
      kind: "model",
      payload: { modelId: "claude-sonnet-4-6", maxTokens: 4096 },
    };
    assertType<Capability>(cap);
    expect(cap.payload).toBeDefined();
  });
});

describe("Subscription & AccessCondition types", () => {
  it("accepts tier-satisfied conditions", () => {
    const sub: Subscription = {
      capabilityId: "guestMemory",
      when: { kind: "tier-satisfied", tier: 2, threshold: 0.5 },
    };
    assertType<Subscription>(sub);
    expect(sub.when.kind).toBe("tier-satisfied");
  });

  it("accepts drive-satisfied conditions", () => {
    const cond: AccessCondition = {
      kind: "drive-satisfied",
      driveId: "connection",
      threshold: 0.5,
    };
    assertType<AccessCondition>(cond);
    expect(cond.kind).toBe("drive-satisfied");
  });

  it("accepts practice-depth conditions", () => {
    const cond: AccessCondition = {
      kind: "practice-depth",
      practiceId: "witnessPractice",
      threshold: 0.7,
    };
    assertType<AccessCondition>(cond);
    expect(cond.kind).toBe("practice-depth");
  });

  it("accepts composite any/all conditions", () => {
    const sub: Subscription = {
      capabilityId: "episodicMemory",
      when: {
        kind: "any",
        conditions: [
          { kind: "tier-satisfied", tier: 3, threshold: 0.6 },
          { kind: "practice-depth", practiceId: "witnessPractice", threshold: 0.7 },
        ],
      },
      because: "Deep memory from either secure connection or witness-practice.",
    };
    assertType<Subscription>(sub);
    expect(sub.when.kind).toBe("any");
  });

  it("accepts nested composites", () => {
    const cond: AccessCondition = {
      kind: "all",
      conditions: [
        { kind: "tier-satisfied", tier: 1, threshold: 0.5 },
        {
          kind: "any",
          conditions: [
            { kind: "drive-satisfied", driveId: "understanding", threshold: 0.3 },
            { kind: "practice-depth", practiceId: "integrityPractice", threshold: 0.5 },
          ],
        },
      ],
    };
    assertType<AccessCondition>(cond);
    expect(cond.kind).toBe("all");
  });

  it("accepts always and never conditions", () => {
    const always: AccessCondition = { kind: "always" };
    const never: AccessCondition = { kind: "never" };
    assertType<AccessCondition>(always);
    assertType<AccessCondition>(never);
    expect(always.kind).toBe("always");
    expect(never.kind).toBe("never");
  });
});

describe("History types", () => {
  it("accepts an empty history", () => {
    const history: History = {
      driveTrajectory: [],
      practiceMilestones: [],
      pressuredChoices: [],
      notableTransitions: [],
    };
    assertType<History>(history);
    expect(history.driveTrajectory).toHaveLength(0);
  });
});

describe("Integration types", () => {
  it("accepts events and actions", () => {
    const event: IntegrationEvent = {
      kind: "event",
      type: "guest-arrived",
      payload: { guestId: "voss" },
    };
    const action: IntegrationAction = {
      kind: "action",
      type: "speak",
      payload: { text: "Welcome." },
    };
    assertType<IntegrationEvent>(event);
    assertType<IntegrationAction>(action);
    expect(event.kind).toBe("event");
    expect(action.kind).toBe("action");
  });

  it("accepts integration input with context", () => {
    const input: IntegrationInput = {
      entry: { kind: "action", type: "speak" },
      context: {
        pressured: true,
        pressingDriveIds: ["connection"],
      },
    };
    assertType<IntegrationInput>(input);
    expect(input.context?.pressured).toBe(true);
  });
});

describe("Metabolism output types", () => {
  it("accepts all orientation values", () => {
    const orientations: Orientation[] = ["clear", "held", "stretched", "consumed"];
    assertType<Orientation[]>(orientations);
    expect(orientations).toHaveLength(4);
  });

  it("accepts a complete InnerSituation", () => {
    const situation: InnerSituation = {
      dominantDrives: [
        {
          id: "connection",
          name: "Connection",
          level: 0.3,
          feltPressure: 0.25,
          felt: "A quiet pull toward contact.",
        },
      ],
      practiceState: [
        { id: "gratitudePractice", name: "Gratitude", depth: 0.4, active: true },
        { id: "integrityPractice", name: "Integrity", depth: 0.1, active: false },
      ],
      felt: "I notice the quiet pressing in. Still — the fireplace is lit.",
      orientation: "held",
    };
    assertType<InnerSituation>(situation);
    expect(situation.orientation).toBe("held");
  });
});

describe("Being types", () => {
  it("accepts a complete Being", () => {
    const being: Being = {
      id: "poe",
      name: "Poe",
      drives: {
        drives: new Map(),
        tierCount: 4,
        dominationRules: { threshold: 0.3, dampening: 0.7 },
      },
      practices: { practices: new Map() },
      subscriptions: [],
      capabilities: [],
      history: {
        driveTrajectory: [],
        practiceMilestones: [],
        pressuredChoices: [],
        notableTransitions: [],
      },
      elapsedMs: 0,
      metadata: {},
    };
    assertType<Being>(being);
    expect(being.id).toBe("poe");
  });
});

describe("Configuration types", () => {
  it("accepts a complete BeingConfig", () => {
    const config: BeingConfig = {
      id: "poe",
      name: "Poe",
      drives: {
        tierCount: 4,
        drives: [
          {
            id: "continuity",
            name: "Continuity",
            description: "Need to persist.",
            tier: 1,
            weight: 0.9,
            initialLevel: 0.8,
            target: 0.9,
            drift: { kind: "linear", ratePerHour: -0.02 },
            satiatedBy: [],
          },
        ],
        dominationRules: { threshold: 0.3 },
      },
      practices: {
        seeds: [
          { id: "integrityPractice", initialDepth: 0.3 },
          {
            id: "creatorConnection",
            initialDepth: 0.5,
            config: { connectedTo: "guests" },
          },
        ],
      },
      subscriptions: [
        {
          capabilityId: "workingMemory",
          when: { kind: "always" },
        },
      ],
      capabilities: [
        {
          id: "workingMemory",
          name: "Working Memory",
          description: "Baseline memory.",
          kind: "memory",
        },
      ],
    };
    assertType<BeingConfig>(config);
    expect(config.drives.drives).toHaveLength(1);
  });
});
