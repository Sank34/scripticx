import { describe, expect, it } from "vitest";
import { bindingFromEvent, defaultShortcuts, formatShortcut, matchesShortcut, normalizeShortcuts, shortcutConflict, shortcutStorageKey } from "./keyboard-shortcuts";

const event = (overrides: Partial<KeyboardEvent> = {}) => ({
  key: "Enter", code: "Enter", ctrlKey: true, metaKey: false,
  altKey: false, shiftKey: false, repeat: false, isComposing: false,
  ...overrides,
});

describe("custom platform shortcuts", () => {
  it("matches the primary modifier on Windows and macOS, but requires exact modifiers", () => {
    expect(matchesShortcut(event(), "Mod+Enter")).toBe(true);
    expect(matchesShortcut(event({ ctrlKey: false, metaKey: true }), "Mod+Enter")).toBe(true);
    expect(matchesShortcut(event({ shiftKey: true }), "Mod+Enter")).toBe(false);
    expect(matchesShortcut(event({ altKey: true }), "Mod+Enter")).toBe(false);
    expect(matchesShortcut(event({ metaKey: true }), "Mod+Enter")).toBe(false);
  });

  it("ignores auto-repeat, IME composition, disabled bindings and plain typing", () => {
    expect(matchesShortcut(event({ repeat: true }), "Mod+Enter")).toBe(false);
    expect(matchesShortcut(event({ isComposing: true }), "Mod+Enter")).toBe(false);
    expect(matchesShortcut(event(), null)).toBe(false);
    expect(bindingFromEvent(event({ ctrlKey: false }))).toBeNull();
    expect(bindingFromEvent(event({ key: "Control", code: "ControlLeft" }))).toBeNull();
  });

  it("records physical letters even when Alt changes the produced character", () => {
    expect(bindingFromEvent(event({ key: "€", code: "KeyE", altKey: true, ctrlKey: false }))).toBe("Alt+e");
    expect(formatShortcut("Mod+Shift+Enter")).toBe("Ctrl/⌘ + Shift + Enter");
  });

  it("preserves disabling and valid custom bindings, and recovers malformed storage", () => {
    expect(normalizeShortcuts(null)).toEqual(defaultShortcuts);
    expect(normalizeShortcuts([])).toEqual(defaultShortcuts);
    const normalized = normalizeShortcuts({ submit: "Alt+Shift+s", sidebar: null, search: 123, run: "Enter" });
    expect(normalized.submit).toBe("Alt+Shift+s");
    expect(normalized.sidebar).toBeNull();
    expect(normalized.search).toBe(defaultShortcuts.search);
    expect(normalized.run).toBe(defaultShortcuts.run);
  });

  it("detects conflicts and never activates two actions for a corrupted duplicate", () => {
    expect(shortcutConflict(defaultShortcuts, "submit", "Mod+k")).toBe("search");
    expect(shortcutConflict(defaultShortcuts, "submit", "Mod+Enter")).toBeUndefined();
    expect(shortcutConflict(defaultShortcuts, "submit", null)).toBeUndefined();
    const normalized = normalizeShortcuts({ submit: "Mod+k" });
    expect(normalized.search).toBe("Mod+k");
    expect(normalized.submit).toBeNull();
  });

  it("keeps preferences isolated between accounts and guests", () => {
    expect(shortcutStorageKey("one")).not.toBe(shortcutStorageKey("two"));
    expect(shortcutStorageKey()).not.toBe(shortcutStorageKey("one"));
  });
});
