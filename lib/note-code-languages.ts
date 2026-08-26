export type NoteCodeLanguage = Readonly<{
  aliases?: readonly string[];
  id: string;
  label: string;
}>;

export const DEFAULT_NOTE_CODE_LANGUAGE = "plaintext";

/**
 * Canonical Markdown fence identifiers used by the notes editor. Aliases are
 * accepted when opening older/imported notes, while new selections are saved
 * with the canonical id.
 */
export const noteCodeLanguages: readonly NoteCodeLanguage[] = [
  { id: "plaintext", label: "Plain text", aliases: ["text", "txt"] },
  { id: "abap", label: "ABAP" },
  { id: "ada", label: "Ada" },
  { id: "arduino", label: "Arduino", aliases: ["ino"] },
  { id: "ascii-art", label: "ASCII Art" },
  { id: "asm", label: "Assembly", aliases: ["assembly"] },
  { id: "bash", label: "Bash", aliases: ["sh", "shell"] },
  { id: "basic", label: "BASIC" },
  { id: "c", label: "C" },
  { id: "csharp", label: "C#", aliases: ["cs", "c#"] },
  { id: "cpp", label: "C++", aliases: ["c++"] },
  { id: "clojure", label: "Clojure" },
  { id: "coffeescript", label: "CoffeeScript", aliases: ["coffee"] },
  { id: "css", label: "CSS" },
  { id: "dart", label: "Dart" },
  { id: "diff", label: "Diff" },
  { id: "dockerfile", label: "Dockerfile", aliases: ["docker"] },
  { id: "elixir", label: "Elixir" },
  { id: "erlang", label: "Erlang" },
  { id: "fortran", label: "Fortran" },
  { id: "fsharp", label: "F#", aliases: ["fs", "f#"] },
  { id: "go", label: "Go", aliases: ["golang"] },
  { id: "graphql", label: "GraphQL" },
  { id: "haskell", label: "Haskell", aliases: ["hs"] },
  { id: "html", label: "HTML" },
  { id: "java", label: "Java" },
  { id: "javascript", label: "JavaScript", aliases: ["js", "jsx"] },
  { id: "json", label: "JSON" },
  { id: "julia", label: "Julia" },
  { id: "kotlin", label: "Kotlin", aliases: ["kt"] },
  { id: "latex", label: "LaTeX", aliases: ["tex"] },
  { id: "lua", label: "Lua" },
  { id: "markdown", label: "Markdown", aliases: ["md"] },
  { id: "matlab", label: "MATLAB" },
  { id: "miniscript", label: "MiniScript+", aliases: ["msp"] },
  { id: "objectivec", label: "Objective-C", aliases: ["objc"] },
  { id: "pascal", label: "Pascal" },
  { id: "perl", label: "Perl" },
  { id: "php", label: "PHP" },
  { id: "powershell", label: "PowerShell", aliases: ["ps1"] },
  { id: "python", label: "Python", aliases: ["py"] },
  { id: "r", label: "R" },
  { id: "ruby", label: "Ruby", aliases: ["rb"] },
  { id: "rust", label: "Rust", aliases: ["rs"] },
  { id: "sass", label: "Sass", aliases: ["scss"] },
  { id: "scala", label: "Scala" },
  { id: "scheme", label: "Scheme" },
  { id: "sql", label: "SQL" },
  { id: "swift", label: "Swift" },
  { id: "typescript", label: "TypeScript", aliases: ["ts", "tsx"] },
  { id: "vbnet", label: "Visual Basic .NET", aliases: ["vb"] },
  { id: "wasm", label: "WebAssembly", aliases: ["wat"] },
  { id: "xml", label: "XML" },
  { id: "yaml", label: "YAML", aliases: ["yml"] },
];

export function findNoteCodeLanguage(language: unknown): NoteCodeLanguage | null {
  const normalized =
    typeof language === "string" ? language.trim().toLocaleLowerCase() : "";
  if (!normalized) {
    return noteCodeLanguages[0];
  }

  return (
    noteCodeLanguages.find(
      (option) =>
        option.id === normalized || option.aliases?.includes(normalized)
    ) ?? null
  );
}

export function getNoteCodeLanguageLabel(language: unknown): string {
  const match = findNoteCodeLanguage(language);
  if (match) return match.label;
  return typeof language === "string" && language.trim()
    ? language.trim()
    : noteCodeLanguages[0].label;
}
