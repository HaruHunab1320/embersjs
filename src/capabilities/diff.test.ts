import { describe, expect, it } from "vitest";
import type { Capability } from "../types.js";
import { capabilityDiff } from "./diff.js";

const a: Capability = { id: "a", name: "A", description: "", kind: "memory" };
const b: Capability = { id: "b", name: "B", description: "", kind: "model" };
const c: Capability = { id: "c", name: "C", description: "", kind: "tool" };

describe("capabilityDiff", () => {
  it("detects gained capabilities", () => {
    const diff = capabilityDiff([a], [a, b]);
    expect(diff.gained.map((c) => c.id)).toEqual(["b"]);
    expect(diff.lost).toHaveLength(0);
    expect(diff.retained.map((c) => c.id)).toEqual(["a"]);
  });

  it("detects lost capabilities", () => {
    const diff = capabilityDiff([a, b], [a]);
    expect(diff.lost.map((c) => c.id)).toEqual(["b"]);
    expect(diff.gained).toHaveLength(0);
    expect(diff.retained.map((c) => c.id)).toEqual(["a"]);
  });

  it("handles no change", () => {
    const diff = capabilityDiff([a, b], [a, b]);
    expect(diff.gained).toHaveLength(0);
    expect(diff.lost).toHaveLength(0);
    expect(diff.retained).toHaveLength(2);
  });

  it("handles complete replacement", () => {
    const diff = capabilityDiff([a], [b, c]);
    expect(diff.gained.map((c) => c.id)).toEqual(["b", "c"]);
    expect(diff.lost.map((c) => c.id)).toEqual(["a"]);
    expect(diff.retained).toHaveLength(0);
  });

  it("handles empty inputs", () => {
    expect(capabilityDiff([], [a]).gained).toHaveLength(1);
    expect(capabilityDiff([a], []).lost).toHaveLength(1);
    expect(capabilityDiff([], []).gained).toHaveLength(0);
  });
});
