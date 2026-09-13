import { describe, expect, it } from "vitest";

import { graphNodeLabel, parseGraphInput } from "@/lib/graph-parser";

describe("parseGraphInput", () => {
  it("parses a directed zero-indexed graph", () => {
    const graph = parseGraphInput({
      directed: true,
      edgeList: "0 -> 2\n2 1\n1,3",
      indexMode: "zero",
      nodeCount: 4,
    });

    expect(graph.isValid).toBe(true);
    expect(graph.nodes.map((node) => node.label)).toEqual(["0", "1", "2", "3"]);
    expect(graph.edges).toMatchObject([
      { source: "n0", target: "n2" },
      { source: "n2", target: "n1" },
      { source: "n1", target: "n3" },
    ]);
  });

  it("validates one-indexed references and reports their source line", () => {
    const graph = parseGraphInput({
      directed: false,
      edgeList: "1 3\n3 4",
      indexMode: "one",
      nodeCount: 3,
    });

    expect(graph.isValid).toBe(false);
    expect(graph.errors).toContainEqual({
      code: "invalid-node-reference",
      line: 2,
      value: "4",
    });
  });

  it("supports custom labels, quoted edge labels, arrows, and comments", () => {
    const graph = parseGraphInput({
      customLabels: "Start node\nMiddle\nEnd node",
      directed: true,
      edgeList: '"Start node" -> Middle # first\nMiddle --> "End node" // second',
      indexMode: "custom",
      nodeCount: 3,
    });

    expect(graph.isValid).toBe(true);
    expect(graph.nodes.map((node) => node.label)).toEqual([
      "Start node",
      "Middle",
      "End node",
    ]);
    expect(graph.edges).toHaveLength(2);
  });

  it("deduplicates reversed undirected edges but preserves directed pairs", () => {
    const undirected = parseGraphInput({
      directed: false,
      edgeList: "0 1\n1 0",
      indexMode: "zero",
      nodeCount: 2,
    });
    const directed = parseGraphInput({
      directed: true,
      edgeList: "0 1\n1 0",
      indexMode: "zero",
      nodeCount: 2,
    });

    expect(undirected.edges).toHaveLength(1);
    expect(undirected.warnings).toContainEqual({
      code: "duplicate-edge",
      line: 2,
      value: "1 0",
    });
    expect(directed.edges).toHaveLength(2);
  });

  it("allows self-loops with a warning", () => {
    const graph = parseGraphInput({
      directed: true,
      edgeList: "0 0",
      indexMode: "zero",
      nodeCount: 1,
    });

    expect(graph.isValid).toBe(true);
    expect(graph.edges).toHaveLength(1);
    expect(graph.warnings[0]).toMatchObject({ code: "self-loop", line: 1 });
  });

  it("rejects malformed counts, label count mismatches, and duplicate labels", () => {
    expect(
      parseGraphInput({
        directed: false,
        edgeList: "",
        indexMode: "zero",
        nodeCount: 0,
      }).errors
    ).toContainEqual({ code: "invalid-node-count", value: "0" });

    const custom = parseGraphInput({
      customLabels: "A\nA",
      directed: false,
      edgeList: "",
      indexMode: "custom",
      nodeCount: 3,
    });

    expect(custom.errors.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["custom-label-count-mismatch", "duplicate-label"])
    );
  });

  it("creates spreadsheet-like custom labels", () => {
    expect([0, 25, 26, 27, 51, 52].map(graphNodeLabel)).toEqual([
      "A",
      "Z",
      "AA",
      "AB",
      "AZ",
      "BA",
    ]);
  });
});
