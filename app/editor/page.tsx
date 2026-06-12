"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { OnMount } from "@monaco-editor/react";
import { useSearchParams } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import RouteGuard from "@/components/RouteGuard";
import { CodeEditorContextMenu } from "@/components/editor/CodeEditorContextMenu";
import { ComplexityAnalyzerCard } from "@/components/editor/ComplexityAnalyzerCard";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
import { DebuggerStateCard } from "@/components/live/DebuggerStateCard";
import { LiveConsolePanel } from "@/components/live/LiveConsolePanel";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import {
  analyzeMiniScriptComplexity,
  type ComplexityAnalysis,
} from "@/lib/complexity-analyzer";
import {
  advanceLine,
  parseLine,
  reset,
  setVariable,
  step,
  type StepResult,
} from "@/lib/engine";
import { visualizeMiniScript } from "@/lib/msp-visualizer";
import { supabase } from "@/lib/supabase";
import {
  Bug,
  Copy,
  FileDown,
  Gauge,
  ListTree,
  Pencil,
  Play,
  Plus,
  Save,
  Share2,
  StepForward,
  Terminal,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import { toast } from "sonner";

type ProjectFile = {
  id: string;
  name: string;
  language: "msp" | "text";
  content: string;
};

type SnippetItem = {
  id: string;
  title: string;
  description: string;
  code: string;
  files?: ProjectFile[] | null;
  created_at: string;
};

type Value = string | number | boolean;
type ProgramInstruction = ReturnType<typeof parseLine>;
type MonacoEditorInstance = Parameters<OnMount>[0];

type GitHubRepoTarget = {
  owner: string;
  repo: string;
  branch?: string;
  path: string;
};

type GitHubRepoResponse = {
  default_branch?: string;
};

type GitHubContentItem = {
  type?: string;
  name?: string;
  path?: string;
  download_url?: string | null;
};

const MAX_GITHUB_IMPORT_FILES = 30;
const MAX_GITHUB_IMPORT_BYTES = 350_000;

function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
    >
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.71 0 0 .84-.28 2.75 1.05A9.28 9.28 0 0 1 12 6.98c.85 0 1.71.12 2.51.35 1.9-1.33 2.74-1.05 2.74-1.05.55 1.4.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.95.68 1.92 0 1.38-.01 2.49-.01 2.83 0 .27.18.59.69.49A10.08 10.08 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function getErrorDetails(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; line?: unknown };

    return {
      message:
        typeof candidate.message === "string"
          ? candidate.message
          : "Unknown error",
      line: typeof candidate.line === "number" ? candidate.line : undefined,
    };
  }

  return {
    message: error instanceof Error ? error.message : "Unknown error",
    line: undefined,
  };
}

function parseInputValue(value: string): Value {
  if (value === "true" || value === "false") return value === "true";
  if (!Number.isNaN(Number(value))) return Number(value);
  return value;
}

function normalizeErrorLine(line: number | undefined) {
  if (typeof line !== "number") return null;
  return Math.max(1, line);
}

function createFileId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getFileLanguage(name: string): ProjectFile["language"] {
  return name.toLowerCase().endsWith(".msp") ? "msp" : "text";
}

function createProjectFile(name = "main.msp", content = ""): ProjectFile {
  return {
    id: createFileId(),
    name,
    language: getFileLanguage(name),
    content,
  };
}

function normalizeProjectFiles(files: unknown, fallbackCode: string) {
  if (!Array.isArray(files)) {
    return [createProjectFile("main.msp", fallbackCode)];
  }

  const normalized = files
    .map((file) => {
      if (!file || typeof file !== "object") return null;

      const candidate = file as {
        id?: unknown;
        name?: unknown;
        language?: unknown;
        content?: unknown;
      };
      const name =
        typeof candidate.name === "string" && candidate.name.trim()
          ? candidate.name.trim()
          : "main.msp";

      return {
        id: typeof candidate.id === "string" ? candidate.id : createFileId(),
        name,
        language: getFileLanguage(name),
        content:
          typeof candidate.content === "string" ? candidate.content : "",
      } satisfies ProjectFile;
    })
    .filter((file): file is ProjectFile => Boolean(file));

  return normalized.length
    ? normalized
    : [createProjectFile("main.msp", fallbackCode)];
}

function getPrimaryFile(files: ProjectFile[]) {
  return files.find((file) => file.name === "main.msp") ?? files[0];
}

function getSnippetFileCount(snippet: SnippetItem) {
  return Array.isArray(snippet.files) && snippet.files.length > 0
    ? snippet.files.length
    : 1;
}

