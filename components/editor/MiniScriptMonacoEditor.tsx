"use client";

import { useEffect } from "react";
import Editor, { type OnMount, useMonaco } from "@monaco-editor/react";

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
  theme = "light",
  value,
}: MiniScriptMonacoEditorProps) {
  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco) return;

    if (!monaco.languages.getLanguages().some((language) => language.id === "miniscriptplus")) {
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

    monaco.editor.defineTheme("miniscriptplusTheme", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "7c3aed", fontStyle: "bold" },
        { token: "number", foreground: "0f766e" },
        { token: "string", foreground: "b45309" },
        { token: "operator", foreground: "27272a" },
        { token: "constant", foreground: "2563eb" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editorLineNumber.foreground": "#a1a1aa",
        "editorCursor.foreground": "#18181b",
        "editor.selectionBackground": "#dcfce7",
      },
    });

    monaco.editor.defineTheme("miniscriptplusDarkTheme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "c586c0" },
        { token: "number", foreground: "b5cea8" },
        { token: "string", foreground: "ce9178" },
        { token: "operator", foreground: "d4d4d4" },
        { token: "constant", foreground: "569cd6" },
      ],
      colors: {},
    });

  }, [monaco]);

  return (
    <Editor
      onMount={onMount}
      height={height}
      defaultLanguage="miniscriptplus"
      theme={theme === "dark" ? "miniscriptplusDarkTheme" : "miniscriptplusTheme"}
      value={value}
      onChange={(nextValue) => onChange(nextValue || "")}
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
