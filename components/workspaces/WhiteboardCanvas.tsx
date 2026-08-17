"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  LoaderCircle,
  RefreshCw,
  Save,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import "@excalidraw/excalidraw/index.css";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import {
  QuickGraphPopover,
  type QuickGraphDefinition,
} from "@/components/workspaces/QuickGraphPopover";
import { WhiteboardLibraryTrigger } from "@/components/workspaces/WhiteboardLibrary";
import { useAuth } from "@/hooks/useAuth";
import {
  persistWorkspaceWhiteboard,
  synchronizeStudentWorkspace,
} from "@/lib/workspace-cloud";
import {
  consumeQueuedGraphForWhiteboard,
  getActiveWhiteboardId,
  getWhiteboardDocument,
  getQueuedGraphForWhiteboard,
  getWhiteboard,
  saveWhiteboard,
  setActiveWhiteboardId,
  updateWhiteboard,
  type WorkspaceJsonObject,
} from "@/lib/workspace-storage";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

function configureExcalidrawAssetPath() {
  if (typeof window !== "undefined") {
    window.EXCALIDRAW_ASSET_PATH = "/excalidraw/";
  }
}

const Excalidraw = dynamic(
  async () => {
    configureExcalidrawAssetPath();
    const excalidrawModule = await import("@excalidraw/excalidraw");
    return excalidrawModule.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-0 w-full items-center justify-center bg-muted/20">
        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string | string[];
  }
}

const copy = {
  en: {
    back: "Student workspace",
    export: "Export PNG",
    graphAdded: "Graph added to the whiteboard",
    loadError: "The whiteboard could not be loaded.",
    loading: "Loading your whiteboard…",
    localOnly: "Saved locally",
    retry: "Try again",
    save: "Save now",
    saved: "Saved",
    saveError: "The whiteboard could not be saved.",
    saving: "Saving…",
    title: "Whiteboard",
  },
  ro: {
    back: "Workspace elev",
    export: "Exportă PNG",
    graphAdded: "Graful a fost adăugat în whiteboard",
    loadError: "Whiteboard-ul nu a putut fi încărcat.",
    loading: "Se încarcă whiteboard-ul…",
    localOnly: "Salvat local",
    retry: "Încearcă din nou",
    save: "Salvează acum",
    saved: "Salvat",
    saveError: "Whiteboard-ul nu a putut fi salvat.",
    saving: "Se salvează…",
    title: "Whiteboard",
  },
} as const;

type QueuedGraphNode = {
  id: string;
  index?: number;
  label: string;
  position?: { x: number; y: number } | null;
};

type QueuedGraphEdge = {
  id?: string;
  source: string;
  target: string;
};

type QueuedGraph = {
  createdAt: string;
  directed: boolean;
  edges: QueuedGraphEdge[];
  id: string;
  nodes: QueuedGraphNode[];
  title?: string;
};

type WhiteboardScene = {
  appState: Partial<AppState>;
  elements: ExcalidrawElement[];
  files: BinaryFiles;
  updatedAt: string;
};

type PersistedWhiteboard = {
  appState?: Partial<AppState> | null;
  elements?: unknown[] | null;
  files?: BinaryFiles | null;
  pendingGraph?: unknown;
  queuedGraph?: unknown;
};

