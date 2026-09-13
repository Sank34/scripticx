export function progressKey(userId?: string) { return `sx-playground:mission-v2:${userId || 'guest'}`; }
export function readPlayProgress(userId?: string): boolean {
  try { return localStorage.getItem(progressKey(userId)) === 'complete'; } catch { return false; }
}
export function savePlayProgress(userId?: string) {
  try { localStorage.setItem(progressKey(userId), 'complete'); } catch { /* Storage may be unavailable. */ }
}
