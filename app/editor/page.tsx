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
import { EditorSettingsPanel } from "@/components/editor/EditorSettingsPanel";
import {
  EditorTerminal,
  type EditorTerminalHandle,
} from "@/components/editor/EditorTerminal";
import { GitHubCloneDialog } from "@/components/editor/GitHubCloneDialog";
import { GitHubSourceControlPanel } from "@/components/editor/GitHubSourceControlPanel";
import { ProjectExplorer } from "@/components/editor/ProjectExplorer";
import { DebuggerStateCard } from "@/components/live/DebuggerStateCard";
import { LiveConsolePanel } from "@/components/live/LiveConsolePanel";
import { LiveSessionsPanel } from "@/components/live/LiveSessionsPanel";
import { useLiveWorkspaceCollaboration } from "@/components/live/useLiveWorkspaceCollaboration";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { PromptDialog } from "@/components/ui/prompt-dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
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
  isCloudRunnableLanguage,
} from "@/lib/code-runner";
import {
  editorCodeTransferKey,
  getEditorTransferFileName,
  isEditorLanguageKey,
  parseEditorCodeTransfer,
} from "@/lib/editor-code-transfer";
import {
  createProjectDirectory,
  createProjectFile,
  createProjectTemplate,
  collectProjectDirectories,
  getEditorLanguage,
  getEditorLanguageDefinition,
  getProjectBaseName,
  getProjectParentPath,
  isValidProjectPath,
  normalizeProjectEntries,
  normalizeProjectPath,
  serializeProjectEntries,
  type ProjectDirectory,
  type ProjectFile,
  type ProjectEntry,
  type ProjectTemplateKey,
} from "@/lib/editor-project";
import {
  DEFAULT_EDITOR_PREFERENCES,
  EDITOR_PREFERENCES_STORAGE_KEY,
  normalizeEditorPreferences,
  type EditorPreferences,
} from "@/lib/editor-preferences";
import {
  createLiveWorkspaceDocument,
  type LiveWorkspaceDocument,
} from "@/lib/editor-live-workspace";
import {
  getGitHubIdentitySummary,
} from "@/lib/github-auth";
import {
  isSupportedGitHubTextPath,
  type GitHubRemoteFile,
} from "@/lib/github-integration";
import {
  ChevronDown,
  FileDown,
  FileCode2,
  Files,
  Gauge,
  GitBranch,
  ListTree,
  Link2,
  Pencil,
  Play,
  Plus,
  RadioTower,
  Search,
  Save,
  Settings2,
  Share2,
  Square,
  StepForward,
  Terminal,
  Trash2,
  UserPlus,
  Workflow,
  X,
} from "lucide-react";
import { toast } from "sonner";

type SnippetItem = {
  id: string;
  title: string;
  description: string;
  code: string;
  files?: ProjectEntry[] | null;
  is_public?: boolean | null;
  created_at: string;
};

type ProjectPersistenceError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
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

function getPrimaryFile(files: ProjectFile[]) {
  return files.find((file) => file.path === "main.msp") ?? files[0];
}

function getSnippetFileCount(snippet: SnippetItem) {
  return Array.isArray(snippet.files) && snippet.files.length > 0
    ? snippet.files.filter((entry) => !entry || entry.kind !== "directory").length
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
            ? parts.slice(4).join("/")
            : "",
    };
  } catch {
    return null;
  }
}

