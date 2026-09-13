"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { miniScriptDiagnostics, SYNTAX_GRAMMARS } from "@/lib/editor-diagnostics";
import Editor, {
  loader,
  type Monaco,
  type OnMount,
  useMonaco,
} from "@monaco-editor/react";
import { useTheme } from "next-themes";
import type {
  editor as MonacoEditorNamespace,
  languages as MonacoLanguagesNamespace,
  Position as MonacoPosition,
} from "monaco-editor";

import {
  getEditorLanguageDefinition,
  type EditorLanguageKey,
} from "@/lib/editor-project";

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
  monaco.typescript.javascriptDefaults.setDiagnosticsOptions({ noSyntaxValidation: false, noSemanticValidation: false });
  monaco.typescript.javascriptDefaults.setCompilerOptions({ ...monaco.typescript.javascriptDefaults.getCompilerOptions(), checkJs: true, allowJs: true, jsx: monaco.typescript.JsxEmit.ReactJSX });
  monaco.typescript.typescriptDefaults.setDiagnosticsOptions({ noSyntaxValidation: false, noSemanticValidation: false });
  monaco.typescript.typescriptDefaults.setCompilerOptions({ ...monaco.typescript.typescriptDefaults.getCompilerOptions(), jsx: monaco.typescript.JsxEmit.ReactJSX });

  if (!monaco.languages.getLanguages().some((language: { id: string }) => language.id === "miniscriptplus")) {
    monaco.languages.register({ id: "miniscriptplus" });
  }

  monaco.languages.setMonarchTokensProvider("miniscriptplus", {
    defaultToken: "",
    ignoreCase: true,
    tokenPostfix: ".msp",
    tokenizer: {
      root: [
        [/#.*/, "comment"],
        [/\bFUNCTION\b/, "keyword.function"],
        [/\b(IF|THEN|ELSE|END|WHILE|FOR|FROM|TO|INCR|RETURN)\b/, "keyword.control"],
        [/\b(PRINT|INPUT)\b/, "keyword"],
        [/\b(DIV|MOD|AND|OR|NOT)\b/, "keyword.operator"],
        [/\b(TRUE|FALSE|NULL)\b/, "constant.language"],
        [/\b[A-Za-z_][A-Za-z0-9_]*\b(?=\s*\()/, "type.identifier"],
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, "number"],
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],
        [/<=|>=|==|!=|<>|<|>|=|\+|-|\*|\/|%|\^/, "operator"],
        [/[()[\]{},.:]/, "delimiter"],
        [/[a-zA-Z_][a-zA-Z0-9_]*/, "identifier"],
      ],
      string: [
        [/[^\\"]+/, "string"],
        [/\\./, "string.escape"],
        [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
      ],
    },
  });

  monaco.languages.setLanguageConfiguration("miniscriptplus", {
    comments: { lineComment: "#" },
    wordPattern: /(-?\d*\.\d\w*)|([^`~!@#$%^&*()\-+=\[\]{}\\|;:'\",.<>/?\s]+)/g,
    brackets: [["(", ")"], ["[", "]"], ["{", "}"]],
    autoClosingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: "{", close: "}" },
      { open: '"', close: '"', notIn: ["string", "comment"] },
    ],
    surroundingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: "{", close: "}" },
      { open: '"', close: '"' },
    ],
    indentationRules: {
      increaseIndentPattern: /^\s*(?:IF\b.*\bTHEN|WHILE\b.*|FOR\b.*|FUNCTION\b.*)$/i,
      decreaseIndentPattern: /^\s*(?:ELSE|END)\b/i,
      indentNextLinePattern: /^\s*ELSE\b/i,
      unIndentedLinePattern: /^\s*#.*$/,
    },
  });

  const keywordDocs: Record<string, string> = {
    IF: "Starts a conditional block. Use `IF condition THEN`, optionally `ELSE`, and close it with `END`.",
    THEN: "Separates an `IF` condition from its block.",
    ELSE: "Runs an alternative block when the matching `IF` condition is false.",
    END: "Closes the nearest `IF`, `WHILE`, `FOR` or `FUNCTION` block.",
    FOR: "Inclusive loop: `FOR i FROM 1 TO 5 INCR 1`. INCR is optional and defaults to 1. Use a negative increment to count down.",
    FROM: "The initial value of the loop variable, evaluated once on entry.",
    TO: "The inclusive final bound, evaluated once on entry.",
    INCR: "The nonzero numeric increment, evaluated once on entry. Defaults to 1.",
    FUNCTION: "Declares a top-level function: `FUNCTION build(x,y)`. Call it with `build(1,2)`. Parameters and assignments are local to each call.",
    RETURN: "Immediately exits the current function, optionally returning an expression to its caller.",
    WHILE: "Repeats a block while its condition remains true. Close the block with `END`.",
    PRINT: "Writes a value to the program output.",
    INPUT: "Pauses execution and reads a value into a variable.",
    INT: "Truncates a numeric value toward zero.",
    TRUNC: "Truncates a numeric value toward zero.",
    FLOOR: "Rounds a numeric value down to the nearest integer.",
    ROUND: "Rounds a number, optionally to a specified number of decimals.",
    ABS: "Returns the absolute value of a number.",
    DIV: "Performs integer division.",
    MOD: "Returns the remainder of an integer division.",
    AND: "Logical AND operator.",
    OR: "Logical OR operator.",
    NOT: "Logical negation operator.",
  };

  monaco.languages.registerCompletionItemProvider("miniscriptplus", {
    triggerCharacters: [" ", "(", ",", "="],
    provideCompletionItems(model: MonacoEditorNamespace.ITextModel, position: MonacoPosition) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const snippet = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
      const snippetKind = monaco.languages.CompletionItemKind.Snippet;
      const keywordKind = monaco.languages.CompletionItemKind.Keyword;
      const functionKind = monaco.languages.CompletionItemKind.Function;

      const variableNames = new Set<string>();
      for (const match of model.getValue().matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) {
        variableNames.add(match[1]);
      }
      for (const match of model.getValue().matchAll(/^\s*INPUT\s+([A-Za-z_][A-Za-z0-9_]*)/gim)) {
        variableNames.add(match[1]);
      }
      for (const match of model.getValue().matchAll(/^\s*FOR\s+([A-Za-z_][A-Za-z0-9_]*)\s+FROM\b/gm)) variableNames.add(match[1]);
      const functions = [...model.getValue().matchAll(/^\s*FUNCTION\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^()]*)\)/gm)]
        .map(match => ({ name: match[1], params: match[2].split(",").map(param => param.trim()).filter(Boolean) }));
      for (const fn of functions) fn.params.forEach(param => variableNames.add(param));

      return {
        suggestions: [
          { label: "FOR", detail: "Inclusive counting loop", kind: snippetKind, insertText: "FOR ${1:i} FROM ${2:1} TO ${3:5} INCR ${4:1}\n  ${0}\nEND", insertTextRules: snippet, range },
          { label: "FUNCTION", detail: "Function with local parameters", kind: snippetKind, insertText: "FUNCTION ${1:build}(${2:x,y})\n  ${0:RETURN x + y}\nEND", insertTextRules: snippet, range },
          { label: "RETURN", detail: "Exit the current function", kind: keywordKind, insertText: "RETURN ${0:expression}", insertTextRules: snippet, range },
          ...functions.map(fn => ({ label: fn.name, detail: `${fn.name}(${fn.params.join(", ")})`, kind: functionKind,
            insertText: `${fn.name}(${fn.params.map((param, index) => `\${${index + 1}:${param}}`).join(", ")})`, insertTextRules: snippet, range })),
          { label: "IF … THEN", filterText: "IF", sortText: "00-if", detail: "MiniScript+ conditional block", documentation: "Creates an IF block and places the cursor in its body.", kind: snippetKind, insertText: "IF ${1:condition} THEN\n  ${0}\nEND", insertTextRules: snippet, range },
          { label: "IF … ELSE", filterText: "IF", sortText: "01-if-else", detail: "Conditional block with alternative", kind: snippetKind, insertText: "IF ${1:condition} THEN\n  ${2}\nELSE\n  ${0}\nEND", insertTextRules: snippet, range },
          { label: "WHILE", sortText: "02-while", detail: "MiniScript+ while loop", kind: snippetKind, insertText: "WHILE ${1:condition}\n  ${0}\nEND", insertTextRules: snippet, range },
          { label: "INPUT", sortText: "03-input", detail: "Read a value into a variable", kind: keywordKind, insertText: "INPUT ${1:variable}", insertTextRules: snippet, range },
          { label: "PRINT", sortText: "04-print", detail: "Write an expression to output", kind: keywordKind, insertText: "PRINT ${1:expression}", insertTextRules: snippet, range },
          { label: "assignment", filterText: "LET SET ASSIGN", sortText: "05-assignment", detail: "Assign an expression to a variable", kind: snippetKind, insertText: "${1:variable} = ${0:expression}", insertTextRules: snippet, range },
          ...["ELSE", "END", "FROM", "TO", "INCR", "TRUE", "FALSE", "DIV", "MOD", "AND", "OR", "NOT"].map((label, index) => ({
            label,
            sortText: `1${index}-${label}`,
            detail: "MiniScript+ keyword",
            kind: keywordKind,
            insertText: label,
            range,
          })),
          ...[
            { label: "INT", insertText: "INT(${1:value})", detail: "INT(value)" },
            { label: "TRUNC", insertText: "TRUNC(${1:value})", detail: "TRUNC(value)" },
            { label: "FLOOR", insertText: "FLOOR(${1:value})", detail: "FLOOR(value)" },
            { label: "ROUND", insertText: "ROUND(${1:value}${2:, decimals})", detail: "ROUND(value[, decimals])" },
            { label: "ABS", insertText: "ABS(${1:value})", detail: "ABS(value)" },
          ].map((item, index) => ({
            ...item,
            sortText: `2${index}-${item.label}`,
            kind: functionKind,
            insertTextRules: snippet,
            range,
          })),
          ...[...variableNames].sort().map((label, index) => ({
            label,
            sortText: `3${index}-${label}`,
            detail: "Variable in this file",
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: label,
            range,
          })),
        ],
      };
    },
  });

  monaco.languages.registerSignatureHelpProvider("miniscriptplus", {
    signatureHelpTriggerCharacters: ["(", ","],
    provideSignatureHelp(
      model: MonacoEditorNamespace.ITextModel,
      position: MonacoPosition
    ) {
      const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
      const call = line.match(/([A-Za-z_][A-Za-z0-9_]*)\s*\([^()]*$/);
      if (!call) return null;

      const name = call[1].toUpperCase();
      const signatures: Record<string, { label: string; parameters: string[]; documentation: string }> = {
        INT: { label: "INT(value)", parameters: ["value"], documentation: "Truncate toward zero." },
        TRUNC: { label: "TRUNC(value)", parameters: ["value"], documentation: "Truncate toward zero." },
        FLOOR: { label: "FLOOR(value)", parameters: ["value"], documentation: "Round down." },
        ROUND: { label: "ROUND(value, decimals?)", parameters: ["value", "decimals?"], documentation: "Round a number." },
        ABS: { label: "ABS(value)", parameters: ["value"], documentation: "Return the absolute value." },
      };
      const definition = [...model.getValue().matchAll(/^\s*FUNCTION\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^()]*)\)/gm)].find(match => match[1] === call[1]);
      const signature = definition ? { label: `${definition[1]}(${definition[2]})`, parameters: definition[2].split(",").map(param => param.trim()).filter(Boolean), documentation: "User-defined MiniScript+ function. RETURN exits immediately." } : signatures[name];
      if (!signature) return null;

      const argumentText = line.slice(line.lastIndexOf("(") + 1);
      const activeParameter = Math.min(
        Math.max(0, argumentText.split(",").length - 1),
        Math.max(0, signature.parameters.length - 1)
      );

      return {
        value: {
          activeParameter,
          activeSignature: 0,
          signatures: [{
            label: signature.label,
            documentation: signature.documentation,
            parameters: signature.parameters.map((label) => ({ label })),
          }],
        },
        dispose() {},
      };
    },
  });

  const registerSnippetProvider = (
    language: "python" | "cpp",
    entries: Array<{ label: string; detail: string; insertText: string }>
  ) => {
    monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: [" ", ".", "<", "("],
      provideCompletionItems(
        model: MonacoEditorNamespace.ITextModel,
        position: MonacoPosition
      ) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: entries.map((entry, index) => ({
            ...entry,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: `0${index}-${entry.label}`,
          })),
        };
      },
    });
  };

  registerSnippetProvider("python", [
    { label: "def", detail: "Python function", insertText: "def ${1:name}(${2:args}) -> ${3:None}:\n    ${0:pass}" },
    { label: "class", detail: "Python class", insertText: "class ${1:Name}:\n    def __init__(self${2:, args}) -> None:\n        ${0:pass}" },
    { label: "if __name__", detail: "Python entry point", insertText: "if __name__ == \"__main__\":\n    ${0:main()}" },
    { label: "for", detail: "Python for loop", insertText: "for ${1:item} in ${2:items}:\n    ${0:pass}" },
    { label: "while", detail: "Python while loop", insertText: "while ${1:condition}:\n    ${0:pass}" },
    { label: "try", detail: "Python try/except", insertText: "try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:error}:\n    ${0:raise}" },
    { label: "print", detail: "Python print", insertText: "print(${1:value})" },
    { label: "input", detail: "Python input", insertText: "input(${1:prompt})" },
  ]);

  registerSnippetProvider("cpp", [
    { label: "main", detail: "C++ entry point", insertText: "int main() {\n    ${0}\n    return 0;\n}" },
    { label: "include", detail: "C++ include", insertText: "#include <${1:iostream}>" },
    { label: "cout", detail: "Write to stdout", insertText: "std::cout << ${1:value} << '\\n';" },
    { label: "cin", detail: "Read from stdin", insertText: "std::cin >> ${1:value};" },
    { label: "vector", detail: "std::vector declaration", insertText: "std::vector<${1:int}> ${2:values};" },
    { label: "for", detail: "C++ for loop", insertText: "for (${1:int i = 0}; ${2:i < n}; ${3:++i}) {\n    ${0}\n}" },
    { label: "range for", detail: "C++ range-based for loop", insertText: "for (const auto& ${1:item} : ${2:items}) {\n    ${0}\n}" },
    { label: "class", detail: "C++ class", insertText: "class ${1:Name} {\npublic:\n    ${1:Name}() = default;\n\nprivate:\n    ${0}\n};" },
  ]);

  monaco.languages.registerDocumentFormattingEditProvider("miniscriptplus", {
    provideDocumentFormattingEdits(
      model: MonacoEditorNamespace.ITextModel,
      options: MonacoLanguagesNamespace.FormattingOptions
    ) {
      let depth = 0;
      const formatted = model.getLinesContent().map((line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        if (/^(ELSE|END)\b/i.test(trimmed)) depth = Math.max(0, depth - 1);
        const next = `${" ".repeat(depth * options.tabSize)}${trimmed}`;
        if (/^(IF\b.*\bTHEN|WHILE\b.*|FOR\b.*|FUNCTION\b.*|ELSE)\b/i.test(trimmed)) depth += 1;
        return next;
      }).join("\n");

      return [{
        range: model.getFullModelRange(),
        text: formatted,
      }];
    },
  });

  monaco.languages.registerHoverProvider("miniscriptplus", {
    provideHover(model: MonacoEditorNamespace.ITextModel, position: MonacoPosition) {
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      const documentation = keywordDocs[word.word.toUpperCase()];
      if (!documentation) return null;

      return {
        range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
        contents: [
          { value: `**${word.word.toUpperCase()}** · MiniScript+` },
          { value: documentation },
        ],
      };
    },
  });

  monaco.editor.defineTheme(LIGHT_EDITOR_THEME, {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6A9955", fontStyle: "italic" },
      { token: "keyword", foreground: "6D28D9", fontStyle: "bold" },
      { token: "keyword.control", foreground: "6D28D9", fontStyle: "bold" },
      { token: "keyword.function", foreground: "0E7490", fontStyle: "bold" },
      { token: "keyword.operator", foreground: "9F1239" },
      { token: "type.identifier", foreground: "0369A1" },
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
      "editorBracketMatch.background": "#F4F4F5",
      "editorBracketMatch.border": "#A1A1AA",
      "editorSuggestWidget.selectedBackground": "#E4E4E7",
    },
  });

  monaco.editor.defineTheme(DARK_EDITOR_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "86B778", fontStyle: "italic" },
      { token: "keyword", foreground: "C4B5FD", fontStyle: "bold" },
      { token: "keyword.control", foreground: "C4B5FD", fontStyle: "bold" },
      { token: "keyword.function", foreground: "67E8F9", fontStyle: "bold" },
      { token: "keyword.operator", foreground: "FDA4AF" },
      { token: "type.identifier", foreground: "7DD3FC" },
      { token: "number", foreground: "99F6E4" },
      { token: "string", foreground: "FDBA74" },
      { token: "operator", foreground: "E4E4E7" },
      { token: "constant", foreground: "93C5FD" },
      { token: "identifier", foreground: "F4F4F5" },
    ],
    colors: {
      "editor.background": "#111111",
      "editor.foreground": "#F4F4F5",
      "editorGutter.background": "#111111",
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
      "editorBracketMatch.background": "#3F3F4666",
      "editorBracketMatch.border": "#71717A",
      "editorSuggestWidget.selectedBackground": "#3F3F46",
    },
  });

  configuredMonacoInstances.add(monaco);
}

type MiniScriptMonacoEditorProps = {
  liveErrors?: boolean;
  height?: string;
  language?: EditorLanguageKey;
  onChange: (value: string) => void;
  onMount?: OnMount;
  options?: React.ComponentProps<typeof Editor>["options"];
  path?: string;
  modelScope?: string;
  retainModels?: boolean;
  readOnly?: boolean;
  theme?: "light" | "dark";
  value: string;
};

export function MiniScriptMonacoEditor({
  liveErrors = true,
  height = "100%",
  language = "msp",
  onChange,
  onMount,
  options,
  path,
  modelScope,
  retainModels = false,
  readOnly = false,
  theme: themeOverride,
  value,
}: MiniScriptMonacoEditorProps) {
  const instanceId = useId();
  const modelPath = `file:///scripticx/${encodeURIComponent(modelScope ?? instanceId)}/${path ?? `untitled.${language}`}`;
  const valueRef = useRef(value);
  valueRef.current = value;
  const synchronizingRef = useRef(false);
  const ownedModelsRef = useRef(new Set<MonacoEditorNamespace.ITextModel>());
  const modelListenerRef = useRef<{ dispose(): void } | null>(null);
  const monaco = useMonaco();
  const [mountedEditor, setMountedEditor] = useState<MonacoEditorNamespace.IStandaloneCodeEditor | null>(null);
  const { resolvedTheme } = useTheme();
  const inheritedTheme = resolvedTheme === "dark"
    || (resolvedTheme == null
      && typeof document !== "undefined"
      && document.documentElement.classList.contains("dark"))
    ? "dark"
    : "light";
  const editorTheme = themeOverride || inheritedTheme;
  const monacoTheme = editorTheme === "dark" ? DARK_EDITOR_THEME : LIGHT_EDITOR_THEME;
  const monacoLanguage = getEditorLanguageDefinition(language).monaco;

  useEffect(() => {
    if (!monaco) return;
    configureMiniScriptMonaco(monaco);
    monaco.editor.setTheme(monacoTheme);
  }, [monaco, monacoTheme]);

  const handleMount = useCallback<OnMount>((editor, mountedMonaco) => {
    const model = editor.getModel();
    if (model) {
      ownedModelsRef.current.add(model);
      if (model.getValue() !== valueRef.current) model.setValue(valueRef.current);
    }
    modelListenerRef.current = editor.onDidChangeModel(() => {
      const nextModel = editor.getModel();
      if (nextModel) ownedModelsRef.current.add(nextModel);
    });
    setMountedEditor(editor);
    // Apply the active theme synchronously on mount as well. This covers slow
    // Monaco loads and editors rendered inside dialogs or deferred tabs.
    mountedMonaco.editor.setTheme(monacoTheme);
    onMount?.(editor, mountedMonaco);
  }, [monacoTheme, onMount]);

  useEffect(() => {
    const models = ownedModelsRef.current;
    return () => {
      modelListenerRef.current?.dispose();
      if (!retainModels) {
        for (const model of models) if (!model.isDisposed()) model.dispose();
      }
      models.clear();
    };
  }, [retainModels]);

  useEffect(() => {
    const model = mountedEditor?.getModel();
    if (!model || model.isDisposed() || model.getValue() === value) return;
    // A cached model can change while the controlled value stays the same.
    synchronizingRef.current = true;
    try {
      model.setValue(value);
    } finally {
      synchronizingRef.current = false;
    }
  }, [mountedEditor, modelPath, value]);

  useEffect(() => {
    if (!monaco || !mountedEditor) return;
    let worker: Worker | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let revision = 0;
    const owner = "scripticx-live";
    const clear = () => {
      const model = mountedEditor.getModel();
      if (model && !model.isDisposed()) monaco.editor.setModelMarkers(model, owner, []);
    };
    const validate = () => {
      clearTimeout(timer);
      const id = ++revision;
      clear();
      if (!liveErrors || readOnly) return;
      timer = setTimeout(() => {
        const model = mountedEditor.getModel();
        if (!model || model.isDisposed() || model.getValueLength() > 200_000) return;
        const apply = (errors: Omit<MonacoEditorNamespace.IMarkerData, "severity">[]) => {
          if (revision !== id || model.isDisposed() || mountedEditor.getModel() !== model) return;
          monaco.editor.setModelMarkers(model, owner, errors.map((error) => ({
            ...error, severity: monaco.MarkerSeverity.Error, source: "ScripticX",
            endColumn: error.endLineNumber === error.startLineNumber ? Math.max(error.startColumn + 1, error.endColumn) : error.endColumn,
          })));
        };
        if (language === "msp") apply(miniScriptDiagnostics(model.getValue()));
        else if (SYNTAX_GRAMMARS[language]) {
          worker ??= new Worker("/syntax-worker.js");
          worker.onmessage = ({ data }) => { if (data.id === id) apply(data.errors); };
          worker.postMessage({ id, language: SYNTAX_GRAMMARS[language], code: model.getValue() });
        }
      }, 400);
    };
    const changes = mountedEditor.onDidChangeModelContent(validate);
    const models = mountedEditor.onDidChangeModel(validate);
    validate();
    return () => { ++revision; clearTimeout(timer); worker?.terminate(); changes.dispose(); models.dispose(); clear(); };
  }, [monaco, mountedEditor, language, liveErrors, readOnly]);

  return (
    <Editor
      beforeMount={configureMiniScriptMonaco}
      onMount={handleMount}
      height={height}
      language={monacoLanguage}
      path={modelPath}
      keepCurrentModel
      theme={monacoTheme}
      value={value}
      onChange={(nextValue) => {
        if (!synchronizingRef.current) onChange(nextValue || "");
      }}
      loading={
        <div className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground">
          Loading editor…
        </div>
      }
      options={{
        fontSize: 14,
        fontFamily: "JetBrains Mono, SFMono-Regular, Consolas, Liberation Mono, monospace",
        fontLigatures: false,
        lineHeight: 22,
        renderLineHighlight: "line",
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        suggest: { preview: true, showSnippets: true },
        quickSuggestions: { other: true, comments: false, strings: false },
        quickSuggestionsDelay: 60,
        suggestOnTriggerCharacters: true,
        snippetSuggestions: "top",
        parameterHints: { enabled: true, cycle: true },
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        readOnly,
        ...options,
        renderValidationDecorations: liveErrors && !readOnly ? "on" : "off",
      }}
    />
  );
}