const SAVE_DEBOUNCE_MS = 900;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finitePosition(value: unknown): { x: number; y: number } | null {
  if (!isRecord(value)) return null;
  const x = Number(value.x);
  const y = Number(value.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function normalizeQueuedGraph(value: unknown): QueuedGraph | null {
  const candidate =
    isRecord(value) && isRecord(value.payload) ? value.payload : value;
  if (!isRecord(candidate)) return null;

  const nodes = Array.isArray(candidate.nodes)
    ? candidate.nodes.flatMap((node, index): QueuedGraphNode[] => {
        if (!isRecord(node)) return [];
        const id = typeof node.id === "string" ? node.id : `n${index}`;
        const label =
          typeof node.label === "string" && node.label.trim()
            ? node.label.trim()
            : id;
        return [
          {
            id,
            index: typeof node.index === "number" ? node.index : index,
            label,
            position: finitePosition(node.position),
          },
        ];
      })
    : [];
  const knownNodeIds = new Set(nodes.map((node) => node.id));
  const edges = Array.isArray(candidate.edges)
    ? candidate.edges.flatMap((edge, index): QueuedGraphEdge[] => {
        if (!isRecord(edge)) return [];
        const source = typeof edge.source === "string" ? edge.source : "";
        const target = typeof edge.target === "string" ? edge.target : "";
        if (!knownNodeIds.has(source) || !knownNodeIds.has(target)) return [];
        return [
          {
            id: typeof edge.id === "string" ? edge.id : `e${index}`,
            source,
            target,
          },
        ];
      })
    : [];

  if (nodes.length === 0) return null;

  return {
    createdAt:
      typeof candidate.createdAt === "string"
        ? candidate.createdAt
        : "legacy",
    directed: candidate.directed === true,
    edges,
    id:
      typeof candidate.id === "string" && candidate.id
        ? candidate.id
        : `graph-${Date.now()}`,
    nodes,
    title: typeof candidate.title === "string" ? candidate.title : undefined,
  };
}

function persistedAppState(appState: AppState): Partial<AppState> {
  return {
    exportBackground: appState.exportBackground,
    exportScale: appState.exportScale,
    exportWithDarkMode: appState.exportWithDarkMode,
    gridModeEnabled: appState.gridModeEnabled,
    gridSize: appState.gridSize,
    gridStep: appState.gridStep,
    name: appState.name,
    scrollX: appState.scrollX,
    scrollY: appState.scrollY,
    theme: appState.theme,
    viewBackgroundColor: appState.viewBackgroundColor,
    zenModeEnabled: appState.zenModeEnabled,
    zoom: appState.zoom,
  };
}

function sceneFromApi(api: ExcalidrawImperativeAPI): WhiteboardScene {
  return {
    appState: persistedAppState(api.getAppState()),
    elements: [...api.getSceneElementsIncludingDeleted()],
    files: api.getFiles(),
    updatedAt: new Date().toISOString(),
  };
}

function sceneForStorage(scene: WhiteboardScene) {
  return {
    appState: scene.appState as unknown as WorkspaceJsonObject,
    elements: scene.elements as unknown[],
    files: scene.files as unknown as WorkspaceJsonObject,
    updatedAt: scene.updatedAt,
  };
}

function stableJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? JSON.stringify(value) : "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return "null";
}

function hashFingerprint(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${value.length}:${(hash >>> 0).toString(36)}`;
}

function sceneFingerprint(scene: Pick<WhiteboardScene, "appState" | "elements" | "files">) {
  return hashFingerprint(
    stableJson({
      appState: scene.appState,
      elements: scene.elements,
      files: scene.files,
    })
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function queuedGraphForImport(
  userId: string,
  savedWhiteboard: PersistedWhiteboard | null
) {
  const queued = getQueuedGraphForWhiteboard(userId);
  return normalizeQueuedGraph(
    queued ?? savedWhiteboard?.pendingGraph ?? savedWhiteboard?.queuedGraph
  );
}

function graphImportPrefix(graph: QueuedGraph) {
  const stableKey = `${graph.id}-${graph.createdAt}`
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);
  return `import-${stableKey || "graph"}`;
}

async function graphElements(
  graph: QueuedGraph,
  existingElements: readonly ExcalidrawElement[]
) {
  configureExcalidrawAssetPath();
  const { convertToExcalidrawElements } = await import(
    "@excalidraw/excalidraw"
  );
  const rightEdge = existingElements.reduce(
    (maximum, element) =>
      element.isDeleted
        ? maximum
        : Math.max(maximum, element.x + element.width),
    0
  );
  const baseX = rightEdge > 0 ? rightEdge + 180 : 100;
  const baseY = 150;
  const radius = Math.max(150, Math.min(360, graph.nodes.length * 25));
  const rawPositions = new Map<string, { x: number; y: number }>();

  graph.nodes.forEach((node, index) => {
    const position = node.position;
    if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
      rawPositions.set(node.id, position);
      return;
    }
    const angle = (Math.PI * 2 * index) / Math.max(graph.nodes.length, 1) - Math.PI / 2;
    rawPositions.set(node.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  });

  const allPositions = Array.from(rawPositions.values());
  const minimumX = Math.min(...allPositions.map((position) => position.x));
  const minimumY = Math.min(...allPositions.map((position) => position.y));
  const prefix = graphImportPrefix(graph);
  const renderedNodes = new Map<
    string,
    { elementId: string; height: number; width: number; x: number; y: number }
  >();

  graph.nodes.forEach((node, index) => {
    const position = rawPositions.get(node.id) || { x: 0, y: 0 };
    const width = Math.max(84, Math.min(176, 42 + node.label.length * 8));
    const height = 58;
    renderedNodes.set(node.id, {
      elementId: `${prefix}-node-${index}`,
      height,
      width,
      x: baseX + position.x - minimumX,
      y: baseY + position.y - minimumY,
    });
  });

  type Skeletons = Parameters<typeof convertToExcalidrawElements>[0];
  const skeletons: NonNullable<Skeletons> = [
    {
      type: "text",
      id: `${prefix}-title`,
      x: baseX,
      y: baseY - 90,
      text: graph.title || "Graph",
      fontSize: 28,
      strokeColor: "#0f172a",
    },
  ];

  graph.edges.forEach((edge, index) => {
    const source = renderedNodes.get(edge.source);
    const target = renderedNodes.get(edge.target);
    if (!source || !target) return;

    const sourceCenter = {
      x: source.x + source.width / 2,
      y: source.y + source.height / 2,
    };
    const targetCenter = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2,
    };

    if (edge.source === edge.target) {
      skeletons.push({
        type: graph.directed ? "arrow" : "line",
        id: `${prefix}-edge-${index}`,
        x: source.x + source.width - 8,
        y: source.y + source.height / 2,
        points: [
          [0, 0],
          [62, -54],
          [82, 10],
          [12, 20],
        ],
        endArrowhead: graph.directed ? "arrow" : null,
        strokeColor: "#475569",
        strokeWidth: 2,
      });
      return;
    }

    skeletons.push({
      type: graph.directed ? "arrow" : "line",
      id: `${prefix}-edge-${index}`,
      x: sourceCenter.x,
      y: sourceCenter.y,
      points: [
        [0, 0],
        [targetCenter.x - sourceCenter.x, targetCenter.y - sourceCenter.y],
      ],
      start: { id: source.elementId },
      end: { id: target.elementId },
      endArrowhead: graph.directed ? "arrow" : null,
      strokeColor: "#475569",
      strokeWidth: 2,
    });
  });

  graph.nodes.forEach((node) => {
    const rendered = renderedNodes.get(node.id);
    if (!rendered) return;
    skeletons.push({
      type: "ellipse",
      id: rendered.elementId,
      x: rendered.x,
      y: rendered.y,
      width: rendered.width,
      height: rendered.height,
      backgroundColor: "#e0f2fe",
      fillStyle: "solid",
      roughness: 1,
      strokeColor: "#0369a1",
      strokeWidth: 2,
      label: {
        text: node.label,
        fontSize: 18,
      },
    });
  });

  return convertToExcalidrawElements(skeletons, { regenerateIds: false });
}

export function WhiteboardCanvas({
  whiteboardId,
}: {
  whiteboardId?: string;
} = {}) {
  const { locale } = useLanguage();
  const language = locale === "ro" ? "ro" : "en";
  const c = copy[language];
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const readyRef = useRef(false);
  const latestSceneRef = useRef<WhiteboardScene | null>(null);
  const latestFingerprintRef = useRef<string | null>(null);
  const savedFingerprintRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const saveGenerationRef = useRef(0);
  const [loadGeneration, setLoadGeneration] = useState(0);
  const [initialData, setInitialData] =
    useState<ExcalidrawInitialDataState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [whiteboardTitle, setWhiteboardTitle] = useState<string>(c.title);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const theme = resolvedTheme === "dark" ? "dark" : "light";
  const themeRef = useRef(theme);
  const copyRef = useRef(c);
  themeRef.current = theme;
  copyRef.current = c;

  const writeScene = useCallback(
    async (scene: WhiteboardScene) => {
      if (!userId) return null;
      const storedScene = sceneForStorage(scene);
      const document = whiteboardId
        ? updateWhiteboard(userId, whiteboardId, { scene: storedScene })
        : (() => {
            saveWhiteboard(userId, storedScene);
            const activeId = getActiveWhiteboardId(userId);
            return activeId
              ? getWhiteboardDocument(userId, activeId)
              : null;
          })();
      if (!document) throw new Error(copyRef.current.loadError);
      const saved = await persistWorkspaceWhiteboard(userId, document);
      return saved.scene;
    },
    [userId, whiteboardId]
  );

  const persist = useCallback(
    async (
      scene: WhiteboardScene,
      notify = false,
      fingerprint = sceneFingerprint(scene)
    ) => {
      if (!userId) return;
      const generation = ++saveGenerationRef.current;
      setSaveStatus("saving");
      try {
        await writeScene(scene);
        if (generation === saveGenerationRef.current) {
          savedFingerprintRef.current = fingerprint;
          setSaveStatus(
            latestFingerprintRef.current === fingerprint ? "saved" : "saving"
          );
        }
        if (notify) toast.success(c.saved);
      } catch (error) {
        if (generation === saveGenerationRef.current) setSaveStatus("error");
        if (notify) {
          toast.error(c.saveError, {
            description: error instanceof Error ? error.message : undefined,
          });
        }
      }
    },
    [c.saveError, c.saved, userId, writeScene]
  );

  useEffect(() => {
    let active = true;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    apiRef.current = null;
    readyRef.current = false;
    latestSceneRef.current = null;
    latestFingerprintRef.current = null;
    savedFingerprintRef.current = null;
    setApiReady(false);
    setLoading(true);
    setLoadError(null);
    setInitialData(null);
    setWhiteboardTitle(copyRef.current.title);

    async function load() {
      if (!userId) return;
      try {
        const currentTheme = themeRef.current;
        const currentCopy = copyRef.current;
        let canonicalWhiteboardId = whiteboardId;
        let cloudConfirmed = true;
        try {
          const cloud = await synchronizeStudentWorkspace(userId);
          canonicalWhiteboardId = whiteboardId
            ? cloud.whiteboardAliases[whiteboardId] || whiteboardId
            : whiteboardId;
        } catch {
          // The local scene remains available while the browser is offline.
          cloudConfirmed = false;
        }
        if (
          whiteboardId &&
          canonicalWhiteboardId &&
          canonicalWhiteboardId !== whiteboardId
        ) {
          router.replace(
            `/workspace/student/whiteboard/${encodeURIComponent(
              canonicalWhiteboardId
            )}`
          );
          return;
        }
        const selectedDocument = canonicalWhiteboardId
          ? getWhiteboardDocument(userId, canonicalWhiteboardId)
          : null;
        if (canonicalWhiteboardId && !selectedDocument) {
          throw new Error(currentCopy.loadError);
        }
        if (selectedDocument) {
          setActiveWhiteboardId(userId, selectedDocument.id);
        }
        const savedRaw = selectedDocument?.scene || getWhiteboard(userId);
        const saved = (savedRaw || null) as PersistedWhiteboard | null;
        const existingElements = (Array.isArray(saved?.elements)
          ? saved.elements
          : []) as ExcalidrawElement[];
        const queuedGraph = queuedGraphForImport(userId, saved);
        const graphAlreadyImported = queuedGraph
          ? existingElements.some(
              (element) => element.id === `${graphImportPrefix(queuedGraph)}-title`
            )
          : false;
        const importedElements = queuedGraph && !graphAlreadyImported
          ? await graphElements(queuedGraph, existingElements)
          : [];
        const elements = [...existingElements, ...importedElements];
        const files = (saved?.files && isRecord(saved.files)
          ? saved.files
          : {}) as BinaryFiles;
        const storedAppState = (saved?.appState || {}) as Partial<AppState>;
        const appState = {
          exportBackground: true,
          viewBackgroundColor: currentTheme === "dark" ? "#18181b" : "#ffffff",
          ...storedAppState,
          // Follow the current application theme while retaining the rest of
          // the user's serializable canvas preferences.
          theme: currentTheme,
        } as Partial<AppState>;
        const loadedScene: WhiteboardScene = {
          appState,
          elements,
          files,
          updatedAt: new Date().toISOString(),
        };

        // Persist first, then clear the queue. Stable imported element IDs make
        // retries idempotent if clearing the queue happens to fail afterward.
        if (queuedGraph && !graphAlreadyImported) {
          await writeScene(loadedScene);
        }
        if (queuedGraph) consumeQueuedGraphForWhiteboard(userId);

        if (!active) return;
        setInitialData({
          appState,
          elements,
          files,
          scrollToContent: Boolean(queuedGraph),
        });
        if (selectedDocument) setWhiteboardTitle(selectedDocument.title);
        latestSceneRef.current = loadedScene;
        const loadedFingerprint = sceneFingerprint(loadedScene);
        latestFingerprintRef.current = loadedFingerprint;
        savedFingerprintRef.current =
          queuedGraph && !graphAlreadyImported
            ? loadedFingerprint
            : sceneFingerprint({
                appState: storedAppState,
                elements: existingElements,
                files,
              });
        setSaveStatus(
          cloudConfirmed
            ? savedFingerprintRef.current === loadedFingerprint
              ? "saved"
              : "idle"
            : "error"
        );
        setLoading(false);
        if (queuedGraph) {
          window.setTimeout(() => toast.success(currentCopy.graphAdded), 0);
        }
      } catch (error) {
        if (!active) return;
        setLoading(false);
        setLoadError(
          error instanceof Error ? error.message : copyRef.current.loadError
        );
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [loadGeneration, router, userId, whiteboardId, writeScene]);

  useEffect(() => {
    apiRef.current?.updateScene({ appState: { theme } });
  }, [theme]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      const pending = latestSceneRef.current;
      const fingerprint = latestFingerprintRef.current;
      if (
        pending &&
        fingerprint &&
        readyRef.current &&
        fingerprint !== savedFingerprintRef.current &&
        userId
      ) {
        void writeScene(pending)
          .then(() => {
            savedFingerprintRef.current = fingerprint;
          })
          .catch(() => undefined);
      }
    };
  }, [userId, writeScene]);

  const scheduleSave = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles
    ) => {
      const scene: WhiteboardScene = {
        appState: persistedAppState(appState),
        elements: [...elements],
        files,
        updatedAt: new Date().toISOString(),
      };
      const fingerprint = sceneFingerprint(scene);
      if (fingerprint === latestFingerprintRef.current) return;
      latestSceneRef.current = scene;
      latestFingerprintRef.current = fingerprint;
      if (!readyRef.current) return;
      if (fingerprint === savedFingerprintRef.current) {
        if (saveTimerRef.current) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        setSaveStatus("saved");
        return;
      }
      setSaveStatus("saving");
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        void persist(scene, false, fingerprint);
      }, SAVE_DEBOUNCE_MS);
    },
    [persist]
  );

  async function saveNow() {
    const api = apiRef.current;
    if (!api) return;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const scene = sceneFromApi(api);
    const fingerprint = sceneFingerprint(scene);
    latestSceneRef.current = scene;
    latestFingerprintRef.current = fingerprint;
    await persist(scene, true, fingerprint);
  }

  async function addQuickGraph(definition: QuickGraphDefinition) {
    const api = apiRef.current;
    if (!api) throw new Error(c.loadError);
    const existingElements = api.getSceneElementsIncludingDeleted();
    const now = new Date().toISOString();
    const quickGraph: QueuedGraph = {
      createdAt: now,
      directed: definition.directed,
      edges: definition.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
      id: `quick-${Date.now().toString(36)}`,
      nodes: definition.nodes.map((node) => ({
        id: node.id,
        index: node.index,
        label: node.label,
      })),
      title: language === "ro" ? "Graf rapid" : "Quick graph",
    };
    const insertedElements = await graphElements(quickGraph, existingElements);
    const nextElements = [...existingElements, ...insertedElements];
    api.updateScene({ elements: nextElements });
    api.scrollToContent(insertedElements, {
      animate: true,
      duration: 350,
      fitToContent: true,
      maxZoom: 1.25,
    });
    scheduleSave(nextElements, api.getAppState(), api.getFiles());
    toast.success(c.graphAdded);
  }

  async function exportPng() {
    const api = apiRef.current;
    if (!api) return;
    try {
      configureExcalidrawAssetPath();
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const appState = api.getAppState();
      const blob = await exportToBlob({
        appState: {
          ...persistedAppState(appState),
          exportBackground: true,
          exportWithDarkMode: theme === "dark",
        },
        elements: api.getSceneElements(),
        files: api.getFiles(),
        maxWidthOrHeight: 4096,
        mimeType: "image/png",
      });
      downloadBlob(blob, `scripticx-whiteboard-${new Date().toISOString().slice(0, 10)}.png`);
    } catch (error) {
      toast.error(
        language === "ro" ? "Exportul PNG a eșuat." : "PNG export failed.",
        { description: error instanceof Error ? error.message : undefined }
      );
    }
  }

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background"
      onContextMenu={(event) => event.stopPropagation()}
    >
      <header className="flex shrink-0 flex-col gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href="/workspace/student" aria-label={c.back}>
              <ArrowLeft />
            </Link>
          </Button>
          <WhiteboardLibraryTrigger
            activeWhiteboardId={whiteboardId}
            className="h-9 max-w-[min(16rem,60vw)]"
          />
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 pl-10 sm:pl-0">
          <span className="mr-1 min-w-12 text-right text-xs text-muted-foreground" aria-live="polite">
            {saveStatus === "saving" && c.saving}
            {saveStatus === "saved" && c.saved}
            {saveStatus === "error" && c.localOnly}
          </span>
          <QuickGraphPopover
            disabled={!apiReady}
            language={language}
            onGenerate={addQuickGraph}
          />
          <Button variant="outline" size="sm" onClick={exportPng} disabled={!apiReady}>
            <Download />
            {c.export}
          </Button>
          <Button size="sm" onClick={saveNow} disabled={!apiReady || saveStatus === "saving"}>
            {saveStatus === "saving" ? <LoaderCircle className="animate-spin" /> : <Save />}
            {c.save}
          </Button>
        </div>
      </header>

      <div className="relative h-0 min-h-0 flex-1 overflow-hidden bg-background">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              {c.loading}
            </div>
          </div>
        )}
        {loadError && !loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background p-6 text-center">
            <div className="max-w-md rounded-xl border bg-card p-6 shadow-sm">
              <p className="font-medium">{c.loadError}</p>
              <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => setLoadGeneration((generation) => generation + 1)}
              >
                <RefreshCw />
                {c.retry}
              </Button>
            </div>
          </div>
        )}
        {!loading && !loadError && initialData && (
          <Excalidraw
            initialData={initialData}
            excalidrawAPI={(api) => {
              apiRef.current = api;
              window.setTimeout(() => {
                if (apiRef.current !== api) return;
                readyRef.current = true;
                setApiReady(true);
                const pending = latestSceneRef.current;
                const fingerprint = latestFingerprintRef.current;
                if (
                  pending &&
                  fingerprint &&
                  fingerprint !== savedFingerprintRef.current
                ) {
                  setSaveStatus("saving");
                  saveTimerRef.current = window.setTimeout(() => {
                    saveTimerRef.current = null;
                    void persist(pending, false, fingerprint);
                  }, SAVE_DEBOUNCE_MS);
                }
              }, 0);
            }}
            langCode={language === "ro" ? "ro-RO" : "en"}
            name={whiteboardTitle || "ScripticX Whiteboard"}
            onChange={scheduleSave}
            theme={theme}
            isCollaborating={false}
          />
        )}
      </div>
    </div>
  );
}
