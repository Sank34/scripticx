export type EditorPreferences = {
  autoCompletion: boolean;
  bracketPairColorization: boolean;
  fontLigatures: boolean;
  fontSize: number;
  formatOnPaste: boolean;
  formatOnType: boolean;
  inlineSuggestions: boolean;
  minimap: boolean;
  parameterHints: boolean;
  quickSuggestions: boolean;
  stickyScroll: boolean;
  tabSize: 2 | 4 | 8;
  wordWrap: boolean;
};

export const EDITOR_PREFERENCES_STORAGE_KEY = "scripticx.editor.preferences.v1";

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  autoCompletion: true,
  bracketPairColorization: true,
  fontLigatures: false,
  fontSize: 14,
  formatOnPaste: true,
  formatOnType: true,
  inlineSuggestions: true,
  minimap: true,
  parameterHints: true,
  quickSuggestions: true,
  stickyScroll: true,
  tabSize: 2,
  wordWrap: false,
};

export function normalizeEditorPreferences(value: unknown): EditorPreferences {
  if (!value || typeof value !== "object") return DEFAULT_EDITOR_PREFERENCES;

  const candidate = value as Partial<Record<keyof EditorPreferences, unknown>>;
  const booleanValue = (
    key: keyof EditorPreferences,
    fallback: boolean
  ) => typeof candidate[key] === "boolean" ? candidate[key] : fallback;
  const rawFontSize = Number(candidate.fontSize);
  const rawTabSize = Number(candidate.tabSize);

  return {
    autoCompletion: booleanValue("autoCompletion", true),
    bracketPairColorization: booleanValue("bracketPairColorization", true),
    fontLigatures: booleanValue("fontLigatures", false),
    fontSize: Number.isFinite(rawFontSize)
      ? Math.min(22, Math.max(12, Math.round(rawFontSize)))
      : DEFAULT_EDITOR_PREFERENCES.fontSize,
    formatOnPaste: booleanValue("formatOnPaste", true),
    formatOnType: booleanValue("formatOnType", true),
    inlineSuggestions: booleanValue("inlineSuggestions", true),
    minimap: booleanValue("minimap", true),
    parameterHints: booleanValue("parameterHints", true),
    quickSuggestions: booleanValue("quickSuggestions", true),
    stickyScroll: booleanValue("stickyScroll", true),
    tabSize: rawTabSize === 4 || rawTabSize === 8 ? rawTabSize : 2,
    wordWrap: booleanValue("wordWrap", false),
  };
}