function parseGitHubRepoUrl(rawUrl: string): GitHubRepoTarget | null {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return null;

  try {
    const url = new URL(trimmedUrl.replace(/\.git$/, ""));

    if (url.hostname !== "github.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const [owner, repo] = parts;
    const marker = parts[2];
    const hasScopedPath = (marker === "tree" || marker === "blob") && parts[3];

    return {
      owner,
      repo,
      branch: hasScopedPath ? parts[3] : undefined,
      path:
        hasScopedPath && marker === "tree"
          ? parts.slice(4).join("/")
          : hasScopedPath && marker === "blob"
            ? parts.slice(4, -1).join("/")
            : "",
    };
  } catch {
    return null;
  }
}

function encodeGitHubPath(path: string) {
  return path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

function createUniqueImportedFileName(path: string, usedNames: Set<string>) {
  const pathParts = path.split("/").filter(Boolean);
  const baseName = pathParts.at(-1) || "main.msp";
  const folderName = pathParts.length > 1 ? pathParts.at(-2) : null;
  const candidates = [
    baseName,
    folderName ? `${folderName}-${baseName}` : null,
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
  }

  const extensionIndex = baseName.lastIndexOf(".");
  const namePart = extensionIndex >= 0 ? baseName.slice(0, extensionIndex) : baseName;
  const extension = extensionIndex >= 0 ? baseName.slice(extensionIndex) : "";
  let index = 2;
  let candidate = `${namePart}-${index}${extension}`;

  while (usedNames.has(candidate)) {
    index += 1;
    candidate = `${namePart}-${index}${extension}`;
  }

  usedNames.add(candidate);
  return candidate;
}

function EditorContent() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialFiles = useMemo(
    () => [
      createProjectFile(
        "main.msp",
        searchParams.get("code") ??
          `X = 0
WHILE X < 3
  PRINT X
  X = X + 1
END`
      ),
    ],
    [searchParams]
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>(() => initialFiles);
  const [activeFileId, setActiveFileId] = useState<string | null>(
    () => initialFiles[0]?.id ?? null
  );

  const [program, setProgram] = useState<ProgramInstruction[]>([]);
  const [variables, setVariables] = useState<Record<string, Value>>({});
  const [currentLine, setCurrentLine] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [stopped, setStopped] = useState(false);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [inputVar, setInputVar] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [complexityEnabled, setComplexityEnabled] = useState(false);
  const [tabSize, setTabSize] = useState(2);
  const [editorLine, setEditorLine] = useState(1);
  const [activePanel, setActivePanel] = useState("console");
  const [createFileOpen, setCreateFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("file-2.msp");
  const [newFileError, setNewFileError] = useState("");
  const [githubImportOpen, setGithubImportOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [githubImporting, setGithubImporting] = useState(false);

  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const decorationIdsRef = useRef<string[]>([]);

  const activeFile = useMemo(
    () => files.find((file) => file.id === activeFileId) ?? files[0],
    [files, activeFileId]
  );
  const code = activeFile?.content ?? "";
  const executionLine =
    errorLine ?? (program.length > 0 && !stopped && currentLine > 0 ? currentLine : null);
  const complexityAnalysis = useMemo<ComplexityAnalysis | null>(() => {
    if (!complexityEnabled) return null;
    return analyzeMiniScriptComplexity(code, locale);
  }, [code, locale, complexityEnabled]);
  const codeVisualization = useMemo(() => visualizeMiniScript(code), [code]);
  const fileName = activeFile?.name ?? "main.msp";

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const decorations = [];

    if (executionLine) {
      decorations.push({
        range: {
          startLineNumber: executionLine,
          startColumn: 1,
          endLineNumber: executionLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: errorLine ? "msp-error-line" : "msp-current-line",
          glyphMarginClassName: errorLine ? "msp-error-glyph" : "msp-current-glyph",
        },
      });
    }

    decorationIdsRef.current = editor.deltaDecorations(
      decorationIdsRef.current,
      decorations
    );
  }, [executionLine, errorLine]);

  async function fetchSnippets(): Promise<SnippetItem[]> {
    if (!user) return [];

    const { data } = await supabase
      .from("snippets")
      .select("id, title, description, code, files, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return data || [];
  }

  const { data: snippets = [] } = useQuery<SnippetItem[]>({
    queryKey: ["editor-snippets", user?.id],
    queryFn: fetchSnippets,
    enabled: !!user,
  });

  const compile = useCallback(() => {
    const parsed = code.split("\n").map(parseLine);

    reset();
    setProgram(parsed);
    setVariables({});
    setCurrentLine(0);
    setOutput([]);
    setStopped(false);
    setErrorLine(null);
    setInputVar(null);
    setInputValue("");

    return parsed;
  }, [code]);

  function applyStepResult(result: StepResult, collectedOutput: string[] = []) {
    if (!result) {
      setStopped(true);
      return false;
    }

    if (result.inputRequest) {
      setInputVar(result.inputRequest);
      setActivePanel("console");
      return false;
    }

    setVariables(result.variables as Record<string, Value>);
    setCurrentLine(result.currentLine);

    if (result.output !== null) {
      collectedOutput.push(String(result.output));
    }

    return true;
  }

  function handleStep() {
    const activeProgram = program.length > 0 ? program : compile();

    if (stopped && program.length > 0) return;

    setIsRunning(false);
    setActivePanel("debugger");

    try {
      const result = step(activeProgram);
      const collectedOutput: string[] = [];
      applyStepResult(result, collectedOutput);

      if (collectedOutput.length) {
        setOutput((prev) => [...prev, ...collectedOutput]);
      }
    } catch (error: unknown) {
      const details = getErrorDetails(error);
      setOutput((prev) => [...prev, `ERROR: ${details.message}`]);
      setErrorLine(normalizeErrorLine(details.line) ?? Math.max(1, currentLine));
      setStopped(true);
      setActivePanel("console");
    }
  }

  function runProgram(activeProgram: ProgramInstruction[]) {
    const newOutput: string[] = [];

    try {
      while (true) {
        const result = step(activeProgram);

        if (!result) {
          setStopped(true);
          break;
        }

        const shouldContinue = applyStepResult(result, newOutput);
        if (!shouldContinue) break;
      }
    } catch (error: unknown) {
      const details = getErrorDetails(error);
      newOutput.push(`ERROR: ${details.message}`);
      setErrorLine(normalizeErrorLine(details.line) ?? Math.max(1, currentLine));
      setStopped(true);
    }

    if (newOutput.length) {
      setOutput((prev) => [...prev, ...newOutput]);
    }
  }

  function handleRun() {
    const activeProgram = compile();

    setIsRunning(true);
    setActivePanel("console");
    runProgram(activeProgram);
  }

  function handleSubmitInput() {
    if (!inputVar) return;

    const value = parseInputValue(inputValue);

    setVariable(inputVar, value);
    setVariables((prev) => ({
      ...prev,
      [inputVar]: value,
    }));
    setInputVar(null);
    setInputValue("");

    advanceLine();
    setCurrentLine((prev) => prev + 1);

    if (isRunning) {
      runProgram(program);
    }
  }

  function resetRuntimeState(clearOutput = false) {
    setProgram([]);
    setVariables({});
    setCurrentLine(0);
    if (clearOutput) setOutput([]);
    setStopped(false);
    setErrorLine(null);
    setInputVar(null);
    setInputValue("");
  }

  function handleCodeChange(nextCode: string) {
    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.id === activeFile?.id ? { ...file, content: nextCode } : file
      )
    );
    resetRuntimeState();
  }

  function handleSaveFile() {
    saveFile(activeFile);
  }

  function saveFile(file: ProjectFile | undefined | null) {
    if (!file) return;

    try {
      const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = file.name || "main.msp";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t("editor.toast.savedFile"));
    } catch {
      toast.error(t("editor.toast.saveError"));
    }
  }

  async function copyFileName(fileNameToCopy: string) {
    await navigator.clipboard.writeText(fileNameToCopy);
    toast.success("File name copied");
  }

  async function saveSnippet(silent = false) {
    if (!user) return;

    const primaryFile = getPrimaryFile(files);

    if (!files.some((file) => file.content.trim())) {
      if (!silent) toast.error("Code cannot be empty");
      return;
    }

    setSaving(true);

    const payload = {
      title,
      description,
      code: primaryFile?.content ?? "",
      files,
      is_public: true,
    };

    const response = savedId
      ? await supabase
          .from("snippets")
          .update(payload)
          .eq("id", savedId)
          .select()
          .single()
      : await supabase
          .from("snippets")
          .insert([{ user_id: user.id, ...payload }])
          .select()
          .single();

    setSaving(false);

    if (response.error) {
      toast.error(t("editor.toast.snippetSaveError"));
      return;
    }

    if (!silent) toast.success(t("editor.toast.snippetSaved"));

    await queryClient.invalidateQueries({
      queryKey: ["editor-snippets", user.id],
    });
    setSavedId(response.data.id);
    return response.data.id as string;
  }

  async function handleShare() {
    let idToUse = savedId;

    if (!idToUse) {
      const id = await saveSnippet(true);
      if (!id) return;
      idToUse = id;
    }

    const url = `${window.location.origin}/editor/${idToUse}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("editor.toast.copied"));
  }

  async function deleteSnippet(id: string) {
    const { error } = await supabase.from("snippets").delete().eq("id", id);

    if (error) {
      toast.error(t("editor.toast.deleteError"));
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["editor-snippets", user?.id],
    });

    if (savedId === id) setSavedId(null);
    toast.success(t("editor.toast.deleted"));
  }

  function createEditorFile() {
    setNewFileName(`file-${files.length + 1}.msp`);
    setNewFileError("");
    setCreateFileOpen(true);
  }

  function confirmCreateEditorFile() {
    const trimmedName = newFileName.trim();

    if (!trimmedName) {
      setNewFileError("File name is required");
      return;
    }

    if (!/^[\w.-]+$/.test(trimmedName)) {
      setNewFileError("Use only letters, numbers, dots, dashes and underscores");
      return;
    }

    if (files.some((file) => file.name === trimmedName)) {
      setNewFileError("A file with this name already exists");
      return;
    }

    const nextFile = createProjectFile(trimmedName);
    setFiles((currentFiles) => [...currentFiles, nextFile]);
    setActiveFileId(nextFile.id);
    setCreateFileOpen(false);
    setNewFileError("");
    resetRuntimeState();
  }

  async function collectGithubMspFiles(target: GitHubRepoTarget, branch: string) {
    const pendingPaths = [target.path];
    const collectedFiles: Array<{ path: string; downloadUrl: string }> = [];

    while (pendingPaths.length > 0 && collectedFiles.length < MAX_GITHUB_IMPORT_FILES) {
      const currentPath = pendingPaths.shift() ?? "";
      const encodedPath = encodeGitHubPath(currentPath);
      const contentsUrl = `https://api.github.com/repos/${target.owner}/${target.repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
      const response = await fetch(contentsUrl, {
        headers: { Accept: "application/vnd.github+json" },
      });

      if (!response.ok) {
        throw new Error(`GitHub contents request failed: ${response.status}`);
      }

      const payload = (await response.json()) as
        | GitHubContentItem
        | GitHubContentItem[];
      const items = Array.isArray(payload) ? payload : [payload];

      for (const item of items) {
        if (!item.path || !item.name) continue;

        if (item.type === "dir") {
          pendingPaths.push(item.path);
          continue;
        }

        if (
          item.type === "file" &&
          item.name.toLowerCase().endsWith(".msp") &&
          item.download_url
        ) {
          collectedFiles.push({
            path: item.path,
            downloadUrl: item.download_url,
          });

          if (collectedFiles.length >= MAX_GITHUB_IMPORT_FILES) break;
        }
      }
    }

    return collectedFiles;
  }

  async function importFromGithub() {
    const target = parseGitHubRepoUrl(githubUrl);

    if (!target) {
      toast.error(t("editor.githubImport.toast.invalidUrl"));
      return;
    }

    setGithubImporting(true);

    try {
      let branch = target.branch;

      if (!branch) {
        const repoResponse = await fetch(
          `https://api.github.com/repos/${target.owner}/${target.repo}`,
          { headers: { Accept: "application/vnd.github+json" } }
        );

        if (!repoResponse.ok) {
          throw new Error(`GitHub repo request failed: ${repoResponse.status}`);
        }

        const repoData = (await repoResponse.json()) as GitHubRepoResponse;
        branch = repoData.default_branch ?? "main";
      }

      const githubFiles = await collectGithubMspFiles(target, branch);

      if (githubFiles.length === 0) {
        toast.error(t("editor.githubImport.toast.noFiles"));
        return;
      }

      let totalBytes = 0;
      const usedNames = new Set(files.map((file) => file.name));
      const importedFiles: ProjectFile[] = [];

      for (const githubFile of githubFiles) {
        const response = await fetch(githubFile.downloadUrl);

        if (!response.ok) {
          throw new Error(`GitHub raw file request failed: ${response.status}`);
        }

        const content = await response.text();
        totalBytes += content.length;

        if (totalBytes > MAX_GITHUB_IMPORT_BYTES) {
          throw new Error("GitHub import size limit exceeded");
        }

        importedFiles.push(
          createProjectFile(
            createUniqueImportedFileName(githubFile.path, usedNames),
            content
          )
        );
      }

      setFiles((currentFiles) => [...currentFiles, ...importedFiles]);
      setActiveFileId(importedFiles[0]?.id ?? activeFileId);
      setGithubImportOpen(false);
      setGithubUrl("");
      resetRuntimeState(true);
      toast.success(
        t("editor.githubImport.toast.imported").replace(
          "{count}",
          String(importedFiles.length)
        )
      );
    } catch {
      toast.error(t("editor.githubImport.toast.failed"));
    } finally {
      setGithubImporting(false);
    }
  }

  function renameEditorFile(fileId: string) {
    const file = files.find((item) => item.id === fileId);
    if (!file) return;

    const name = window.prompt("Rename file", file.name);
    const trimmedName = name?.trim();

    if (!trimmedName || trimmedName === file.name) return;

    if (files.some((item) => item.id !== fileId && item.name === trimmedName)) {
      toast.error("A file with this name already exists");
      return;
    }

    setFiles((currentFiles) =>
      currentFiles.map((item) =>
        item.id === fileId
          ? { ...item, name: trimmedName, language: getFileLanguage(trimmedName) }
          : item
      )
    );
  }

  function deleteEditorFile(fileId: string) {
    if (files.length === 1) {
      toast.error("Project needs at least one file");
      return;
    }

    const nextFiles = files.filter((file) => file.id !== fileId);

    setFiles(nextFiles);

    if (activeFileId === fileId) {
      setActiveFileId(nextFiles[0]?.id ?? null);
      resetRuntimeState();
    }
  }

  function switchEditorFile(fileId: string) {
    if (fileId === activeFileId) return;

    setActiveFileId(fileId);
    resetRuntimeState();
  }

  function handleAnalyzeComplexity() {
    setComplexityEnabled(true);
    setActivePanel("analysis");
    toast.success(t("editor.complexity.toast.completed"));
  }

  function formatSnippetFileCount(count: number) {
    if (locale === "ro") {
      return count === 1 ? "1 fișier" : `${count} fișiere`;
    }

    return count === 1 ? "1 file" : `${count} files`;
  }

  async function loadSnippet(id: string) {
    const { data } = await supabase
      .from("snippets")
      .select("*")
      .eq("id", id)
      .single();

    if (!data) return;

    const nextFiles = normalizeProjectFiles(data.files, data.code || "");

    setFiles(nextFiles);
    setActiveFileId(nextFiles[0]?.id ?? null);
    setTitle(data.title || "");
    setDescription(data.description || "");
    setSavedId(data.id);
    resetRuntimeState(true);
  }

  function createNewSnippet() {
    setSavedId(null);
    setTitle("");
    setDescription("");
    const nextFile = createProjectFile("main.msp");
    setFiles([nextFile]);
    setActiveFileId(nextFile.id);
    resetRuntimeState(true);
  }

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    const syncLine = () => {
      setEditorLine(editor.getPosition()?.lineNumber ?? 1);
    };

    syncLine();
    editor.onDidChangeCursorPosition(syncLine);
    editor.onDidFocusEditorText(syncLine);
    editor.onDidChangeModelContent(syncLine);
  };

  const tabSizeControl = (
    <Select
      value={String(tabSize)}
      onValueChange={(value) => setTabSize(Number(value))}
    >
      <SelectTrigger
        size="sm"
        className="h-7 border-zinc-200 bg-white px-2 text-xs text-zinc-600"
        aria-label={t("live.tabSize")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {[2, 3, 4, 8].map((size) => (
          <SelectItem key={size} value={String(size)}>
            {size} {t("live.spaces")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const toolbarButton = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void | Promise<void>,
    variant: "default" | "secondary" | "outline" | "ghost" = "outline",
    disabled = false
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant={variant}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  const metadataPanel = (
    <div className="space-y-3 p-4">
      <Input
        placeholder={t("editor.placeholderTitle")}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Input
        placeholder={t("editor.placeholderDescription")}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
    </div>
  );

  const consolePanel = (
    <LiveConsolePanel
      currentLine={currentLine}
      inputPlaceholder={t("live.inputPlaceholder")}
      inputPrompt={t("editor.debugger.input")}
      inputValue={inputValue}
      noOutputLabel={t("editor.debugger.output")}
      okLabel={t("editor.debugger.submit")}
      onInputValueChange={setInputValue}
      onSubmitInput={handleSubmitInput}
      output={output}
      title={t("live.console")}
      variables={variables}
      waitingInput={inputVar}
    />
  );

  const debuggerPanel = (
    <div className="h-full overflow-y-auto p-4">
      <DebuggerStateCard
        currentLine={currentLine}
        title={t("editor.debugger.title")}
        variables={variables}
      />
    </div>
  );

  const analysisPanel = (
    <div className="h-full overflow-y-auto p-4">
      <ComplexityAnalyzerCard
        analysis={complexityAnalysis}
        compact
        frame="section"
      />
    </div>
  );

  const visualizationPanel = (
    <div className="h-full overflow-y-auto p-4">
      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <Workflow size={14} />
          {t("editor.visualization.title")}
        </div>
        <Tabs defaultValue="ast" className="gap-0">
          <TabsList className="grid h-10 w-full grid-cols-2 rounded-none border-b bg-zinc-50 px-3">
            <TabsTrigger value="ast" className="text-xs">
              {t("editor.visualization.tabs.ast")}
            </TabsTrigger>
            <TabsTrigger value="flowchart" className="text-xs">
              {t("editor.visualization.tabs.flowchart")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ast" className="mt-0">
            <pre className="max-h-[360px] overflow-auto p-3 text-xs leading-relaxed whitespace-pre-wrap">
              {codeVisualization.ast}
            </pre>
          </TabsContent>
          <TabsContent value="flowchart" className="mt-0">
            <pre className="max-h-[360px] overflow-auto p-3 text-xs leading-relaxed whitespace-pre-wrap">
              {codeVisualization.flowchart}
            </pre>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );

  const snippetsPanel = (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-2">
        {snippets.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
            {t("editor.snippets.empty")}
          </div>
        )}

        {snippets.map((snippet) => (
          <div
            key={snippet.id}
            className={`group flex items-center gap-2 rounded-xl border p-3 transition ${
              savedId === snippet.id
                ? "border-zinc-900 bg-zinc-50"
                : "border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <button
              type="button"
              onClick={() => loadSnippet(snippet.id)}
              className="min-w-0 flex-1 text-left"
            >
              <div className="truncate text-sm font-semibold">
                {snippet.title || t("editor.snippets.untitled")}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                <span className="truncate">
                  {new Date(snippet.created_at).toLocaleString()}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                  <ListTree size={12} />
                  {formatSnippetFileCount(getSnippetFileCount(snippet))}
                </span>
              </div>
            </button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => loadSnippet(snippet.id)}
              aria-label={t("editor.snippets.edit")}
            >
              <Pencil size={14} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => deleteSnippet(snippet.id)}
              aria-label={t("editor.snippets.delete")}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <TooltipProvider>
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold md:text-base">
                {t("editor.title")}
              </h1>
              <p className="hidden truncate text-xs text-zinc-500 sm:block">
                {title || fileName}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {toolbarButton(t("editor.actions.newSnippet"), <Plus size={16} />, createNewSnippet)}
              {toolbarButton(t("editor.actions.compile"), <Bug size={16} />, () => {
                compile();
              }, "secondary")}
              {toolbarButton(t("editor.actions.step"), <StepForward size={16} />, handleStep, "outline", stopped)}
              {toolbarButton(t("editor.actions.run"), <Play size={16} />, handleRun, "default")}
              <div className="hidden items-center gap-1.5 sm:flex">
                {toolbarButton(
                  t("editor.githubImport.action"),
                  <GitHubIcon size={16} />,
                  () => setGithubImportOpen(true),
                  "outline"
                )}
                {toolbarButton(t("editor.actions.download"), <FileDown size={16} />, handleSaveFile)}
                {toolbarButton(
                  savedId ? t("editor.actions.update") : t("editor.actions.save"),
                  <Save size={16} />,
                  async () => {
                    await saveSnippet(false);
                  },
                  "outline",
                  saving
                )}
                {toolbarButton(t("editor.actions.share"), <Share2 size={16} />, handleShare, "secondary")}
                {toolbarButton(
                  complexityAnalysis
                    ? t("editor.complexity.actions.rerun")
                    : t("editor.complexity.actions.analyze"),
                  <Gauge size={16} />,
                  handleAnalyzeComplexity
                )}
              </div>
            </div>
          </header>

          <div className="flex h-11 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-zinc-200 bg-zinc-50 px-3 sm:hidden">
            {toolbarButton(
              t("editor.githubImport.action"),
              <GitHubIcon size={16} />,
              () => setGithubImportOpen(true),
              "outline"
            )}
            {toolbarButton(t("editor.actions.download"), <FileDown size={16} />, handleSaveFile)}
            {toolbarButton(
              savedId ? t("editor.actions.update") : t("editor.actions.save"),
              <Save size={16} />,
              async () => {
                await saveSnippet(false);
              },
              "outline",
              saving
            )}
            {toolbarButton(t("editor.actions.share"), <Share2 size={16} />, handleShare, "secondary")}
            {toolbarButton(
              complexityAnalysis
                ? t("editor.complexity.actions.rerun")
                : t("editor.complexity.actions.analyze"),
              <Gauge size={16} />,
              handleAnalyzeComplexity
            )}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]">
            <main className="flex min-h-0 min-w-0 flex-col border-b border-zinc-200 bg-white xl:border-r xl:border-b-0">
              <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-yellow-400" />
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
                  <span className="ml-2 truncate text-xs font-medium text-zinc-700">
                    {fileName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Play size={13} />
                  <span>MiniScript+</span>
                </div>
              </div>

              <div className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {files.map((file) => {
                  const isActive = file.id === activeFile?.id;

                  return (
                    <ContextMenu key={file.id}>
                      <ContextMenuTrigger asChild>
                        <div
                          className={`flex h-7 min-w-0 shrink-0 items-center rounded-md border text-xs transition ${
                            isActive
                              ? "border-zinc-300 bg-zinc-100 text-zinc-950"
                              : "border-transparent bg-white text-zinc-500 hover:bg-zinc-50"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => switchEditorFile(file.id)}
                            onDoubleClick={() => renameEditorFile(file.id)}
                            className="max-w-[150px] truncate px-2 font-medium"
                            title={`${file.name} - double click to rename`}
                          >
                            {file.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEditorFile(file.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-sm text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900"
                            aria-label={`Delete ${file.name}`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-48">
                        <ContextMenuLabel className="truncate">
                          {file.name}
                        </ContextMenuLabel>
                        <ContextMenuSeparator />
                        <ContextMenuItem onSelect={() => switchEditorFile(file.id)}>
                          <Play size={14} />
                          Open
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => renameEditorFile(file.id)}>
                          <Pencil size={14} />
                          Rename
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => copyFileName(file.name)}>
                          <Copy size={14} />
                          Copy name
                        </ContextMenuItem>
                        <ContextMenuItem onSelect={() => saveFile(file)}>
                          <FileDown size={14} />
                          Download
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onSelect={createEditorFile}>
                          <Plus size={14} />
                          New file
                        </ContextMenuItem>
                        <ContextMenuItem
                          disabled={files.length === 1}
                          variant="destructive"
                          onSelect={() => deleteEditorFile(file.id)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}

                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={createEditorFile}
                      aria-label="Create file"
                    >
                      <Plus size={14} />
                    </Button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-44">
                    <ContextMenuItem onSelect={createEditorFile}>
                      <Plus size={14} />
                      New file
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </div>

              <CodeEditorContextMenu
                code={code}
                fileName={fileName}
                onChange={handleCodeChange}
                onRun={handleRun}
              >
                <div className="min-h-0 flex-1 overflow-hidden">
                  <MiniScriptMonacoEditor
                    onMount={handleEditorMount}
                    height="100%"
                    value={code}
                    onChange={handleCodeChange}
                    options={{
                      contextmenu: false,
                      padding: { top: 16, bottom: 16 },
                      smoothScrolling: true,
                      wordWrap: "on",
                      automaticLayout: true,
                      cursorSmoothCaretAnimation: "on",
                      cursorBlinking: "smooth",
                      glyphMargin: true,
                      scrollbar: {
                        verticalScrollbarSize: 8,
                        horizontalScrollbarSize: 8,
                      },
                      tabSize,
                      insertSpaces: true,
                      wrappingIndent: "same",
                    }}
                  />
                </div>
              </CodeEditorContextMenu>

              <div className="flex h-8 shrink-0 items-center justify-between border-t border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-500">
                <span>Ln {editorLine}</span>
                <div className="flex items-center gap-2">
                  <span>{t("live.tabSize")}</span>
                  {tabSizeControl}
                  <span>· MSP</span>
                </div>
              </div>
            </main>

            <aside className="min-h-0 overflow-hidden bg-white">
              <Tabs
                value={activePanel}
                onValueChange={setActivePanel}
                className="flex h-full min-h-[420px] flex-col gap-0 xl:min-h-0"
              >
                <TabsList className="grid h-11 w-full grid-cols-5 rounded-none border-b bg-zinc-50 px-3">
                  <TabsTrigger
                    value="console"
                    className="gap-1.5 px-2 text-xs"
                    title={t("live.console")}
                  >
                    <Terminal size={14} />
                    <span className="sr-only">{t("live.console")}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="debugger"
                    className="gap-1.5 px-2 text-xs"
                    title={t("editor.debugger.title")}
                  >
                    <Bug size={14} />
                    <span className="sr-only">{t("editor.debugger.title")}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="analysis"
                    className="gap-1.5 px-2 text-xs"
                    title={t("editor.complexity.title")}
                  >
                    <Gauge size={14} />
                    <span className="sr-only">{t("editor.complexity.title")}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="visual"
                    className="gap-1.5 px-2 text-xs"
                    title={t("editor.visualization.title")}
                  >
                    <Workflow size={14} />
                    <span className="sr-only">{t("editor.visualization.title")}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="snippets"
                    className="gap-1.5 px-2 text-xs"
                    title={t("editor.snippets.title")}
                  >
                    <ListTree size={14} />
                    <span className="sr-only">{t("editor.snippets.title")}</span>
                  </TabsTrigger>
                </TabsList>

                <div className="min-h-0 border-b border-zinc-200">
                  {metadataPanel}
                </div>

                <TabsContent value="console" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
                  {consolePanel}
                </TabsContent>
                <TabsContent value="debugger" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
                  {debuggerPanel}
                </TabsContent>
                <TabsContent value="analysis" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
                  {analysisPanel}
                </TabsContent>
                <TabsContent value="visual" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
                  {visualizationPanel}
                </TabsContent>
                <TabsContent value="snippets" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
                  {snippetsPanel}
                </TabsContent>
              </Tabs>
            </aside>
          </div>
        </div>
      </TooltipProvider>

      <Dialog open={githubImportOpen} onOpenChange={setGithubImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("editor.githubImport.title")}</DialogTitle>
            <DialogDescription>
              {t("editor.githubImport.description")}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void importFromGithub();
            }}
          >
            <label
              htmlFor="editor-github-url"
              className="flex items-center gap-2 text-sm font-medium text-zinc-700"
            >
              <GitHubIcon size={16} />
              {t("editor.githubImport.label")}
            </label>
            <Input
              id="editor-github-url"
              autoFocus
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
              placeholder={t("editor.githubImport.placeholder")}
              disabled={githubImporting}
            />
            <p className="text-xs text-zinc-500">
              {t("editor.githubImport.hint")}
            </p>
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setGithubImportOpen(false)}
              disabled={githubImporting}
            >
              {t("editor.githubImport.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void importFromGithub()}
              disabled={githubImporting}
              className="gap-2"
            >
              <GitHubIcon size={16} />
              {githubImporting
                ? t("editor.githubImport.importing")
                : t("editor.githubImport.import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createFileOpen} onOpenChange={setCreateFileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create file</DialogTitle>
            <DialogDescription>
              Add a new file to this snippet project.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              confirmCreateEditorFile();
            }}
          >
            <label
              htmlFor="editor-new-file-name"
              className="text-sm font-medium text-zinc-700"
            >
              File name
            </label>
            <Input
              id="editor-new-file-name"
              autoFocus
              value={newFileName}
              onChange={(event) => {
                setNewFileName(event.target.value);
                setNewFileError("");
              }}
              placeholder="main.msp"
            />
            {newFileError && (
              <p className="text-xs text-red-600">{newFileError}</p>
            )}
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateFileOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={confirmCreateEditorFile}>
              Create file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .msp-current-line {
          background: rgba(132, 204, 22, 0.12);
          border-top: 1px solid rgba(132, 204, 22, 0.32);
          border-bottom: 1px solid rgba(132, 204, 22, 0.32);
        }

        .msp-error-line {
          background: rgba(239, 68, 68, 0.14);
          border-top: 1px solid rgba(239, 68, 68, 0.36);
          border-bottom: 1px solid rgba(239, 68, 68, 0.36);
        }

        .msp-current-glyph {
          background: #84cc16;
          border-radius: 999px;
          margin-left: 6px;
          width: 6px !important;
          height: 6px !important;
          top: 9px;
        }

        .msp-error-glyph {
          background: #ef4444;
          border-radius: 999px;
          margin-left: 6px;
          width: 6px !important;
          height: 6px !important;
          top: 9px;
        }
      `}</style>
    </div>
  );
}

export default function EditorPage() {
  return (
    <RouteGuard requireAuth>
      <Suspense fallback={null}>
        <EditorContent />
      </Suspense>
    </RouteGuard>
  );
}