function encodeGitHubPath(path: string) {
  return path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

type EditorActivityView =
  | "explorer"
  | "search"
  | "run"
  | "projects"
  | "live"
  | "source-control"
  | "settings";

function EditorContent() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialFiles = useMemo(
    () => {
      const directCode = searchParams.get("code");
      const requestedLanguage = searchParams.get("language");
      const language = isEditorLanguageKey(requestedLanguage) ? requestedLanguage : "msp";
      const fileName = getEditorTransferFileName(language, searchParams.get("file"));

      return [
        createProjectFile(
          directCode === null ? "main.msp" : fileName,
          directCode ??
          `X = 0
WHILE X < 3
  PRINT X
  X = X + 1
END
# this is an example code
# add your code here`
        ),
      ];
    },
    [searchParams]
  );

  const [title, setTitle] = useState(() => searchParams.get("title") ?? "");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [projectIsPublic, setProjectIsPublic] = useState(true);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>(() => initialFiles);
  const [directories, setDirectories] = useState<ProjectDirectory[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(
    () => initialFiles[0]?.id ?? null
  );
  const [openFileIds, setOpenFileIds] = useState<string[]>(() =>
    initialFiles[0] ? [initialFiles[0].id] : []
  );
  const [activityView, setActivityView] = useState<EditorActivityView>(() => {
    const requestedView = searchParams.get("view");
    return requestedView && [
      "explorer",
      "search",
      "run",
      "projects",
      "live",
      "source-control",
      "settings",
    ].includes(requestedView)
      ? (requestedView as EditorActivityView)
      : "explorer";
  });
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [compactLayout, setCompactLayout] = useState(false);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectLibrarySearch, setProjectLibrarySearch] = useState("");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [editorPreferences, setEditorPreferences] = useState<EditorPreferences>(
    DEFAULT_EDITOR_PREFERENCES
  );
  const [editorPreferencesLoaded, setEditorPreferencesLoaded] = useState(false);
  const [liveStartRequest, setLiveStartRequest] = useState(0);
  const [liveInviteRequest, setLiveInviteRequest] = useState(0);

  const [program, setProgram] = useState<ProgramInstruction[]>([]);
  const [variables, setVariables] = useState<Record<string, Value>>({});
  const [currentLine, setCurrentLine] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [stopped, setStopped] = useState(false);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [inputVar, setInputVar] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [remoteRunning, setRemoteRunning] = useState(false);
  const [pendingTerminalRun, setPendingTerminalRun] = useState(false);
  const [complexityEnabled, setComplexityEnabled] = useState(false);
  const [editorLine, setEditorLine] = useState(1);
  const [activePanel, setActivePanel] = useState("console");
  const [createFileOpen, setCreateFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("file-2.msp");
  const [newFileParentPath, setNewFileParentPath] = useState("");
  const [newFileError, setNewFileError] = useState("");
  const [createDirectoryOpen, setCreateDirectoryOpen] = useState(false);
  const [newDirectoryName, setNewDirectoryName] = useState("src");
  const [newDirectoryParentPath, setNewDirectoryParentPath] = useState("");
  const [newDirectoryError, setNewDirectoryError] = useState("");
  const [githubImportOpen, setGithubImportOpen] = useState(false);
  const [githubCloneOpen, setGithubCloneOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [githubImporting, setGithubImporting] = useState(false);
  const [renameFileId, setRenameFileId] = useState<string | null>(null);
  const [renameFileName, setRenameFileName] = useState("");
  const [renameFileError, setRenameFileError] = useState("");
  const [renameDirectoryPath, setRenameDirectoryPath] = useState<string | null>(null);
  const [renameDirectoryName, setRenameDirectoryName] = useState("");
  const [renameDirectoryError, setRenameDirectoryError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "file"; id: string; label: string }
    | { kind: "directory"; path: string; label: string }
    | { kind: "project"; id: string; label: string }
    | null
  >(null);

  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const terminalRef = useRef<EditorTerminalHandle | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  const preserveProjectOnLiveLoadRef = useRef(false);
  const lastLiveErrorRef = useRef<string | null>(null);
  const lastEditorActionRef = useRef<string | null>(null);
  const lastEditorImportRef = useRef<string | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const synchronize = () => setCompactLayout(media.matches);
    synchronize();
    media.addEventListener("change", synchronize);
    return () => media.removeEventListener("change", synchronize);
  }, []);

  useEffect(() => {
    const importId = searchParams.get("import");
    if (!importId || lastEditorImportRef.current === importId) return;
    lastEditorImportRef.current = importId;

    let transfer = null;
    try {
      const key = editorCodeTransferKey(importId);
      transfer = parseEditorCodeTransfer(window.sessionStorage.getItem(key));
      window.sessionStorage.removeItem(key);
    } catch {
      transfer = null;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("import");
    window.history.replaceState(null, "", url);

    if (!transfer) {
      toast.error(
        locale === "ro"
          ? "Codul din documentație nu a putut fi deschis."
          : "The documentation code could not be opened.",
      );
      return;
    }

    const importedFile = createProjectFile(transfer.fileName, transfer.code);
    setSavedId(null);
    setProjectIsPublic(true);
    setTitle(transfer.title ?? "");
    setDescription("");
    setFiles([importedFile]);
    setDirectories([]);
    setActiveFileId(importedFile.id);
    setOpenFileIds([importedFile.id]);
    setDirty(false);
    setActivityView("explorer");
    setSidePanelOpen(true);
    setProgram([]);
    setVariables({});
    setCurrentLine(0);
    setOutput([]);
    setStopped(false);
    setErrorLine(null);
    setInputVar(null);
    setInputValue("");
    setIsRunning(false);
    setComplexityEnabled(false);
    toast.success(
      locale === "ro"
        ? "Codul a fost deschis în editor."
        : "Code opened in the editor.",
    );
  }, [locale, searchParams]);

  useEffect(() => {
    const requestedView = searchParams.get("view");
    if (
      !requestedView ||
      !["explorer", "search", "run", "projects", "live", "source-control", "settings"].includes(requestedView)
    ) return;
    setActivityView(requestedView as EditorActivityView);
    setSidePanelOpen(true);
  }, [searchParams]);

  useEffect(() => {
    const githubStatus = searchParams.get("github");
    if (!githubStatus) return;

    if (githubStatus === "connected") {
      toast.success(
        locale === "ro"
          ? "GitHub este conectat. Alege repository-ul proiectului."
          : "GitHub is connected. Choose the project repository."
      );
    } else {
      toast.error(
        locale === "ro"
          ? "Conectarea GitHub nu a putut fi finalizată."
          : "GitHub connection could not be completed."
      );
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("github");
    window.history.replaceState(null, "", url);
  }, [locale, searchParams]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (!action) {
      lastEditorActionRef.current = null;
      return;
    }
    if (lastEditorActionRef.current === action) return;
    lastEditorActionRef.current = action;

    if (action === "new-project") {
      setNewProjectOpen(true);
    } else if (action === "clone-github") {
      setGithubCloneOpen(true);
    } else if (action === "new-file") {
      setNewFileParentPath("");
      setNewFileError("");
      setCreateFileOpen(true);
    } else if (action === "start-live-share") {
      setActivityView("live");
      setSidePanelOpen(true);
      setLiveStartRequest((current) => current + 1);
    } else if (action === "open-terminal") {
      setActivePanel("terminal");
      setBottomPanelOpen(true);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("action");
    window.history.replaceState(null, "", url);
  }, [searchParams]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(EDITOR_PREFERENCES_STORAGE_KEY);
      setEditorPreferences(
        stored
          ? normalizeEditorPreferences(JSON.parse(stored))
          : DEFAULT_EDITOR_PREFERENCES
      );
    } catch {
      setEditorPreferences(DEFAULT_EDITOR_PREFERENCES);
    } finally {
      setEditorPreferencesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!editorPreferencesLoaded) return;
    window.localStorage.setItem(
      EDITOR_PREFERENCES_STORAGE_KEY,
      JSON.stringify(editorPreferences)
    );
  }, [editorPreferences, editorPreferencesLoaded]);

  const activeFile = useMemo(
    () => files.find((file) => file.id === activeFileId) ?? files[0],
    [files, activeFileId]
  );
  const openFiles = useMemo(
    () => openFileIds.flatMap((id) => files.find((file) => file.id === id) ?? []),
    [files, openFileIds]
  );
  const code = activeFile?.content ?? "";
  const languageDefinition = getEditorLanguageDefinition(activeFile?.language ?? "text");
  const isMiniScriptRuntime = languageDefinition.runnable;
  const isCloudRuntime = activeFile ? isCloudRunnableLanguage(activeFile.language) : false;
  const isRunnable = isMiniScriptRuntime || isCloudRuntime;

  useEffect(() => {
    if (
      !pendingTerminalRun ||
      !bottomPanelOpen ||
      activePanel !== "terminal" ||
      !terminalRef.current
    ) {
      return;
    }

    setPendingTerminalRun(false);
    void terminalRef.current.runActiveFile();
  }, [activePanel, bottomPanelOpen, pendingTerminalRun]);
  const executionLine =
    errorLine ?? (program.length > 0 && !stopped && currentLine > 0 ? currentLine : null);
  const complexityAnalysis = useMemo<ComplexityAnalysis | null>(() => {
    if (!complexityEnabled) return null;
    return analyzeMiniScriptComplexity(code, locale);
  }, [code, locale, complexityEnabled]);
  const codeVisualization = useMemo(
    () => (isMiniScriptRuntime ? visualizeMiniScript(code) : { ast: "", flowchart: "" }),
    [code, isMiniScriptRuntime]
  );
  const fileName = activeFile?.name ?? "main.msp";
  const githubIdentity = useMemo(
    () => getGitHubIdentitySummary(user),
    [user]
  );
  const projectName = title.trim() || (locale === "ro" ? "Proiect fără titlu" : "Untitled project");
  const activeLiveRoomId = searchParams.get("live");
  const liveWorkspaceDocument = useMemo<LiveWorkspaceDocument>(
    () =>
      createLiveWorkspaceDocument({
        title: projectName,
        description,
        files,
        directories,
        activeFileId: activeFile?.id ?? null,
      }),
    [activeFile?.id, description, directories, files, projectName]
  );
  const applyRemoteLiveWorkspace = useCallback(
    (workspace: LiveWorkspaceDocument, source: "initial" | "remote") => {
      setTitle(workspace.title);
      setDescription(workspace.description);
      setFiles(workspace.files);
      setDirectories(workspace.directories);
      setActiveFileId((currentId) => {
        if (
          source === "remote" &&
          workspace.files.some((file) => file.id === currentId)
        ) {
          return currentId;
        }
        return workspace.activeFileId ?? workspace.files[0]?.id ?? null;
      });
      setOpenFileIds((currentIds) => {
        if (source === "remote") {
          const availableIds = new Set(workspace.files.map((file) => file.id));
          const retainedIds = currentIds.filter((id) => availableIds.has(id));
          if (retainedIds.length) return retainedIds;
        }
        return workspace.activeFileId
          ? [workspace.activeFileId]
          : workspace.files[0]
            ? [workspace.files[0].id]
            : [];
      });
      setProgram([]);
      setVariables({});
      setCurrentLine(0);
      setOutput([]);
      setStopped(false);
      setErrorLine(null);
      setInputVar(null);
      setInputValue("");
      setDirty(false);
      if (source === "initial") {
        if (!preserveProjectOnLiveLoadRef.current) setSavedId(null);
        preserveProjectOnLiveLoadRef.current = false;
      }
    },
    []
  );
  const liveCollaboration = useLiveWorkspaceCollaboration({
    roomId: activeLiveRoomId,
    userId: user?.id,
    document: liveWorkspaceDocument,
    onRemoteWorkspace: applyRemoteLiveWorkspace,
  });
  useEffect(() => {
    if (!liveCollaboration.error) {
      lastLiveErrorRef.current = null;
      return;
    }
    if (lastLiveErrorRef.current === liveCollaboration.error) return;
    lastLiveErrorRef.current = liveCollaboration.error;
    toast.error(
      locale === "ro"
        ? "Sesiunea Live Share nu a putut fi deschisă."
        : "The Live Share session could not be opened.",
      { description: liveCollaboration.error }
    );
  }, [liveCollaboration.error, locale]);
  const searchResults = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    if (!query) return [];
    return files
      .flatMap((file) =>
        file.content.split("\n").flatMap((line, index) =>
          line.toLowerCase().includes(query)
            ? [{ file, line: index + 1, preview: line.trim() || "…" }]
            : []
        )
      )
      .slice(0, 80);
  }, [files, projectSearch]);

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
      .select("id, title, description, code, files, is_public, created_at")
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
  const visibleProjects = useMemo(() => {
    const query = projectLibrarySearch.trim().toLowerCase();
    if (!query) return snippets;
    return snippets.filter((snippet) =>
      `${snippet.title} ${snippet.description}`.toLowerCase().includes(query)
    );
  }, [projectLibrarySearch, snippets]);

  const compile = useCallback(() => {
    if (!isMiniScriptRuntime) {
      toast.info(
        locale === "ro"
          ? `Execuția ${languageDefinition.label} este disponibilă în terminal.`
          : `${languageDefinition.label} execution is available in the terminal.`
      );
      return [];
    }

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
  }, [code, isMiniScriptRuntime, languageDefinition.label, locale]);

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
    if (!isMiniScriptRuntime) {
      compile();
      return;
    }
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
    if (isCloudRuntime) {
      setActivePanel("terminal");
      setBottomPanelOpen(true);
      setPendingTerminalRun(true);
      return;
    }
    if (!isMiniScriptRuntime) {
      return;
    }
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
    setDirty(true);
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

  async function saveSnippet(
    silent = false,
    snapshot?: { files: ProjectFile[]; directories: ProjectDirectory[] },
    visibilityOverride?: boolean
  ) {
    if (!user || saving) return;

    const filesToSave = snapshot?.files ?? files;
    const directoriesToSave = snapshot?.directories ?? directories;
    const primaryFile = getPrimaryFile(filesToSave);

    setSaving(true);

    const payload = {
      title,
      description,
      code: primaryFile?.content ?? "",
      files: serializeProjectEntries(filesToSave, directoriesToSave),
      is_public: visibilityOverride ?? projectIsPublic,
    };

    try {
      let persistedId: string | null = null;
      let persistenceError: ProjectPersistenceError | null = null;

      if (savedId) {
        const response = await supabase
          .from("snippets")
          .update(payload)
          .eq("id", savedId)
          .eq("user_id", user.id)
          .select("id")
          .maybeSingle();

        persistedId = response.data?.id ?? null;
        persistenceError = response.error;
      }

      // A project can remain mounted while the active account changes. When
      // RLS hides that old row, create a project owned by the current account
      // instead of treating the empty update result as a failed save.
      if (!persistedId && !persistenceError) {
        const response = await supabase
          .from("snippets")
          .insert([{ user_id: user.id, ...payload }])
          .select("id")
          .single();

        persistedId = response.data?.id ?? null;
        persistenceError = response.error;
      }

      if (!persistedId || persistenceError) {
        console.error("Failed to persist editor project", persistenceError);
        const backendMessage = persistenceError?.message?.trim();
        toast.error(t("editor.toast.snippetSaveError"), {
          description:
            backendMessage && process.env.NODE_ENV === "development"
              ? backendMessage
              : locale === "ro"
                ? "Verifică sesiunea și încearcă din nou. Modificările rămân în editor."
                : "Check your session and try again. Your changes remain in the editor.",
        });
        return;
      }

      if (!silent) toast.success(t("editor.toast.snippetSaved"));
      setDirty(false);
      setSavedId(persistedId);
      if (visibilityOverride !== undefined) {
        setProjectIsPublic(visibilityOverride);
      }

      await queryClient.invalidateQueries({
        queryKey: ["editor-snippets", user.id],
      });

      return persistedId;
    } finally {
      setSaving(false);
    }
  }

  async function handleShare(file?: ProjectFile) {
    const idToUse =
      !savedId || dirty || !projectIsPublic
        ? await saveSnippet(true, undefined, true)
        : savedId;
    if (!idToUse) return;

    const url = `${window.location.origin}/editor/${idToUse}${file ? `?file=${encodeURIComponent(file.id)}` : ""}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(
        file
          ? locale === "ro"
            ? "Linkul către fișier a fost copiat."
            : "File link copied."
          : t("editor.toast.copied")
      );
    } catch (error) {
      console.error("Failed to copy project share URL", error);
      toast.error(
        locale === "ro"
          ? "Linkul nu a putut fi copiat. Verifică permisiunea clipboard-ului."
          : "The link could not be copied. Check clipboard permissions."
      );
    }
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

  function createEditorFile(parentPath = "") {
    const extension = languageDefinition.extensions[0] ?? "txt";
    setNewFileName(`file-${files.length + 1}.${extension}`);
    setNewFileParentPath(parentPath);
    setNewFileError("");
    setCreateFileOpen(true);
  }

  function confirmCreateEditorFile() {
    const trimmedName = normalizeProjectPath(newFileName);
    const nextPath = normalizeProjectPath(
      newFileParentPath ? `${newFileParentPath}/${trimmedName}` : trimmedName
    );

    if (!trimmedName) {
      setNewFileError("File name is required");
      return;
    }

    if (!isValidProjectPath(nextPath)) {
      setNewFileError(
        locale === "ro"
          ? "Folosește o cale relativă validă, fără .. sau caractere speciale."
          : "Use a valid relative path without .. or special characters."
      );
      return;
    }

    if (files.some((file) => file.path === nextPath)) {
      setNewFileError("A file with this name already exists");
      return;
    }

    const nextFile = createProjectFile(nextPath);
    setFiles((currentFiles) => [...currentFiles, nextFile]);
    setActiveFileId(nextFile.id);
    setOpenFileIds((current) => [...current.filter((id) => id !== nextFile.id), nextFile.id]);
    setCreateFileOpen(false);
    setNewFileError("");
    setDirty(true);
    resetRuntimeState();
  }

  function createEditorDirectory(parentPath = "") {
    setNewDirectoryName("folder");
    setNewDirectoryParentPath(parentPath);
    setNewDirectoryError("");
    setCreateDirectoryOpen(true);
  }

  function confirmCreateEditorDirectory() {
    const name = normalizeProjectPath(newDirectoryName);
    const nextPath = normalizeProjectPath(
      newDirectoryParentPath ? `${newDirectoryParentPath}/${name}` : name
    );

    if (!isValidProjectPath(nextPath)) {
      setNewDirectoryError(
        locale === "ro" ? "Introdu un nume valid pentru director." : "Enter a valid folder name."
      );
      return;
    }
    if (directories.some((directory) => directory.path === nextPath)) {
      setNewDirectoryError(
        locale === "ro" ? "Directorul există deja." : "This folder already exists."
      );
      return;
    }

    setDirectories((current) => [...current, createProjectDirectory(nextPath)]);
    setCreateDirectoryOpen(false);
    setDirty(true);
  }

  async function collectGithubProjectFiles(target: GitHubRepoTarget, branch: string) {
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
          isSupportedGitHubTextPath(item.path) &&
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

      const githubFiles = await collectGithubProjectFiles(target, branch);

      if (githubFiles.length === 0) {
        toast.error(t("editor.githubImport.toast.noFiles"));
        return;
      }

      let totalBytes = 0;
      const usedPaths = new Set(files.map((file) => file.path));
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

        let importedPath = normalizeProjectPath(githubFile.path);
        if (usedPaths.has(importedPath)) {
          const baseName = getProjectBaseName(importedPath);
          const parentPath = getProjectParentPath(importedPath);
          const extensionIndex = baseName.lastIndexOf(".");
          const stem = extensionIndex >= 0 ? baseName.slice(0, extensionIndex) : baseName;
          const extension = extensionIndex >= 0 ? baseName.slice(extensionIndex) : "";
          let index = 2;
          do {
            const nextName = `${stem}-${index}${extension}`;
            importedPath = parentPath ? `${parentPath}/${nextName}` : nextName;
            index += 1;
          } while (usedPaths.has(importedPath));
        }
        usedPaths.add(importedPath);
        importedFiles.push(createProjectFile(importedPath, content));
      }

      setFiles((currentFiles) => [...currentFiles, ...importedFiles]);
      setActiveFileId(importedFiles[0]?.id ?? activeFileId);
      setOpenFileIds((current) => [
        ...current,
        ...importedFiles.map((file) => file.id).filter((id) => !current.includes(id)),
      ]);
      setGithubImportOpen(false);
      setGithubUrl("");
      setDirty(true);
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

  function openGitHubRepository(repositoryUrl?: string) {
    setGithubUrl(
      repositoryUrl ||
        (githubIdentity?.username
          ? `https://github.com/${githubIdentity.username}/`
          : "")
    );
    setGithubImportOpen(true);
  }

  async function applyGitHubRemoteFiles(remoteFiles: GitHubRemoteFile[]) {
    const nextFiles = remoteFiles.map((file) =>
      createProjectFile(file.path, file.content)
    );
    if (!nextFiles.length) {
      throw new Error(
        locale === "ro"
          ? "Repository-ul nu conține fișiere text acceptate."
          : "The repository has no supported text files."
      );
    }

    const nextDirectories = collectProjectDirectories(nextFiles, []);
    setFiles(nextFiles);
    setDirectories(nextDirectories);
    setActiveFileId(nextFiles[0]?.id ?? null);
    setOpenFileIds(nextFiles[0] ? [nextFiles[0].id] : []);
    setDirty(true);
    resetRuntimeState(true);

    const persistedId = await saveSnippet(true, {
      files: nextFiles,
      directories: nextDirectories,
    });
    if (!persistedId) {
      throw new Error(
        locale === "ro"
          ? "Fișierele au fost importate local, dar proiectul nu a putut fi salvat."
          : "Files were imported locally, but the project could not be saved."
      );
    }
    setDirty(false);
  }

  async function openClonedGitHubProject(projectId: string) {
    await queryClient.invalidateQueries({
      queryKey: ["editor-snippets", user?.id],
    });
    await loadSnippet(projectId);
    setGithubCloneOpen(false);
    setActivityView("source-control");
    setSidePanelOpen(true);

    const url = new URL(window.location.href);
    url.searchParams.delete("action");
    url.searchParams.set("view", "source-control");
    window.history.replaceState(null, "", url);
  }

  function renameEditorFile(fileId: string) {
    const file = files.find((item) => item.id === fileId);
    if (!file) return;
    setRenameFileId(fileId);
    setRenameFileName(file.path);
    setRenameFileError("");
  }

  function confirmRenameEditorFile(value: string) {
    if (!renameFileId) return;
    const currentFile = files.find((item) => item.id === renameFileId);
    const trimmedName = value.trim();

    if (!trimmedName) {
      setRenameFileError(locale === "ro" ? "Introdu un nume pentru fișier." : "Enter a file name.");
      return;
    }
    const nextPath = normalizeProjectPath(trimmedName);
    if (!isValidProjectPath(nextPath)) {
      setRenameFileError(
        locale === "ro" ? "Introdu o cale relativă validă." : "Enter a valid relative path."
      );
      return;
    }
    if (nextPath === currentFile?.path) {
      setRenameFileId(null);
      return;
    }
    if (files.some((item) => item.id !== renameFileId && item.path === nextPath)) {
      setRenameFileError(
        locale === "ro" ? "Există deja un fișier cu acest nume." : "A file with this name already exists."
      );
      return;
    }

    setFiles((currentFiles) =>
      currentFiles.map((item) =>
        item.id === renameFileId
          ? {
              ...item,
              name: getProjectBaseName(nextPath),
              path: nextPath,
              language: getEditorLanguage(nextPath),
            }
          : item
      )
    );
    setDirty(true);
    setRenameFileId(null);
  }

  function renameEditorDirectory(path: string) {
    setRenameDirectoryPath(path);
    setRenameDirectoryName(path);
    setRenameDirectoryError("");
  }

  function confirmRenameEditorDirectory(value: string) {
    if (!renameDirectoryPath) return;
    const nextPath = normalizeProjectPath(value);

    if (!isValidProjectPath(nextPath)) {
      setRenameDirectoryError(
        locale === "ro" ? "Introdu o cale validă pentru director." : "Enter a valid folder path."
      );
      return;
    }
    if (
      nextPath !== renameDirectoryPath &&
      directories.some((directory) => directory.path === nextPath)
    ) {
      setRenameDirectoryError(
        locale === "ro" ? "Directorul există deja." : "This folder already exists."
      );
      return;
    }

    const oldPrefix = `${renameDirectoryPath}/`;
    const nextPrefix = `${nextPath}/`;
    setDirectories((current) =>
      current.map((directory) =>
        directory.path === renameDirectoryPath || directory.path.startsWith(oldPrefix)
          ? createProjectDirectory(
              directory.path === renameDirectoryPath
                ? nextPath
                : `${nextPrefix}${directory.path.slice(oldPrefix.length)}`
            )
          : directory
      )
    );
    setFiles((current) =>
      current.map((file) => {
        if (!file.path.startsWith(oldPrefix)) return file;
        const path = `${nextPrefix}${file.path.slice(oldPrefix.length)}`;
        return { ...file, path, name: getProjectBaseName(path), language: getEditorLanguage(path) };
      })
    );
    setDirty(true);
    setRenameDirectoryPath(null);
  }

  function deleteEditorDirectory(path: string) {
    const prefix = `${path}/`;
    const nextFiles = files.filter((file) => !file.path.startsWith(prefix));
    const safeFiles = nextFiles.length ? nextFiles : [createProjectFile("main.msp")];
    setFiles(safeFiles);
    setOpenFileIds((current) => {
      const remaining = current.filter((id) => safeFiles.some((file) => file.id === id));
      return remaining.length ? remaining : [safeFiles[0].id];
    });
    setDirectories((current) =>
      current.filter((directory) => directory.path !== path && !directory.path.startsWith(prefix))
    );
    if (!safeFiles.some((file) => file.id === activeFileId)) {
      setActiveFileId(safeFiles[0]?.id ?? null);
    }
    resetRuntimeState();
    setDirty(true);
  }

  function requestDeleteFile(fileId: string) {
    const file = files.find((candidate) => candidate.id === fileId);
    if (!file) return;
    setPendingDelete({ kind: "file", id: file.id, label: file.path });
  }

  function requestDeleteDirectory(path: string) {
    setPendingDelete({ kind: "directory", path, label: path });
  }

  function requestDeleteProject(id: string, label: string) {
    setPendingDelete({ kind: "project", id, label });
  }

  function confirmPendingDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "file") deleteEditorFile(pendingDelete.id);
    else if (pendingDelete.kind === "directory") deleteEditorDirectory(pendingDelete.path);
    else void deleteSnippet(pendingDelete.id);
    setPendingDelete(null);
  }

  function deleteEditorFile(fileId: string) {
    if (files.length === 1) {
      toast.error("Project needs at least one file");
      return;
    }

    const nextFiles = files.filter((file) => file.id !== fileId);

    setFiles(nextFiles);
    setOpenFileIds((current) => current.filter((id) => id !== fileId));

    if (activeFileId === fileId) {
      setActiveFileId(nextFiles[0]?.id ?? null);
      resetRuntimeState();
    }
    setDirty(true);
  }

  function switchEditorFile(fileId: string) {
    setOpenFileIds((current) =>
      current.includes(fileId) ? current : [...current, fileId]
    );
    if (fileId === activeFileId) return;

    setActiveFileId(fileId);
    resetRuntimeState();
  }

  function closeEditorTab(fileId: string) {
    if (openFileIds.length <= 1) return;
    const index = openFileIds.indexOf(fileId);
    const nextOpenIds = openFileIds.filter((id) => id !== fileId);
    setOpenFileIds(nextOpenIds);

    if (activeFileId === fileId) {
      const nextId = nextOpenIds[Math.max(0, index - 1)] ?? nextOpenIds[0] ?? null;
      setActiveFileId(nextId);
      resetRuntimeState();
    }
  }

  function handleAnalyzeComplexity() {
    if (!isMiniScriptRuntime) {
      compile();
      return;
    }
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

    const nextProject = normalizeProjectEntries(data.files, data.code || "");
    const nextFiles = nextProject.files;

    setFiles(nextFiles);
    setDirectories(nextProject.directories);
    setActiveFileId(nextFiles[0]?.id ?? null);
    setOpenFileIds(nextFiles[0] ? [nextFiles[0].id] : []);
    setTitle(data.title || "");
    setDescription(data.description || "");
    setProjectIsPublic(data.is_public !== false);
    setSavedId(data.id);
    setDirty(false);
    resetRuntimeState(true);
  }

  function createNewProject(templateKey: ProjectTemplateKey) {
    const template = createProjectTemplate(templateKey);
    const nextFiles = template.files;

    setSavedId(null);
    setProjectIsPublic(true);
    setTitle(template.title);
    setDescription("");
    setFiles(nextFiles);
    setDirectories(template.directories);
    setActiveFileId(nextFiles[0]?.id ?? null);
    setOpenFileIds(nextFiles[0] ? [nextFiles[0].id] : []);
    setDirty(false);
    setNewProjectOpen(false);
    setActivityView("explorer");
    setSidePanelOpen(true);
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

  const metadataPanel = (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-foreground">
            {locale === "ro" ? "Proiectul curent" : "Current project"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {savedId
              ? locale === "ro" ? "Sincronizat cu contul tău" : "Synced with your account"
              : locale === "ro" ? "Proiect local nesalvat" : "Unsaved local project"}
          </p>
        </div>
        <span className={`size-2 rounded-full ${dirty ? "bg-amber-500" : savedId ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
      </div>
      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
            {locale === "ro" ? "Nume" : "Name"}
          </span>
          <Input
            className="h-8 text-xs"
            placeholder={t("editor.placeholderTitle")}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setDirty(true);
            }}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
            {locale === "ro" ? "Descriere" : "Description"}
          </span>
          <Input
            className="h-8 text-xs"
            placeholder={t("editor.placeholderDescription")}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setDirty(true);
            }}
          />
        </label>
      </div>
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

  const terminalPanel = (
    <EditorTerminal
      ref={terminalRef}
      activeFile={activeFile}
      files={files}
      locale={locale}
      onRunningChange={setRemoteRunning}
      projectName={projectName}
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
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
          <Workflow size={14} />
          {t("editor.visualization.title")}
        </div>
        <Tabs defaultValue="ast" className="gap-0">
          <TabsList className="grid h-10 w-full grid-cols-2 rounded-none border-b bg-muted/60 px-3">
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b p-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
          <Input
            value={projectLibrarySearch}
            onChange={(event) => setProjectLibrarySearch(event.target.value)}
            placeholder={locale === "ro" ? "Caută proiecte" : "Search projects"}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="flex h-8 shrink-0 items-center justify-between border-b px-3 text-[10px] font-medium text-muted-foreground">
        <span>{locale === "ro" ? "Salvate" : "Saved"}</span>
        <span>{visibleProjects.length}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {snippets.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <FileCode2 className="mx-auto text-muted-foreground/60" size={22} />
            <p className="mt-3 text-xs font-medium text-foreground">
              {locale === "ro" ? "Niciun proiect salvat" : "No saved projects"}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {locale === "ro"
                ? "Salvează proiectul curent pentru a-l găsi aici pe orice dispozitiv."
                : "Save the current project to find it here on any device."}
            </p>
          </div>
        ) : visibleProjects.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">
            {locale === "ro" ? "Niciun proiect nu corespunde căutării." : "No projects match your search."}
          </p>
        ) : (
          <div className="divide-y divide-border/70">
            {visibleProjects.map((snippet) => {
              const active = savedId === snippet.id;
              return (
                <div
                  key={snippet.id}
                  className={`group flex min-w-0 items-center gap-2 px-2 py-1.5 transition-colors ${
                    active ? "bg-muted" : "hover:bg-muted/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => loadSnippet(snippet.id)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground">
                      <FileCode2 size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-medium text-foreground">
                          {snippet.title || t("editor.snippets.untitled")}
                        </span>
                        {active && <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>{formatSnippetFileCount(getSnippetFileCount(snippet))}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">
                          {new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-US", {
                            day: "numeric",
                            month: "short",
                          }).format(new Date(snippet.created_at))}
                        </span>
                      </span>
                    </span>
                  </button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="shrink-0 text-muted-foreground opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={() =>
                      requestDeleteProject(
                        snippet.id,
                        snippet.title || t("editor.snippets.untitled")
                      )
                    }
                    aria-label={t("editor.snippets.delete")}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  function openLiveRoom(roomId: string, options?: { created?: boolean }) {
    preserveProjectOnLiveLoadRef.current = Boolean(options?.created);
    setActivityView("live");
    setSidePanelOpen(true);

    const url = new URL(window.location.href);
    url.pathname = "/editor";
    url.searchParams.set("live", roomId);
    url.searchParams.set("view", "live");
    window.history.pushState(null, "", url);
  }

  function leaveLiveRoom() {
    const url = new URL(window.location.href);
    url.searchParams.delete("live");
    url.searchParams.set("view", "live");
    window.history.pushState(null, "", url);
  }

  function requestLiveShare() {
    setActivityView("live");
    setSidePanelOpen(true);
    setLiveStartRequest((request) => request + 1);
  }

  function requestLiveInvite() {
    setActivityView("live");
    setSidePanelOpen(true);
    setLiveInviteRequest((request) => request + 1);
  }

  async function copyLiveShareLink() {
    try {
      await liveCollaboration.copyInviteLink();
      toast.success(
        locale === "ro"
          ? "Linkul Live Share a fost copiat."
          : "Live Share link copied."
      );
    } catch {
      toast.error(
        locale === "ro"
          ? "Linkul nu a putut fi copiat."
          : "The link could not be copied."
      );
    }
  }

  async function endLiveShare() {
    try {
      const closed = await liveCollaboration.closeSession();
      if (!closed) return;
      leaveLiveRoom();
      toast.success(
        locale === "ro" ? "Sesiunea Live Share s-a încheiat." : "Live Share ended."
      );
    } catch {
      toast.error(
        locale === "ro"
          ? "Sesiunea nu a putut fi încheiată."
          : "The session could not be ended."
      );
    }
  }

  const activityItems: Array<{
    id: EditorActivityView;
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: "explorer", label: locale === "ro" ? "Explorer" : "Explorer", icon: <Files size={19} /> },
    { id: "search", label: locale === "ro" ? "Caută" : "Search", icon: <Search size={19} /> },
    { id: "run", label: locale === "ro" ? "Rulează și depanează" : "Run and debug", icon: <Play size={19} /> },
    { id: "projects", label: locale === "ro" ? "Proiecte" : "Projects", icon: <ListTree size={19} /> },
    { id: "live", label: locale === "ro" ? "Colaborare live" : "Live collaboration", icon: <RadioTower size={19} /> },
    { id: "source-control", label: locale === "ro" ? "Controlul sursei" : "Source control", icon: <GitBranch size={19} /> },
  ];

  function selectActivityView(view: EditorActivityView) {
    if (activityView === view) {
      setSidePanelOpen((open) => !open);
      return;
    }
    setActivityView(view);
    setSidePanelOpen(true);

    const url = new URL(window.location.href);
    if (view === "live" || view === "source-control") {
      url.searchParams.set("view", view);
    }
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  }

  const sidePanelContent = (() => {
    if (activityView === "explorer") {
      return (
        <div className="h-full min-h-0" data-tour="editor-panel-explorer">
          <ProjectExplorer
            activeFileId={activeFile?.id ?? null}
            directories={directories}
            files={files}
            locale={locale}
            onDeleteDirectory={requestDeleteDirectory}
            onDeleteFile={requestDeleteFile}
            onDownloadFile={saveFile}
            onNewDirectory={createEditorDirectory}
            onNewFile={createEditorFile}
            onOpenFile={(id) => {
              switchEditorFile(id);
              if (compactLayout) setSidePanelOpen(false);
            }}
            onRenameDirectory={renameEditorDirectory}
            onRenameFile={renameEditorFile}
            onShareFile={(file) => void handleShare(file)}
          />
        </div>
      );
    }

    if (activityView === "search") {
      return (
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-9 shrink-0 items-center border-b px-3 text-xs font-semibold">
            {locale === "ro" ? "Caută în proiect" : "Search project"}
          </div>
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input
                value={projectSearch}
                onChange={(event) => setProjectSearch(event.target.value)}
                placeholder={locale === "ro" ? "Text în fișiere" : "Text in files"}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {!projectSearch.trim() ? (
              <p className="px-3 py-4 text-xs leading-relaxed text-muted-foreground">
                {locale === "ro"
                  ? "Caută simultan în toate fișierele proiectului."
                  : "Search across every file in the project."}
              </p>
            ) : searchResults.length ? (
              searchResults.map((result) => (
                <button
                  type="button"
                  key={`${result.file.id}:${result.line}`}
                  onClick={() => {
                    switchEditorFile(result.file.id);
                    if (compactLayout) setSidePanelOpen(false);
                    requestAnimationFrame(() => {
                      editorRef.current?.revealLineInCenter(result.line);
                      editorRef.current?.setPosition({ lineNumber: result.line, column: 1 });
                      editorRef.current?.focus();
                    });
                  }}
                  className="block w-full border-b border-border/60 px-3 py-2 text-left transition-colors hover:bg-muted/70"
                >
                  <span className="block truncate text-xs font-medium">{result.file.path}</span>
                  <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                    {result.line}: {result.preview}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                {locale === "ro" ? "Niciun rezultat." : "No results."}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (activityView === "run") {
      return (
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-9 shrink-0 items-center border-b px-3 text-xs font-semibold">
            {locale === "ro" ? "Rulează și depanează" : "Run and debug"}
          </div>
          <div className="space-y-4 overflow-y-auto p-3">
            <div>
              <p className="text-sm font-semibold">{languageDefinition.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {isMiniScriptRuntime
                  ? locale === "ro"
                    ? "Runtime-ul MiniScript+ este conectat la debugger, output și analiza de complexitate."
                    : "The MiniScript+ runtime is connected to the debugger, output and complexity analysis."
                  : isCloudRuntime
                    ? locale === "ro"
                      ? "Runtime izolat disponibil pentru fișierul activ. Rezultatele și intrarea programului sunt gestionate în terminal."
                      : "An isolated runtime is available for the active file. Program output and input are managed in the terminal."
                  : locale === "ro"
                    ? "Editarea Monaco este disponibilă, însă acest tip de fișier nu este executabil."
                    : "Monaco editing is available, but this file type is not executable."}
              </p>
            </div>
            <div className="grid gap-2">
              <Button onClick={handleRun} disabled={!isRunnable} className="justify-start gap-2">
                <Play size={15} />
                {locale === "ro" ? "Rulează fișierul activ" : "Run active file"}
              </Button>
              <Button variant="outline" onClick={handleStep} disabled={!isMiniScriptRuntime || stopped} className="justify-start gap-2">
                <StepForward size={15} />
                {locale === "ro" ? "Execută pas cu pas" : "Step through"}
              </Button>
              <Button variant="outline" onClick={handleAnalyzeComplexity} disabled={!isMiniScriptRuntime} className="justify-start gap-2">
                <Gauge size={15} />
                {locale === "ro" ? "Analizează complexitatea" : "Analyze complexity"}
              </Button>
            </div>
            {!isMiniScriptRuntime && (
              <div className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                {locale === "ro"
                  ? "Salvarea, proiectele, directoarele, căutarea și distribuirea funcționează pentru toate limbajele."
                  : "Saving, projects, folders, search and sharing work for every language."}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activityView === "projects") {
      return (
        <div className="flex h-full min-h-0 flex-col" data-tour="editor-panel-projects">
          <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
            <div>
              <span className="block text-xs font-semibold">{locale === "ro" ? "Proiecte" : "Projects"}</span>
              <span className="block text-[10px] text-muted-foreground">
                {locale === "ro" ? "Biblioteca ta de cod" : "Your code library"}
              </span>
            </div>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              onClick={() => setNewProjectOpen(true)}
              aria-label={locale === "ro" ? "Proiect nou" : "New project"}
            >
              <Plus size={14} />
            </Button>
          </div>
          <div className="shrink-0 border-b">
            {metadataPanel}
          </div>
          <div className="min-h-0 flex-1">{snippetsPanel}</div>
        </div>
      );
    }

    if (activityView === "live") {
      return (
        <LiveSessionsPanel
          workspace={liveWorkspaceDocument}
          activeRoomId={activeLiveRoomId}
          activeRoomName={liveCollaboration.room?.name}
          activeRoomStatus={liveCollaboration.status}
          activeParticipantCount={liveCollaboration.participantCount}
          activeRoomIsOwner={liveCollaboration.isOwner}
          startRequest={liveStartRequest}
          inviteRequest={liveInviteRequest}
          onInviteRequestHandled={() => setLiveInviteRequest(0)}
          onOpenRoom={openLiveRoom}
          onCopyActiveRoom={() => void copyLiveShareLink()}
          onEndActiveRoom={() => void endLiveShare()}
          onLeaveActiveRoom={leaveLiveRoom}
        />
      );
    }

    if (activityView === "settings") {
      return (
        <EditorSettingsPanel
          locale={locale}
          preferences={editorPreferences}
          onChange={setEditorPreferences}
        />
      );
    }

    return (
      <GitHubSourceControlPanel
        dirty={dirty}
        files={files}
        locale={locale}
        projectId={savedId}
        userId={user?.id ?? null}
        onApplyRemote={applyGitHubRemoteFiles}
        onCommitted={() => setDirty(false)}
        onEnsureProjectSaved={() => saveSnippet(true)}
        onOpenPublicImport={() => openGitHubRepository()}
      />
    );
  })();

  const editorTabs = (
    <div className="flex h-9 shrink-0 items-center overflow-x-auto border-b bg-muted/30 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {openFiles.map((file) => {
        const active = file.id === activeFile?.id;
        return (
          <ContextMenu key={file.id}>
            <ContextMenuTrigger asChild>
              <div
                className={`flex h-full min-w-0 shrink-0 items-center border-r text-xs transition-colors ${
                  active
                    ? "border-t-2 border-t-foreground bg-background text-foreground"
                    : "border-t-2 border-t-transparent bg-muted/30 text-muted-foreground hover:bg-muted/70"
                }`}
              >
                <button
                  type="button"
                  onClick={() => switchEditorFile(file.id)}
                  onDoubleClick={() => renameEditorFile(file.id)}
                  className="max-w-[190px] truncate px-3"
                  title={file.path}
                >
                  {file.name}
                </button>
                <button
                  type="button"
                  onClick={() => closeEditorTab(file.id)}
                  className="mr-1 grid size-6 place-items-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Close ${file.name}`}
                >
                  <X size={12} />
                </button>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-52">
              <ContextMenuLabel className="truncate">{file.path}</ContextMenuLabel>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => renameEditorFile(file.id)}><Pencil size={14} />{locale === "ro" ? "Redenumește" : "Rename"}</ContextMenuItem>
              <ContextMenuItem onSelect={() => void handleShare(file)}><Share2 size={14} />{locale === "ro" ? "Distribuie fișierul" : "Share file"}</ContextMenuItem>
              <ContextMenuItem onSelect={() => saveFile(file)}><FileDown size={14} />{locale === "ro" ? "Descarcă" : "Download"}</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem variant="destructive" disabled={files.length === 1} onSelect={() => requestDeleteFile(file.id)}><Trash2 size={14} />{locale === "ro" ? "Șterge" : "Delete"}</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
      <button
        type="button"
        onClick={() => createEditorFile(getProjectParentPath(activeFile?.path ?? ""))}
        className="grid size-8 shrink-0 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={locale === "ro" ? "Fișier nou" : "New file"}
      >
        <Plus size={14} />
      </button>
    </div>
  );

  const bottomTools = (
    <Tabs value={activePanel} onValueChange={setActivePanel} className="flex h-full min-h-0 flex-col gap-0 bg-background">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-2">
        <TabsList variant="line" className="h-8 justify-start bg-transparent p-0">
          <TabsTrigger value="console" className="h-8 px-2 text-xs">{locale === "ro" ? "Output" : "Output"}</TabsTrigger>
          <TabsTrigger value="terminal" className="h-8 px-2 text-xs">{locale === "ro" ? "Terminal" : "Terminal"}</TabsTrigger>
          <TabsTrigger value="debugger" className="h-8 px-2 text-xs">{locale === "ro" ? "Debugger" : "Debugger"}</TabsTrigger>
          <TabsTrigger value="analysis" className="h-8 px-2 text-xs">{locale === "ro" ? "Complexitate" : "Complexity"}</TabsTrigger>
          <TabsTrigger
            value="visual"
            className="h-8 px-2 text-xs"
            data-tour="editor-visualize"
          >
            {locale === "ro" ? "Structură" : "Structure"}
          </TabsTrigger>
        </TabsList>
        <button
          type="button"
          onClick={() => setBottomPanelOpen(false)}
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={locale === "ro" ? "Închide panoul" : "Close panel"}
        >
          <ChevronDown size={14} />
        </button>
      </div>
      <TabsContent value="console" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">{consolePanel}</TabsContent>
      <TabsContent value="terminal" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">{terminalPanel}</TabsContent>
      <TabsContent value="debugger" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">{debuggerPanel}</TabsContent>
      <TabsContent value="analysis" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">{analysisPanel}</TabsContent>
      <TabsContent value="visual" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">{visualizationPanel}</TabsContent>
    </Tabs>
  );

  return (
    <div data-tour="editor-workspace" className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <TooltipProvider>
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
          <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b bg-background px-3">
            <div className="flex min-w-0 items-center">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5 text-sm">
                  <span className="hidden font-medium text-muted-foreground sm:inline">ScripticX</span>
                  <span className="hidden text-muted-foreground sm:inline">/</span>
                  <span className="truncate font-semibold">{projectName}</span>
                  <span className="hidden shrink-0 items-center gap-1.5 text-[11px] font-normal text-muted-foreground lg:inline-flex">
                    <span className={`size-1.5 rounded-full ${dirty ? "bg-amber-500" : "bg-emerald-500"}`} />
                    {dirty
                      ? locale === "ro" ? "Nesalvat" : "Unsaved"
                      : savedId
                        ? locale === "ro" ? "Salvat" : "Saved"
                        : locale === "ro" ? "Local" : "Local"}
                  </span>
                </div>
                <p className="hidden truncate text-[11px] text-muted-foreground md:block">
                  {activeFile?.path ?? fileName}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {activeLiveRoomId ? (
                <div className="flex items-center rounded-md border bg-background p-0.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    data-tour="editor-live-share"
                    onClick={() => selectActivityView("live")}
                    className="h-7 gap-1.5 px-2 text-emerald-700 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-400"
                    aria-label={
                      locale === "ro"
                        ? "Deschide colaborarea Live Share"
                        : "Open Live Share collaboration"
                    }
                  >
                    <span className="relative flex size-2">
                      {liveCollaboration.status === "connected" ? (
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-50" />
                      ) : null}
                      <span
                        className={`relative inline-flex size-2 rounded-full ${
                          liveCollaboration.status === "connected"
                            ? "bg-emerald-500"
                            : liveCollaboration.status === "error"
                              ? "bg-destructive"
                              : "bg-amber-500"
                        }`}
                      />
                    </span>
                    <span className="hidden md:inline">Live Share</span>
                    <span className="text-[10px] text-muted-foreground">
                      {liveCollaboration.participantCount}
                    </span>
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => void copyLiveShareLink()}
                        aria-label={locale === "ro" ? "Copiază invitația" : "Copy invitation"}
                      >
                        <Link2 size={13} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{locale === "ro" ? "Copiază linkul" : "Copy link"}</TooltipContent>
                  </Tooltip>
                  {liveCollaboration.isOwner ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={requestLiveInvite}
                          aria-label={locale === "ro" ? "Invită persoane" : "Invite people"}
                        >
                          <UserPlus size={13} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {locale === "ro" ? "Invită persoane" : "Invite people"}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  {liveCollaboration.isOwner && liveCollaboration.status === "connected" ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => void endLiveShare()}
                          aria-label={locale === "ro" ? "Încheie Live Share" : "End Live Share"}
                        >
                          <Square className="fill-current" size={11} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{locale === "ro" ? "Încheie sesiunea" : "End session"}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={leaveLiveRoom}
                          aria-label={locale === "ro" ? "Părăsește Live Share" : "Leave Live Share"}
                        >
                          <X size={13} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{locale === "ro" ? "Părăsește sesiunea" : "Leave session"}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  data-tour="editor-live-share"
                  onClick={requestLiveShare}
                  className="h-8 gap-1.5 px-2.5"
                >
                  <RadioTower size={14} />
                  <span className="hidden lg:inline">
                    {locale === "ro" ? "Pornește Live Share" : "Start Live Share"}
                  </span>
                </Button>
              )}
              {isRunnable && (
                <Button size="sm" onClick={handleRun} disabled={(isRunning && !stopped) || remoteRunning} className="h-8 gap-1.5 px-3" data-tour="editor-run">
                  <Play size={14} />
                  <span className="hidden sm:inline">{locale === "ro" ? "Rulează" : "Run"}</span>
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={handleSaveFile}
                    aria-label={locale === "ro" ? "Descarcă fișierul" : "Download file"}
                  >
                    <FileDown size={15} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{locale === "ro" ? "Descarcă fișierul" : "Download file"}</TooltipContent>
              </Tooltip>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void saveSnippet(false)}
                disabled={saving}
                className="h-8 gap-1.5 px-2.5"
              >
                <Save size={14} />
                <span className="hidden md:inline">
                  {saving
                    ? locale === "ro" ? "Se salvează" : "Saving"
                    : savedId
                      ? locale === "ro" ? "Actualizează" : "Update"
                      : locale === "ro" ? "Salvează" : "Save"}
                </span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleShare()}
                className="h-8 gap-1.5 px-2.5"
              >
                <Share2 size={14} />
                <span className="hidden md:inline">{locale === "ro" ? "Distribuie" : "Share"}</span>
              </Button>
            </div>
          </header>

          <div className="relative flex min-h-0 flex-1">
            <nav
              className="flex w-12 shrink-0 flex-col items-center justify-between border-r bg-muted/20 py-1.5"
              data-tour="editor-activity-bar"
            >
              <div className="flex w-full flex-col items-center gap-0.5">
                {activityItems.map((item) => (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-tour={`editor-activity-${item.id}`}
                        onClick={() => selectActivityView(item.id)}
                        className={`relative grid size-10 place-items-center rounded-md transition-colors ${
                          activityView === item.id && sidePanelOpen
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        }`}
                        aria-label={item.label}
                        aria-pressed={activityView === item.id && sidePanelOpen}
                      >
                        {activityView === item.id && sidePanelOpen && (
                          <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-foreground" />
                        )}
                        {item.icon}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    data-tour="editor-activity-settings"
                    onClick={() => selectActivityView("settings")}
                    className={`relative grid size-10 place-items-center rounded-md transition-colors ${
                      activityView === "settings" && sidePanelOpen
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    aria-label={locale === "ro" ? "Setările editorului" : "Editor settings"}
                    aria-pressed={activityView === "settings" && sidePanelOpen}
                  >
                    {activityView === "settings" && sidePanelOpen && (
                      <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-foreground" />
                    )}
                    <Settings2 size={18} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{locale === "ro" ? "Setările editorului" : "Editor settings"}</TooltipContent>
              </Tooltip>
            </nav>

            {compactLayout && sidePanelOpen && (
              <aside className="absolute inset-y-0 left-12 z-30 w-[min(78vw,310px)] overflow-hidden border-r bg-background shadow-xl">
                {sidePanelContent}
              </aside>
            )}

            <ResizablePanelGroup orientation="horizontal" className="min-w-0 flex-1">
              {!compactLayout && sidePanelOpen && (
                <>
                  <ResizablePanel id="editor-sidebar" defaultSize="19%" minSize="200px" maxSize="380px">
                    <aside className="h-full min-h-0 overflow-hidden bg-background">
                      {sidePanelContent}
                    </aside>
                  </ResizablePanel>
                  <ResizableHandle
                    withHandle
                    aria-label={
                      locale === "ro"
                        ? "Redimensionează bara laterală"
                        : "Resize editor sidebar"
                    }
                    title={
                      locale === "ro"
                        ? "Trage pentru a redimensiona bara laterală"
                        : "Drag to resize the sidebar"
                    }
                    className="group z-20 w-[3px] cursor-col-resize bg-border/80 transition-colors duration-150 after:w-4 hover:bg-muted-foreground/40 focus-visible:bg-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/50 data-[separator=active]:bg-foreground/45 [&>div]:h-10 [&>div]:w-1 [&>div]:bg-muted-foreground/45 [&>div]:shadow-sm [&>div]:transition-colors group-hover:[&>div]:bg-foreground/65 data-[separator=active]:[&>div]:bg-foreground/80"
                  />
                </>
              )}

              <ResizablePanel id="editor-main" defaultSize={!compactLayout && sidePanelOpen ? "81%" : "100%"} minSize="260px">
                <div className="flex h-full min-h-0 min-w-0 flex-col">
                  <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
                    <ResizablePanel id="editor-surface" defaultSize={bottomPanelOpen ? "72%" : "100%"} minSize="240px">
                      <main className="flex h-full min-h-0 min-w-0 flex-col bg-background">
                        {editorTabs}
                        <CodeEditorContextMenu
                          code={code}
                          fileName={activeFile?.path ?? fileName}
                          onChange={handleCodeChange}
                          onRun={isRunnable ? handleRun : undefined}
                        >
                          <div data-tour="editor-code" className="min-h-0 flex-1 overflow-hidden">
                            <MiniScriptMonacoEditor
                              key={activeFile?.id}
                              onMount={handleEditorMount}
                              height="100%"
                              language={activeFile?.language ?? "text"}
                              path={activeFile?.path ?? fileName}
                              value={code}
                              onChange={handleCodeChange}
                              options={{
                                contextmenu: false,
                                padding: { top: 14, bottom: 20 },
                                smoothScrolling: true,
                                wordWrap: editorPreferences.wordWrap ? "on" : "off",
                                automaticLayout: true,
                                cursorSmoothCaretAnimation: "on",
                                cursorBlinking: "smooth",
                                glyphMargin: isMiniScriptRuntime,
                                fontSize: editorPreferences.fontSize,
                                fontLigatures: editorPreferences.fontLigatures,
                                minimap: {
                                  enabled: editorPreferences.minimap,
                                  maxColumn: 90,
                                  showSlider: "mouseover",
                                  scale: 0.8,
                                },
                                stickyScroll: { enabled: editorPreferences.stickyScroll },
                                bracketPairColorization: {
                                  enabled: editorPreferences.bracketPairColorization,
                                },
                                guides: {
                                  bracketPairs: editorPreferences.bracketPairColorization,
                                  indentation: true,
                                },
                                formatOnPaste: editorPreferences.formatOnPaste,
                                formatOnType: editorPreferences.formatOnType,
                                quickSuggestions: editorPreferences.autoCompletion && editorPreferences.quickSuggestions
                                  ? { other: true, comments: false, strings: false }
                                  : false,
                                quickSuggestionsDelay: 60,
                                suggestOnTriggerCharacters: editorPreferences.autoCompletion,
                                snippetSuggestions: editorPreferences.autoCompletion ? "top" : "none",
                                wordBasedSuggestions: editorPreferences.autoCompletion ? "currentDocument" : "off",
                                suggest: {
                                  preview: editorPreferences.autoCompletion && editorPreferences.inlineSuggestions,
                                  showSnippets: editorPreferences.autoCompletion,
                                },
                                inlineSuggest: {
                                  enabled: editorPreferences.autoCompletion && editorPreferences.inlineSuggestions,
                                },
                                parameterHints: {
                                  enabled: editorPreferences.autoCompletion && editorPreferences.parameterHints,
                                  cycle: true,
                                },
                                acceptSuggestionOnEnter: "on",
                                scrollbar: {
                                  verticalScrollbarSize: 9,
                                  horizontalScrollbarSize: 9,
                                },
                                tabSize: editorPreferences.tabSize,
                                insertSpaces: true,
                                wrappingIndent: "same",
                              }}
                            />
                          </div>
                        </CodeEditorContextMenu>
                      </main>
                    </ResizablePanel>

                    {bottomPanelOpen && (
                      <>
                        <ResizableHandle />
                        <ResizablePanel id="editor-bottom-panel" defaultSize="28%" minSize="140px" maxSize="58%">
                          {bottomTools}
                        </ResizablePanel>
                      </>
                    )}
                  </ResizablePanelGroup>

                  <footer className="flex h-7 shrink-0 items-center justify-between border-t bg-muted/40 px-3 text-[11px] text-muted-foreground">
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        data-tour="editor-terminal"
                        onClick={() => {
                          setActivePanel("terminal");
                          setBottomPanelOpen(true);
                        }}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <Terminal size={12} />
                        {locale === "ro" ? "Terminal" : "Terminal"}
                      </button>
                      <span className="hidden truncate sm:inline">{projectName}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span>Ln {editorLine}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditorPreferences((current) => ({
                            ...current,
                            tabSize: current.tabSize === 2 ? 4 : current.tabSize === 4 ? 8 : 2,
                          }))
                        }
                        className="hover:text-foreground"
                        title={locale === "ro" ? "Schimbă dimensiunea tabului" : "Change tab size"}
                      >
                        {editorPreferences.tabSize} {locale === "ro" ? "spații" : "spaces"}
                      </button>
                      <span>{languageDefinition.label}</span>
                    </div>
                  </footer>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>

      </TooltipProvider>

      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {locale === "ro" ? "Creează un proiect" : "Create a project"}
            </DialogTitle>
            <DialogDescription>
              {locale === "ro"
                ? "Alege structura de pornire. Poți adăuga, muta și redenumi fișierele după creare."
                : "Choose a starting structure. You can add, move and rename files afterwards."}
            </DialogDescription>
          </DialogHeader>

          <div className="divide-y rounded-[var(--sx-radius-card)] border">
            {([
              {
                id: "msp" as const,
                title: "MiniScript+",
                detail: locale === "ro" ? "main.msp, README și runtime integrat" : "main.msp, README and integrated runtime",
              },
              {
                id: "python" as const,
                title: "Python",
                detail: locale === "ro" ? "src, tests, requirements și configurare venv-ready" : "src, tests, requirements and a venv-ready structure",
              },
              {
                id: "cpp" as const,
                title: "C++",
                detail: locale === "ro" ? "src, include și CMakeLists.txt" : "src, include and CMakeLists.txt",
              },
            ]).map((template) => (
              <button
                type="button"
                key={template.id}
                onClick={() => createNewProject(template.id)}
                disabled={dirty}
                className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors first:rounded-t-[var(--sx-radius-card)] last:rounded-b-[var(--sx-radius-card)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground">
                  <FileCode2 size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{template.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{template.detail}</span>
                </span>
                <ChevronDown className="-rotate-90 text-muted-foreground" size={15} />
              </button>
            ))}
          </div>

          <div className="grid gap-2 border-t pt-4 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-auto justify-start gap-3 px-3 py-3 text-left"
              disabled={dirty}
              onClick={() => {
                setNewProjectOpen(false);
                setGithubCloneOpen(true);
              }}
            >
              <GitHubIcon size={17} />
              <span>
                <span className="block text-sm font-medium">
                  {locale === "ro" ? "Clonează din GitHub" : "Clone from GitHub"}
                </span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {locale === "ro" ? "Repository conectat cu pull și push" : "Connected repository with pull and push"}
                </span>
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto justify-start gap-3 px-3 py-3 text-left"
              disabled={dirty}
              onClick={() => {
                setNewProjectOpen(false);
                setActivityView("projects");
                setSidePanelOpen(true);
              }}
            >
              <ListTree size={17} />
              <span>
                <span className="block text-sm font-medium">
                  {locale === "ro" ? "Proiectele contului" : "Account projects"}
                </span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {locale === "ro" ? "Deschide un proiect ScripticX salvat" : "Open a saved ScripticX project"}
                </span>
              </span>
            </Button>
          </div>

          {dirty && (
            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {locale === "ro"
                  ? "Salvează modificările înainte să schimbi proiectul."
                  : "Save your changes before switching projects."}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void saveSnippet(false)}
              >
                <Save size={13} />
                {locale === "ro" ? "Salvează" : "Save"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <GitHubCloneDialog
        dirty={dirty}
        locale={locale}
        open={githubCloneOpen}
        onOpenChange={setGithubCloneOpen}
        onCloned={openClonedGitHubProject}
        onOpenPublicImport={() => openGitHubRepository()}
        onSaveCurrent={() => saveSnippet(false)}
      />

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
              className="flex items-center gap-2 text-sm font-medium text-foreground"
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
            <p className="text-xs text-muted-foreground">
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
            <DialogTitle>{locale === "ro" ? "Fișier nou" : "Create file"}</DialogTitle>
            <DialogDescription>
              {newFileParentPath
                ? locale === "ro"
                  ? `Fișierul va fi creat în ${newFileParentPath}.`
                  : `The file will be created in ${newFileParentPath}.`
                : locale === "ro"
                  ? "Adaugă un fișier sau o cale nouă în proiect."
                  : "Add a new file or relative path to this project."}
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
              className="text-sm font-medium text-foreground"
            >
              {locale === "ro" ? "Nume sau cale" : "Name or path"}
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
              <p className="text-xs text-red-600 dark:text-red-400">{newFileError}</p>
            )}
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateFileOpen(false)}
            >
              {locale === "ro" ? "Anulează" : "Cancel"}
            </Button>
            <Button type="button" onClick={confirmCreateEditorFile}>
              {locale === "ro" ? "Creează fișierul" : "Create file"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDirectoryOpen} onOpenChange={setCreateDirectoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{locale === "ro" ? "Director nou" : "Create folder"}</DialogTitle>
            <DialogDescription>
              {newDirectoryParentPath
                ? locale === "ro"
                  ? `Directorul va fi creat în ${newDirectoryParentPath}.`
                  : `The folder will be created in ${newDirectoryParentPath}.`
                : locale === "ro"
                  ? "Directoarele goale sunt salvate împreună cu proiectul."
                  : "Empty folders are saved with the project."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              confirmCreateEditorDirectory();
            }}
          >
            <label htmlFor="editor-new-folder-name" className="text-sm font-medium text-foreground">
              {locale === "ro" ? "Numele directorului" : "Folder name"}
            </label>
            <Input
              id="editor-new-folder-name"
              autoFocus
              value={newDirectoryName}
              onChange={(event) => {
                setNewDirectoryName(event.target.value);
                setNewDirectoryError("");
              }}
              placeholder="src"
            />
            {newDirectoryError && (
              <p className="text-xs text-red-600 dark:text-red-400">{newDirectoryError}</p>
            )}
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateDirectoryOpen(false)}>
              {locale === "ro" ? "Anulează" : "Cancel"}
            </Button>
            <Button type="button" onClick={confirmCreateEditorDirectory}>
              {locale === "ro" ? "Creează directorul" : "Create folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PromptDialog
        open={Boolean(renameFileId)}
        onOpenChange={(open) => {
          if (!open) setRenameFileId(null);
        }}
        title={locale === "ro" ? "Redenumește fișierul" : "Rename file"}
        description={locale === "ro" ? "Poți muta fișierul schimbând calea relativă." : "You can move the file by changing its relative path."}
        label={locale === "ro" ? "Calea fișierului" : "File path"}
        value={renameFileName}
        onValueChange={(value) => {
          setRenameFileName(value);
          setRenameFileError("");
        }}
        onConfirm={confirmRenameEditorFile}
        error={renameFileError}
        cancelLabel={locale === "ro" ? "Anulează" : "Cancel"}
        confirmLabel={locale === "ro" ? "Salvează" : "Save"}
      />

      <PromptDialog
        open={Boolean(renameDirectoryPath)}
        onOpenChange={(open) => {
          if (!open) setRenameDirectoryPath(null);
        }}
        title={locale === "ro" ? "Redenumește directorul" : "Rename folder"}
        description={locale === "ro" ? "Fișierele și subdirectoarele vor fi mutate automat." : "Files and nested folders will move automatically."}
        label={locale === "ro" ? "Calea directorului" : "Folder path"}
        value={renameDirectoryName}
        onValueChange={(value) => {
          setRenameDirectoryName(value);
          setRenameDirectoryError("");
        }}
        onConfirm={confirmRenameEditorDirectory}
        error={renameDirectoryError}
        cancelLabel={locale === "ro" ? "Anulează" : "Cancel"}
        confirmLabel={locale === "ro" ? "Salvează" : "Save"}
      />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.kind === "directory"
                ? locale === "ro" ? "Ștergi directorul?" : "Delete this folder?"
                : pendingDelete?.kind === "project"
                  ? locale === "ro" ? "Ștergi proiectul?" : "Delete this project?"
                  : locale === "ro" ? "Ștergi fișierul?" : "Delete this file?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === "directory"
                ? locale === "ro"
                  ? `Tot conținutul din „${pendingDelete.label}” va fi eliminat din proiect.`
                  : `Everything inside “${pendingDelete.label}” will be removed from the project.`
                : pendingDelete?.kind === "project"
                  ? locale === "ro"
                    ? `„${pendingDelete.label}” și toate fișierele sale vor fi șterse definitiv.`
                    : `“${pendingDelete.label}” and all of its files will be permanently deleted.`
                : locale === "ro"
                  ? `„${pendingDelete?.label ?? ""}” va fi eliminat din proiect.`
                  : `“${pendingDelete?.label ?? ""}” will be removed from the project.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{locale === "ro" ? "Anulează" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmPendingDelete}>
              {locale === "ro" ? "Șterge" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
