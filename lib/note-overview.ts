import type { NoteOutlineItem } from "@/lib/note-outline";

export const NOTE_OVERVIEW_MAX_RAIL_ITEMS = 9;

/**
 * Selects a small, evenly distributed representation of a note outline.
 * The active entry and document edges are retained whenever the limit allows.
 */
export function compactNoteOverviewItems(
  items: readonly NoteOutlineItem[],
  activeId: string | null,
  maximum = NOTE_OVERVIEW_MAX_RAIL_ITEMS
): NoteOutlineItem[] {
  const normalizedMaximum = Number.isFinite(maximum)
    ? Math.max(0, Math.floor(maximum))
    : NOTE_OVERVIEW_MAX_RAIL_ITEMS;
  const limit = Math.min(items.length, normalizedMaximum);
  if (limit === 0) return [];
  if (items.length <= limit) return [...items];

  const activeIndex = activeId
    ? items.findIndex((item) => item.id === activeId)
    : -1;
  if (limit === 1) {
    return [items[activeIndex >= 0 ? activeIndex : 0]];
  }

  const selected = new Set<number>();
  if (activeIndex >= 0) {
    selected.add(activeIndex);
    const distanceToStart = activeIndex;
    const distanceToEnd = items.length - 1 - activeIndex;
    selected.add(distanceToEnd > distanceToStart ? items.length - 1 : 0);
    if (limit >= 3) selected.add(distanceToEnd > distanceToStart ? 0 : items.length - 1);
  } else {
    selected.add(0);
    selected.add(items.length - 1);
  }

  while (selected.size < limit) {
    let bestIndex = -1;
    let bestDistance = -1;
    for (let index = 0; index < items.length; index += 1) {
      if (selected.has(index)) continue;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const selectedIndex of selected) {
        nearestDistance = Math.min(nearestDistance, Math.abs(index - selectedIndex));
      }
      if (nearestDistance > bestDistance) {
        bestDistance = nearestDistance;
        bestIndex = index;
      }
    }
    if (bestIndex < 0) break;
    selected.add(bestIndex);
  }

  return [...selected]
    .sort((left, right) => left - right)
    .map((index) => items[index]);
}
