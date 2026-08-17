import { describe, expect, it } from "vitest";

import type { NoteOutlineItem } from "./note-outline";
import {
  compactNoteOverviewItems,
  NOTE_OVERVIEW_MAX_RAIL_ITEMS,
} from "./note-overview";

function outline(count: number): NoteOutlineItem[] {
  return Array.from({ length: count }, (_, index) => ({
    depth: (index % 3) + 1,
    id: `item-${index}`,
    kind: index % 4 === 0 ? "task" : "heading",
    line: index + 1,
    offset: index * 10,
    text: `Item ${index}`,
  }));
}

describe("compactNoteOverviewItems", () => {
  it("keeps short outlines unchanged without mutating the input", () => {
    const items = outline(4);
    const result = compactNoteOverviewItems(items, null);

    expect(result).toEqual(items);
    expect(result).not.toBe(items);
  });

  it("caps long outlines, preserves source order, and retains the active item", () => {
    const items = outline(40);
    const result = compactNoteOverviewItems(items, "item-23");
    const sourceIndexes = result.map((item) => items.indexOf(item));

    expect(result).toHaveLength(NOTE_OVERVIEW_MAX_RAIL_ITEMS);
    expect(result.map((item) => item.id)).toContain("item-23");
    expect(sourceIndexes).toEqual([...sourceIndexes].sort((left, right) => left - right));
  });

  it("retains both document edges when there is room", () => {
    const result = compactNoteOverviewItems(outline(30), "item-14", 5);

    expect(result[0].id).toBe("item-0");
    expect(result.at(-1)?.id).toBe("item-29");
    expect(result.map((item) => item.id)).toContain("item-14");
  });

  it("handles stale active ids and explicit small limits deterministically", () => {
    const items = outline(12);

    expect(compactNoteOverviewItems(items, "missing", 0)).toEqual([]);
    expect(compactNoteOverviewItems(items, null, Number.NaN)).toHaveLength(
      NOTE_OVERVIEW_MAX_RAIL_ITEMS
    );
    expect(compactNoteOverviewItems(items, "item-8", 1).map((item) => item.id)).toEqual([
      "item-8",
    ]);
    expect(compactNoteOverviewItems(items, "missing", 2).map((item) => item.id)).toEqual([
      "item-0",
      "item-11",
    ]);
  });
});
