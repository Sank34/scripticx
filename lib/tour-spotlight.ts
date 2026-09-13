export type TourBounds = { left: number; top: number; right: number; bottom: number };

export function clipTourSpotlight(target: TourBounds, visible: TourBounds, padding = 8) {
  const left = Math.max(visible.left, target.left - padding);
  const top = Math.max(visible.top, target.top - padding);
  const right = Math.min(visible.right, target.right + padding);
  const bottom = Math.min(visible.bottom, target.bottom + padding);
  if (right <= left || bottom <= top) return null;
  return { left, top, width: right - left, height: bottom - top };
}

export function getTourVisibleBounds(element: Element): TourBounds {
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const bounds = {
    left: left + 8,
    top: top + 8,
    right: left + (viewport?.width ?? window.innerWidth) - 8,
    bottom: top + (viewport?.height ?? window.innerHeight) - 8,
  };

  // A page can extend beyond its scroll container even inside the viewport.
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const rect = parent.getBoundingClientRect();
    if (/auto|scroll|hidden|clip/.test(style.overflowX)) {
      bounds.left = Math.max(bounds.left, rect.left + parent.clientLeft + 2);
      bounds.right = Math.min(bounds.right, rect.left + parent.clientLeft + parent.clientWidth - 2);
    }
    if (/auto|scroll|hidden|clip/.test(style.overflowY)) {
      bounds.top = Math.max(bounds.top, rect.top + parent.clientTop + 2);
      bounds.bottom = Math.min(bounds.bottom, rect.top + parent.clientTop + parent.clientHeight - 2);
    }
  }
  return bounds;
}
