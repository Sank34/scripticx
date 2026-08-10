"use client";

import { useCallback, useEffect } from "react";
import Editor, {
  loader,
  type Monaco,
  type OnMount,
  useMonaco,
} from "@monaco-editor/react";
import { useTheme } from "next-themes";

// @monaco-editor/react defaults to jsDelivr. Keep the editor same-origin so
// Content Security Policy can remain strict and the IDE also works offline.
loader.config({ paths: { vs: "/monaco/vs" } });

const LIGHT_EDITOR_THEME = "miniscriptplus-light";
const DARK_EDITOR_THEME = "miniscriptplus-dark";
const configuredMonacoInstances = new WeakSet<object>();

/**
 * Monaco needs custom themes to exist before it creates an editor. Registering
 * them from `beforeMount` prevents the initial `vs` theme from getting stuck
 * when Monaco finishes loading after the app has already switched to dark mode.
 */
function configureMiniScriptMonaco(monaco: Monaco) {
  if (configuredMonacoInstances.has(monaco)) return;

  if (!monaco.languages.getLanguages().some((language: { id: string }) => language.id === "miniscriptplus")) {
    monaco.languages.register({ id: "miniscriptplus" });
  }

  monaco.languages.setMonarchTokensProvider("miniscriptplus", {
    tokenizer: {
      root: [
        [/#.*/, "comment"],
        [/\b(IF|THEN|ELSE|END|WHILE|PRINT|INPUT|DIV|MOD|TRUE|FALSE|INT|TRUNC|FLOOR|ROUND|ABS|AND|OR|NOT)\b/, "keyword"],
        [/\b(true|false)\b/, "constant"],
        [/[0-9]+(?:\.[0-9]+)?/, "number"],
        [/".*?"/, "string"],
        [/<=|>=|==|!=|<|>|=|\+|-|\*|\/|%/, "operator"],
        [/[a-zA-Z_][a-zA-Z0-9_]*/, "identifier"],
      ],
    },
  });

  monaco.editor.defineTheme(LIGHT_EDITOR_THEME, {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6A9955", fontStyle: "italic" },
      { token: "keyword", foreground: "7C3AED", fontStyle: "bold" },
      { token: "number", foreground: "0F766E" },
      { token: "string", foreground: "B45309" },
      { token: "operator", foreground: "27272A" },
      { token: "constant", foreground: "2563EB" },
    ],
    colors: {
      "editor.background": "#FFFFFF",
      "editor.foreground": "#18181B",
      "editorLineNumber.foreground": "#A1A1AA",
      "editorLineNumber.activeForeground": "#52525B",
      "editorCursor.foreground": "#18181B",
      "editor.selectionBackground": "#DCFCE7",
      "editor.inactiveSelectionBackground": "#F0FDF4",
      "editor.lineHighlightBackground": "#FAFAFA",
      "editorIndentGuide.background1": "#E4E4E7",
      "editorIndentGuide.activeBackground1": "#A1A1AA",
    },
  });

  monaco.editor.defineTheme(DARK_EDITOR_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "86B778", fontStyle: "italic" },
      { token: "keyword", foreground: "D8B4FE", fontStyle: "bold" },
      { token: "number", foreground: "99F6E4" },
      { token: "string", foreground: "FDBA74" },
      { token: "operator", foreground: "E4E4E7" },
      { token: "constant", foreground: "93C5FD" },
      { token: "identifier", foreground: "F4F4F5" },
    ],
    colors: {
      "editor.background": "#171717",
      "editor.foreground": "#F4F4F5",
      "editorGutter.background": "#171717",
      "editorLineNumber.foreground": "#71717A",
      "editorLineNumber.activeForeground": "#D4D4D8",
      "editorCursor.foreground": "#FAFAFA",
      "editor.selectionBackground": "#14532D99",
      "editor.inactiveSelectionBackground": "#14532D66",
      "editor.lineHighlightBackground": "#26262680",
      "editorIndentGuide.background1": "#3F3F46",
      "editorIndentGuide.activeBackground1": "#71717A",
      "editorWidget.background": "#262626",
      "editorWidget.border": "#3F3F46",
      "input.background": "#171717",
      "input.border": "#52525B",
      "dropdown.background": "#262626",
      "dropdown.border": "#3F3F46",
      "list.hoverBackground": "#3F3F4680",
    },
  });

  configuredMonacoInstances.add(monaco);
}

type MiniScriptMonacoEditorProps = {
  height?: string;
  onChange: (value: string) => void;
  onMount?: OnMount;
  options?: React.ComponentProps<typeof Editor>["options"];
  readOnly?: boolean;
  theme?: "light" | "dark";
  value: string;
};

export function MiniScriptMonacoEditor({
  height = "100%",
  onChange,
  onMount,
  options,
  readOnly = false,
  theme: themeOverride,
  value,
}: MiniScriptMonacoEditorProps) {
  const monaco = useMonaco();
  const { resolvedTheme } = useTheme();
  const inheritedTheme = resolvedTheme === "dark"
    || (resolvedTheme == null
      && typeof document !== "undefined"
      && document.documentElement.classList.contains("dark"))
    ? "dark"
    : "light";
  const editorTheme = themeOverride || inheritedTheme;
  const monacoTheme = editorTheme === "dark" ? DARK_EDITOR_THEME : LIGHT_EDITOR_THEME;

  useEffect(() => {
    if (!monaco) return;
    configureMiniScriptMonaco(monaco);
    monaco.editor.setTheme(monacoTheme);
  }, [monaco, monacoTheme]);

  const handleMount = useCallback<OnMount>((editor, mountedMonaco) => {
    // Apply the active theme synchronously on mount as well. This covers slow
    // Monaco loads and editors rendered inside dialogs or deferred tabs.
    mountedMonaco.editor.setTheme(monacoTheme);
    onMount?.(editor, mountedMonaco);
  }, [monacoTheme, onMount]);

  return (
    <Editor
      beforeMount={configureMiniScriptMonaco}
      onMount={handleMount}
      height={height}
      defaultLanguage="miniscriptplus"
      theme={monacoTheme}
      value={value}
      onChange={(nextValue) => onChange(nextValue || "")}
      loading={
        <div className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground">
          Loading editor…
        </div>
      }
      options={{
        fontSize: 14,
        fontFamily: "JetBrains Mono, monospace",
        fontLigatures: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        readOnly,
        ...options,
      }}
    />
  );
}
