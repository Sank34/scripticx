import {
  getProjectBaseName,
  normalizeProjectPath,
  type EditorLanguageKey,
  type ProjectFile,
} from "@/lib/editor-project";

export const CODE_RUNNER_LANGUAGE_MAP = {
  python: "python",
  cpp: "c++",
  c: "c",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  csharp: "csharp.net",
  go: "go",
  rust: "rust",
  shell: "bash",
} as const satisfies Partial<Record<EditorLanguageKey, string>>;

export type CodeRunnerLanguage = keyof typeof CODE_RUNNER_LANGUAGE_MAP;

export type CodeRunnerFile = {
  content: string;
  name: string;
};

export type CodeRunnerStage = {
  code: number | null;
  cpuTime: number | null;
  memory: number | null;
  message: string | null;
  output: string;
  signal: string | null;
  status: string | null;
  stderr: string;
  stdout: string;
  wallTime: number | null;
};

export type CodeExecutionResult = {
  compile: CodeRunnerStage | null;
  durationMs: number;
  language: string;
  run: CodeRunnerStage;
  success: boolean;
  version: string;
};

const TERMINAL_LANGUAGE_ALIASES: Record<string, CodeRunnerLanguage> = {
  python: "python",
  python3: "python",
  py: "python",
  "c++": "cpp",
  cpp: "cpp",
  "g++": "cpp",
  "clang++": "cpp",
  c: "c",
  gcc: "c",
  clang: "c",
  node: "javascript",
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  "ts-node": "typescript",
  java: "java",
  csharp: "csharp",
  csc: "csharp",
  dotnet: "csharp",
  go: "go",
  rust: "rust",
  rustc: "rust",
  cargo: "rust",
  bash: "shell",
  sh: "shell",
};

export function isCodeRunnerLanguage(value: unknown): value is CodeRunnerLanguage {
  return typeof value === "string" && value in CODE_RUNNER_LANGUAGE_MAP;
}

export function getCodeRunnerEngine(language: EditorLanguageKey) {
  return CODE_RUNNER_LANGUAGE_MAP[language as CodeRunnerLanguage] ?? null;
}

export function isCloudRunnableLanguage(
  language: EditorLanguageKey
): language is CodeRunnerLanguage {
  return getCodeRunnerEngine(language) !== null;
}

export function buildCodeRunnerFiles(activeFile: ProjectFile, files: ProjectFile[]) {
  const uniqueNames = new Set<string>();
  const candidates = [
    activeFile,
    ...files.filter((file) => file.id !== activeFile.id),
  ];
  const result: CodeRunnerFile[] = [];

  for (const file of candidates) {
    const name = getProjectBaseName(file.path);
    const normalizedName = name.toLowerCase();
    if (!name || uniqueNames.has(normalizedName)) continue;
    uniqueNames.add(normalizedName);
    result.push({ name, content: file.content });
    if (result.length >= 32) break;
  }

  return result;
}

export function tokenizeTerminalCommand(source: string) {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (const character of source.trim()) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      else current += character;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (/\s/.test(character)) {
      if (current) tokens.push(current);
      current = "";
      continue;
    }
    current += character;
  }

  if (escaped) current += "\\";
  if (quote) return { error: "Unclosed quote", tokens: [] as string[] };
  if (current) tokens.push(current);
  return { error: null, tokens };
}

export type TerminalExecution = {
  args: string[];
  file: ProjectFile;
};

export function resolveTerminalExecution(
  source: string,
  activeFile: ProjectFile | undefined,
  files: ProjectFile[]
): { error: string | null; execution: TerminalExecution | null } {
  const parsed = tokenizeTerminalCommand(source);
  if (parsed.error) return { error: parsed.error, execution: null };
  const [rawCommand, ...rawArguments] = parsed.tokens;
  if (!rawCommand) return { error: "Command is empty", execution: null };

  const command = rawCommand.toLowerCase();
  let expectedLanguage: CodeRunnerLanguage | null = null;
  let argumentsList = rawArguments;
  let requestedPath = "";

  if (command === "run") {
    const separatorIndex = rawArguments.indexOf("--");
    if (separatorIndex >= 0) {
      requestedPath = rawArguments.slice(0, separatorIndex).join(" ");
      argumentsList = rawArguments.slice(separatorIndex + 1);
    } else if (rawArguments[0] && files.some((file) => file.path === normalizeProjectPath(rawArguments[0]))) {
      requestedPath = rawArguments[0];
      argumentsList = rawArguments.slice(1);
    } else {
      argumentsList = rawArguments;
    }
  } else {
    expectedLanguage = TERMINAL_LANGUAGE_ALIASES[command] ?? null;
    if (!expectedLanguage) {
      return { error: `Unsupported command: ${rawCommand}`, execution: null };
    }

    if ((command === "go" || command === "cargo" || command === "dotnet") && argumentsList[0] === "run") {
      argumentsList = argumentsList.slice(1);
    }
    if (argumentsList[0] && files.some((file) => file.path === normalizeProjectPath(argumentsList[0]))) {
      requestedPath = argumentsList[0];
      argumentsList = argumentsList.slice(1);
    }
  }

  const requestedFile = requestedPath
    ? files.find((file) => file.path === normalizeProjectPath(requestedPath))
    : activeFile;
  const fallbackFile = expectedLanguage
    ? files.find((file) => file.language === expectedLanguage)
    : undefined;
  const file = requestedFile && (!expectedLanguage || requestedFile.language === expectedLanguage)
    ? requestedFile
    : fallbackFile;

  if (!file) return { error: "No compatible project file was found", execution: null };
  if (!isCloudRunnableLanguage(file.language)) {
    return { error: `${file.name} does not have a configured runtime`, execution: null };
  }

  return {
    error: null,
    execution: { file, args: argumentsList.slice(0, 16) },
  };
}
