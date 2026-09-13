export const shortcutDefinitions = {
  search: { default: "Mod+k", ro: "Caută pe platformă", en: "Search the platform", scope: "global" },
  sidebar: { default: "Mod+b", ro: "Deschide / închide sidebar-ul", en: "Toggle sidebar", scope: "global" },
  submit: { default: "Mod+Enter", ro: "Trimite soluția", en: "Submit solution", scope: "editor" },
  run: { default: "Mod+Shift+Enter", ro: "Rulează codul", en: "Run code", scope: "editor" },
  problems: { default: "Mod+p", ro: "Probleme", en: "Problems", scope: "menu" },
  leaderboard: { default: "Mod+l", ro: "Clasament", en: "Leaderboard", scope: "menu" },
  docs: { default: "Mod+d", ro: "Documentație", en: "Documentation", scope: "menu" },
  dashboard: { default: "Mod+h", ro: "Panou principal", en: "Dashboard", scope: "menu" },
  editor: { default: "Mod+e", ro: "Editor", en: "Editor", scope: "menu" },
  live: { default: "Mod+v", ro: "Editor live", en: "Live editor", scope: "menu" },
  profile: { default: "Mod+u", ro: "Profil", en: "Profile", scope: "menu" },
  settings: { default: "Mod+s", ro: "Setări", en: "Settings", scope: "menu" },
  admin: { default: "Mod+a", ro: "Administrare", en: "Administration", scope: "menu" },
} as const;

export type ShortcutId = keyof typeof shortcutDefinitions;
export type ShortcutBindings = Record<ShortcutId, string | null>;
export const shortcutIds = Object.keys(shortcutDefinitions) as ShortcutId[];
export const defaultShortcuts = Object.fromEntries(shortcutIds.map(id => [id, shortcutDefinitions[id].default])) as ShortcutBindings;

type KeyEvent = Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey" | "repeat" | "isComposing">;

export function isValidBinding(binding: unknown): binding is string {
  return typeof binding === "string" && /^(?:(?:Mod\+)(?:Alt\+)?(?:Shift\+)?|Alt\+(?:Shift\+)?)(?:[a-z0-9]|Enter|Space|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|F(?:[1-9]|1[0-2]))$/.test(binding);
}

export function bindingFromEvent(event: KeyEvent): string | null {
  if (typeof event.key !== "string" || typeof event.code !== "string") return null;
  if (event.repeat || event.isComposing || (event.ctrlKey && event.metaKey)) return null;
  const key = /^Key[A-Z]$/.test(event.code) ? event.code.slice(3).toLowerCase()
    : /^Digit[0-9]$/.test(event.code) ? event.code.slice(5)
    : event.key === " " ? "Space" : event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const binding = `${event.ctrlKey || event.metaKey ? "Mod+" : ""}${event.altKey ? "Alt+" : ""}${event.shiftKey ? "Shift+" : ""}${key}`;
  return isValidBinding(binding) ? binding : null;
}

export function matchesShortcut(event: KeyEvent, binding: string | null): boolean {
  return binding !== null && bindingFromEvent(event) === binding;
}

export function normalizeShortcuts(value: unknown): ShortcutBindings {
  const result = { ...defaultShortcuts };
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  const raw = value as Record<string, unknown>;
  for (const id of shortcutIds) {
    if (raw[id] === null || isValidBinding(raw[id])) result[id] = raw[id] as string | null;
  }
  const used = new Set<string>();
  for (const id of shortcutIds) {
    const binding = result[id];
    if (binding && used.has(binding)) result[id] = null;
    else if (binding) used.add(binding);
  }
  return result;
}

export function shortcutConflict(bindings: ShortcutBindings, id: ShortcutId, binding: string | null): ShortcutId | undefined {
  return binding ? shortcutIds.find(other => other !== id && bindings[other] === binding) : undefined;
}

export function formatShortcut(binding: string | null): string {
  return binding?.split("+").map(key => key === "Mod" ? "Ctrl/⌘" : key.length === 1 ? key.toUpperCase() : key).join(" + ") ?? "";
}

export function shortcutStorageKey(userId?: string): string {
  return `scripticx.shortcuts.v1:${userId || "guest"}`;
}
