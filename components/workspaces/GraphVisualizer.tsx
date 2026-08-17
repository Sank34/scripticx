"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cytoscape from "cytoscape";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FolderOpen,
  ImagePlus,
  LoaderCircle,
  Maximize2,
  RefreshCw,
  Save,
  Trash2,
  TriangleAlert,
  Workflow,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  graphNodeLabel,
  parseGraphInput,
  type GraphIndexMode,
  type GraphParseIssue,
} from "@/lib/graph-parser";
import {
  deleteGraph,
  listGraphs,
  queueGraphForWhiteboard,
  saveGraph,
  subscribeWorkspaceStorage,
  type WorkspaceGraph,
} from "@/lib/workspace-storage";
import { cn } from "@/lib/utils";

const copy = {
  en: {
    addToWhiteboard: "Add to whiteboard",
    back: "Student workspace",
    cancel: "Cancel",
    custom: "Custom labels",
    customHelp:
      "One label per line, or comma-separated. Quote labels containing spaces in the edge list.",
    customPlaceholder: "Start\nMiddle\nEnd",
    deleteGraph: "Delete graph",
    deleteGraphDescription: (title: string) =>
      `“${title}” will be permanently removed. This cannot be undone.`,
    deleteGraphTitle: "Delete this graph?",
    directed: "Directed",
    download: "Download PNG",
    edgeHelp: "One edge per line: 0 1, 0 -> 1, or A B. # comments are allowed.",
    edgeList: "Graph data",
    edgePlaceholder: "0 2\n0 4\n0 5\n1 4\n1 5\n2 3\n2 4\n4 5",
    emptyGraph: "Add valid nodes and edges to preview the graph.",
    fit: "Fit graph",
    graphSaved: "Graph saved",
    graphLoaded: "Saved graph loaded",
    graphType: "Graph type",
    indexOne: "1-index",
    indexZero: "0-index",
    nodeCount: "Node count",
    newGraph: "New graph",
    noSavedGraphs: "No saved graphs yet.",
    preview: "Interactive preview",
    queued: "Graph added to the whiteboard queue",
    rerun: "Re-run layout",
    save: "Save graph",
    savedGraphs: "Saved graphs",
    saving: "Saving…",
    subtitle: "Write the edges, explore the force layout, then export or continue in the whiteboard.",
    title: "Graph creator",
    titleLabel: "Saved graph title",
    titlePlaceholder: "My graph",
    undirected: "Undirected",
    valid: "Valid graph",
    validation: "Validation",
  },
  ro: {
    addToWhiteboard: "Adaugă în whiteboard",
    back: "Workspace elev",
    cancel: "Anulează",
    custom: "Etichete proprii",
    customHelp:
      "O etichetă pe linie sau separate prin virgulă. Pune între ghilimele etichetele cu spații din lista de muchii.",
    customPlaceholder: "Start\nMijloc\nFinal",
    deleteGraph: "Șterge graful",
    deleteGraphDescription: (title: string) =>
      `„${title}” va fi șters definitiv. Acțiunea nu poate fi anulată.`,
    deleteGraphTitle: "Ștergi acest graf?",
    directed: "Orientat",
    download: "Descarcă PNG",
    edgeHelp: "O muchie pe linie: 0 1, 0 -> 1 sau A B. Poți folosi comentarii cu #.",
    edgeList: "Datele grafului",
    edgePlaceholder: "0 2\n0 4\n0 5\n1 4\n1 5\n2 3\n2 4\n4 5",
    emptyGraph: "Adaugă noduri și muchii valide pentru a previzualiza graful.",
    fit: "Încadrează graful",
    graphSaved: "Graful a fost salvat",
    graphLoaded: "Graful salvat a fost încărcat",
    graphType: "Tipul grafului",
    indexOne: "Indexare de la 1",
    indexZero: "Indexare de la 0",
    nodeCount: "Număr de noduri",
    newGraph: "Graf nou",
    noSavedGraphs: "Nu ai încă grafuri salvate.",
    preview: "Previzualizare interactivă",
    queued: "Graful a fost pregătit pentru whiteboard",
    rerun: "Recalculează pozițiile",
    save: "Salvează graful",
    savedGraphs: "Grafuri salvate",
    saving: "Se salvează…",
    subtitle: "Scrie muchiile, explorează layout-ul și apoi exportă sau continuă în whiteboard.",
    title: "Creator de grafuri",
    titleLabel: "Titlul grafului salvat",
    titlePlaceholder: "Graful meu",
    undirected: "Neorientat",
    valid: "Graf valid",
    validation: "Validare",
  },
} as const;

const issueCopy: Record<
  GraphParseIssue["code"],
  { en: string; ro: string }
> = {
  "custom-label-count-mismatch": {
    en: "The number of custom labels must match the node count.",
    ro: "Numărul etichetelor trebuie să coincidă cu numărul de noduri.",
  },
  "custom-labels-required": {
    en: "Add at least one custom label.",
    ro: "Adaugă cel puțin o etichetă proprie.",
  },
  "duplicate-edge": {
    en: "This edge is duplicated and was ignored.",
    ro: "Muchia este duplicată și a fost ignorată.",
  },
  "duplicate-label": {
    en: "Custom labels must be unique.",
    ro: "Etichetele proprii trebuie să fie unice.",
  },
  "invalid-edge-format": {
    en: "Each edge must contain exactly two nodes.",
    ro: "Fiecare muchie trebuie să conțină exact două noduri.",
  },
  "invalid-node-count": {
    en: "Node count must be a positive whole number.",
    ro: "Numărul de noduri trebuie să fie un număr întreg pozitiv.",
  },
  "invalid-node-reference": {
    en: "The edge references a node that does not exist.",
    ro: "Muchia face referire la un nod care nu există.",
  },
  "self-loop": {
    en: "Self-loop detected. It is valid and will be kept.",
    ro: "Buclă către același nod detectată. Este validă și va fi păstrată.",
  },
  "too-many-nodes": {
    en: "Use at most 250 nodes in one graph.",
    ro: "Folosește cel mult 250 de noduri într-un graf.",
  },
};

const defaultEdges = "0 2\n0 4\n0 5\n1 4\n1 5\n2 3\n2 4\n4 5";

function createGraphId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `graph-${Date.now()}`;
}

function quoteGraphLabel(label: string) {
  return /[\s,#]/.test(label)
    ? `"${label.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    : label;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safeFilename(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "graph"
  );
}

export function GraphVisualizer() {
  const { locale } = useLanguage();
  const language = locale === "ro" ? "ro" : "en";
  const c = copy[language];
  const { resolvedTheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cytoscapeRef = useRef<cytoscape.Core | null>(null);
  const graphResizeFrameRef = useRef<number | null>(null);
  const graphIdRef = useRef(createGraphId());
  const graphCreatedAtRef = useRef(new Date().toISOString());
  const [title, setTitle] = useState("");
  const [nodeCount, setNodeCount] = useState(6);
  const [directed, setDirected] = useState(false);
  const [indexMode, setIndexMode] = useState<GraphIndexMode>("zero");
  const [customLabels, setCustomLabels] = useState("");
  const [edgeList, setEdgeList] = useState(defaultEdges);
  const [savedGraphs, setSavedGraphs] = useState<WorkspaceGraph[]>([]);
  const [saving, setSaving] = useState<"graph" | "whiteboard" | null>(null);
  const [graphToDelete, setGraphToDelete] = useState<WorkspaceGraph | null>(null);

  const graph = useMemo(
    () =>
      parseGraphInput({
        customLabels,
        directed,
        edgeList,
        indexMode,
        nodeCount,
      }),
    [customLabels, directed, edgeList, indexMode, nodeCount]
  );

  const graphTheme = resolvedTheme === "dark" ? "dark" : "light";

  const refreshSavedGraphs = useCallback(() => {
    setSavedGraphs(user ? listGraphs(user.id) : []);
  }, [user]);

  useEffect(() => {
    refreshSavedGraphs();
    if (!user) return;
    return subscribeWorkspaceStorage(user.id, refreshSavedGraphs);
  }, [refreshSavedGraphs, user]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !graph.isValid || graph.nodes.length === 0) {
      cytoscapeRef.current?.destroy();
      cytoscapeRef.current = null;
      return;
    }

    const dark = graphTheme === "dark";
    const elements: cytoscape.ElementDefinition[] = [
      ...graph.nodes.map((node) => ({
        data: { id: node.id, label: node.label },
      })),
      ...graph.edges.map((edge) => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
        },
      })),
    ];

    const instance = cytoscape({
      container,
      elements,
      layout: {
        name: "preset",
        fit: false,
      },
      minZoom: 0.2,
      maxZoom: 3.5,
      selectionType: "single",
      style: [
        {
          selector: "node",
          style: {
            "background-color": dark ? "#18181b" : "#ffffff",
            "border-color": dark ? "#a1a1aa" : "#27272a",
            "border-width": 2,
            color: dark ? "#fafafa" : "#18181b",
            "font-family": "Geist, ui-sans-serif, system-ui",
            "font-size": 14,
            "font-weight": 600,
            height: 48,
            label: "data(label)",
            "text-halign": "center",
            "text-valign": "center",
            width: 48,
          },
        },
        {
          selector: "node:selected",
          style: {
            "background-color": dark ? "#0c4a6e" : "#e0f2fe",
            "border-color": "#0284c7",
            "overlay-color": "#38bdf8",
            "overlay-opacity": 0.12,
          },
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            "line-color": dark ? "#71717a" : "#52525b",
            "line-style": "solid",
            "target-arrow-color": dark ? "#a1a1aa" : "#3f3f46",
            "target-arrow-shape": directed ? "triangle" : "none",
            "arrow-scale": 1.05,
            width: 1.8,
          },
        },
        {
          selector: "edge:selected",
          style: {
            "line-color": "#0284c7",
            "target-arrow-color": "#0284c7",
            width: 3,
          },
        },
      ],
    });

    cytoscapeRef.current = instance;

    let lastWidth = 0;
    let lastHeight = 0;
    let layoutStarted = false;
    let layoutCompleted = false;
    let hasFitted = false;

    const syncRendererSize = () => {
      if (instance.destroyed()) return;
      const { width, height } = container.getBoundingClientRect();
      if (width < 1 || height < 1) return;

      const sizeChanged =
        Math.abs(width - lastWidth) > 0.5 ||
        Math.abs(height - lastHeight) > 0.5;
      if (!sizeChanged && hasFitted) return;

      lastWidth = width;
      lastHeight = height;
      instance.resize();

      if (!layoutStarted) {
        layoutStarted = true;
        instance.one("layoutstop", () => {
          layoutCompleted = true;
          scheduleRendererSync();
        });
        instance
          .layout({
            name: "cose",
            animate: false,
            componentSpacing: 90,
            edgeElasticity: () => 90,
            gravity: 0.16,
            idealEdgeLength: () => 115,
            nodeOverlap: 24,
            nodeRepulsion: () => 7000,
            padding: 40,
            randomize: true,
          })
          .run();
        return;
      }

      if (!layoutCompleted) return;
      if (!hasFitted) {
        instance.fit(undefined, 42);
        hasFitted = true;
      }
    };

    const scheduleRendererSync = () => {
      if (graphResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(graphResizeFrameRef.current);
      }
      graphResizeFrameRef.current = window.requestAnimationFrame(() => {
        graphResizeFrameRef.current = null;
        syncRendererSize();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleRendererSync);
    resizeObserver.observe(container);
    scheduleRendererSync();

    return () => {
      resizeObserver.disconnect();
      if (graphResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(graphResizeFrameRef.current);
        graphResizeFrameRef.current = null;
      }
      instance.destroy();
      if (cytoscapeRef.current === instance) cytoscapeRef.current = null;
    };
  }, [graph, graphTheme, directed]);

  const formatIssue = useCallback(
    (issue: GraphParseIssue) => {
      const prefix = issue.line
        ? language === "ro"
          ? `Linia ${issue.line}: `
          : `Line ${issue.line}: `
        : "";
      const suffix = issue.value ? ` (${issue.value})` : "";
      return `${prefix}${issueCopy[issue.code][language]}${suffix}`;
    },
    [language]
  );

  function changeIndexMode(nextMode: GraphIndexMode) {
    if (nextMode === indexMode) return;

    if (graph.isValid) {
      const nextLabels = graph.nodes.map((node) => {
        if (nextMode === "zero") return String(node.index);
        if (nextMode === "one") return String(node.index + 1);
        return graphNodeLabel(node.index);
      });
      const labelById = new Map(
        graph.nodes.map((node) => [node.id, nextLabels[node.index]])
      );
      const nextEdges = graph.edges
        .map((edge) => {
          const source = labelById.get(edge.source);
          const target = labelById.get(edge.target);
          if (!source || !target) return null;
          const separator = directed ? " -> " : " ";
          return `${quoteGraphLabel(source)}${separator}${quoteGraphLabel(target)}`;
        })
        .filter((line): line is string => Boolean(line))
        .join("\n");

      if (nextMode === "custom") setCustomLabels(nextLabels.join("\n"));
      setEdgeList(nextEdges);
    } else if (nextMode === "custom" && !customLabels.trim()) {
      setCustomLabels(
        Array.from({ length: Math.max(nodeCount, 1) }, (_, index) =>
          graphNodeLabel(index)
        ).join("\n")
      );
    }

    setIndexMode(nextMode);
  }

  function startNewGraph() {
    graphIdRef.current = createGraphId();
    graphCreatedAtRef.current = new Date().toISOString();
    setTitle("");
    setNodeCount(6);
    setDirected(false);
    setIndexMode("zero");
    setCustomLabels("");
    setEdgeList(defaultEdges);
  }

  function loadSavedGraph(savedGraph: WorkspaceGraph) {
    const nextIndexMode: GraphIndexMode =
      savedGraph.indexMode === "one" || savedGraph.indexMode === "custom"
        ? savedGraph.indexMode
        : "zero";
    graphIdRef.current = savedGraph.id;
    graphCreatedAtRef.current = savedGraph.createdAt;
    setTitle(savedGraph.title);
    setNodeCount(savedGraph.nodeCount);
    setDirected(savedGraph.directed);
    setIndexMode(nextIndexMode);
    setCustomLabels(
      nextIndexMode === "custom"
        ? savedGraph.nodes.map((node) => node.label).join("\n")
        : ""
    );
    setEdgeList(savedGraph.source);
    toast.success(c.graphLoaded);
  }

  function removeSavedGraph(savedGraph: WorkspaceGraph) {
    setGraphToDelete(savedGraph);
  }

  function confirmGraphDeletion() {
    const savedGraph = graphToDelete;
    if (!user) return;
    if (!savedGraph) return;

    try {
      deleteGraph(user.id, savedGraph.id);
      if (graphIdRef.current === savedGraph.id) startNewGraph();
      setGraphToDelete(null);
      toast.success(language === "ro" ? "Graful a fost șters." : "Graph deleted.");
    } catch (error) {
      toast.error(
        language === "ro" ? "Graful nu a putut fi șters." : "Could not delete the graph.",
        { description: error instanceof Error ? error.message : undefined }
      );
    }
  }

  function graphSnapshot() {
    const positions = new Map<string, { x: number; y: number }>();
    cytoscapeRef.current?.nodes().forEach((node) => {
      positions.set(node.id(), node.position());
    });

    return {
      createdAt: graphCreatedAtRef.current,
      customLabels:
        indexMode === "custom" ? graph.nodes.map((node) => node.label) : [],
      directed,
      edges: graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
      id: graphIdRef.current,
      indexMode,
      nodeCount,
      nodes: graph.nodes.map((node) => {
        const position = positions.get(node.id);
        return {
          id: node.id,
          label: node.label,
          ...(position ? { position } : {}),
        };
      }),
      source: edgeList,
      title: title.trim() || c.titlePlaceholder,
      updatedAt: new Date().toISOString(),
    };
  }

  async function handleSave() {
    if (!user || !graph.isValid || saving) return;
    setSaving("graph");
    try {
      await saveGraph(user.id, graphSnapshot());
      toast.success(c.graphSaved);
    } catch (error) {
      toast.error(
        language === "ro" ? "Graful nu a putut fi salvat." : "Could not save the graph.",
        { description: error instanceof Error ? error.message : undefined }
      );
    } finally {
      setSaving(null);
    }
  }

  async function handleAddToWhiteboard() {
    if (!user || !graph.isValid || saving) return;
    setSaving("whiteboard");
    try {
      await queueGraphForWhiteboard(user.id, graphSnapshot());
      toast.success(c.queued);
      router.push("/workspace/student/whiteboard");
    } catch (error) {
      toast.error(
        language === "ro"
          ? "Graful nu a putut fi trimis în whiteboard."
          : "Could not add the graph to the whiteboard.",
        { description: error instanceof Error ? error.message : undefined }
      );
      setSaving(null);
    }
  }

  async function handleDownload() {
    const instance = cytoscapeRef.current;
    if (!instance || !graph.isValid) return;
    try {
      instance.fit(undefined, 42);
      const blob = await instance.png({
        bg: graphTheme === "dark" ? "#18181b" : "#ffffff",
        full: true,
        output: "blob-promise",
        scale: 2,
      });
      downloadBlob(blob, `${safeFilename(title || c.titlePlaceholder)}.png`);
    } catch (error) {
      toast.error(language === "ro" ? "Exportul a eșuat." : "Export failed.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-background xl:overflow-hidden"
      onContextMenu={(event) => event.stopPropagation()}
    >
      <header className="flex shrink-0 flex-col gap-3 border-b bg-card/90 px-3 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="ghost" size="icon" className="mt-0.5 shrink-0">
            <Link href="/workspace/student" aria-label={c.back}>
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-sky-600" />
              <h1 className="truncate text-lg font-semibold sm:text-xl">{c.title}</h1>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">
              {c.subtitle}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-11 sm:pl-0">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!graph.isValid}>
            <Download />
            <span className="hidden sm:inline">{c.download}</span>
            <span className="sm:hidden">PNG</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={!graph.isValid || Boolean(saving)}>
            {saving === "graph" ? <LoaderCircle className="animate-spin" /> : <Save />}
            {saving === "graph" ? c.saving : c.save}
          </Button>
          <Button size="sm" onClick={handleAddToWhiteboard} disabled={!graph.isValid || Boolean(saving)}>
            {saving === "whiteboard" ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <ImagePlus />
            )}
            {c.addToWhiteboard}
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <section className="min-h-0 bg-card/55 xl:overflow-y-auto xl:border-r">
          <div className="border-b px-4 py-3">
            <h2 className="text-base font-medium">{c.edgeList}</h2>
          </div>
          <div className="space-y-4 px-4 py-4 pb-6">
            <label className="block space-y-1.5 text-xs font-medium">
              {c.titleLabel}
              <Input
                value={title}
                maxLength={80}
                placeholder={c.titlePlaceholder}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/70 px-3 py-2.5">
              <div className="min-w-0">
                <label
                  htmlFor="graph-directed"
                  className="cursor-pointer text-xs font-medium"
                >
                  {c.graphType}
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground" aria-live="polite">
                  {directed ? c.directed : c.undirected}
                </p>
              </div>
              <Switch
                checked={directed}
                id="graph-directed"
                onCheckedChange={setDirected}
              />
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
              {(
                [
                  ["zero", c.indexZero],
                  ["one", c.indexOne],
                  ["custom", c.custom],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => changeIndexMode(mode)}
                  className={cn(
                    "min-h-9 rounded-md px-2 text-xs font-medium transition",
                    indexMode === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="block space-y-1.5 text-xs font-medium">
              {c.nodeCount}
              <Input
                type="number"
                min={1}
                max={250}
                value={nodeCount}
                onChange={(event) => setNodeCount(Number(event.target.value))}
              />
            </label>

            {indexMode === "custom" && (
              <label className="block space-y-1.5 text-xs font-medium">
                {c.custom}
                <Textarea
                  value={customLabels}
                  onChange={(event) => setCustomLabels(event.target.value)}
                  placeholder={c.customPlaceholder}
                  className="min-h-24 resize-y font-mono text-xs"
                  spellCheck={false}
                />
                <span className="block font-normal leading-4 text-muted-foreground">
                  {c.customHelp}
                </span>
              </label>
            )}

            <label className="block space-y-1.5 text-xs font-medium">
              {c.edgeList}
              <Textarea
                value={edgeList}
                onChange={(event) => setEdgeList(event.target.value)}
                placeholder={c.edgePlaceholder}
                className="min-h-52 resize-y font-mono text-sm leading-6"
                spellCheck={false}
              />
              <span className="block font-normal leading-4 text-muted-foreground">
                {c.edgeHelp}
              </span>
            </label>

            <section className="rounded-lg border bg-muted/30 p-3" aria-live="polite">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {c.validation}
                </h2>
                {graph.isValid && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {c.valid}
                  </span>
                )}
              </div>
              {graph.errors.length === 0 && graph.warnings.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {graph.nodes.length} {language === "ro" ? "noduri" : "nodes"} · {graph.edges.length}{" "}
                  {language === "ro" ? "muchii" : "edges"}
                </p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {graph.errors.slice(0, 5).map((issue, index) => (
                    <li key={`error-${issue.code}-${issue.line}-${index}`} className="flex gap-1.5 text-destructive">
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{formatIssue(issue)}</span>
                    </li>
                  ))}
                  {graph.warnings.slice(0, 5).map((issue, index) => (
                    <li key={`warning-${issue.code}-${issue.line}-${index}`} className="flex gap-1.5 text-amber-700 dark:text-amber-400">
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{formatIssue(issue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="border-t pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {c.savedGraphs}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {savedGraphs.length} {language === "ro" ? "salvate" : "saved"}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={startNewGraph}>
                  <Workflow />
                  {c.newGraph}
                </Button>
              </div>

              {savedGraphs.length ? (
                <div className="mt-3 max-h-52 space-y-1.5 overflow-y-auto pr-1">
                  {savedGraphs.map((savedGraph) => (
                    <div
                      key={savedGraph.id}
                      className="group flex items-center gap-1 rounded-lg border bg-background p-1"
                    >
                      <button
                        type="button"
                        onClick={() => loadSavedGraph(savedGraph)}
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-muted"
                      >
                        <FolderOpen className="size-4 shrink-0 text-sky-600" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">
                            {savedGraph.title}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-muted-foreground">
                            {savedGraph.nodeCount} {language === "ro" ? "noduri" : "nodes"} ·{" "}
                            {savedGraph.edges.length} {language === "ro" ? "muchii" : "edges"}
                          </span>
                        </span>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeSavedGraph(savedGraph)}
                        aria-label={
                          language === "ro"
                            ? `Șterge ${savedGraph.title}`
                            : `Delete ${savedGraph.title}`
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                  {c.noSavedGraphs}
                </p>
              )}
            </section>
          </div>
        </section>

        <section className="flex min-h-[560px] flex-col border-t bg-background xl:min-h-0 xl:border-t-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <h2 className="font-medium">{c.preview}</h2>
              <p className="text-xs text-muted-foreground">
                {graph.nodes.length} {language === "ro" ? "noduri" : "nodes"} · {graph.edges.length}{" "}
                {language === "ro" ? "muchii" : "edges"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                title={c.rerun}
                disabled={!graph.isValid}
                onClick={() =>
                  cytoscapeRef.current
                    ?.layout({ name: "cose", animate: true, padding: 40 })
                    .run()
                }
              >
                <RefreshCw />
                <span className="hidden sm:inline">{c.rerun}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title={c.fit}
                disabled={!graph.isValid}
                onClick={() => cytoscapeRef.current?.fit(undefined, 42)}
              >
                <Maximize2 />
                <span className="hidden sm:inline">{c.fit}</span>
              </Button>
            </div>
          </div>
          <div className="relative min-h-[500px] flex-1 overflow-hidden bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.06),transparent_55%)] xl:min-h-0">
            <div ref={containerRef} className="absolute inset-0" />
            {!graph.isValid && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-8 text-center">
                <div className="max-w-sm rounded-xl border bg-background/90 p-5 shadow-sm backdrop-blur">
                  <TriangleAlert className="mx-auto h-7 w-7 text-amber-500" />
                  <p className="mt-3 text-sm text-muted-foreground">{c.emptyGraph}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <AlertDialog
        open={Boolean(graphToDelete)}
        onOpenChange={(open) => {
          if (!open) setGraphToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>{c.deleteGraphTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {c.deleteGraphDescription(graphToDelete?.title || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{c.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmGraphDeletion}>
              <Trash2 />
              {c.deleteGraph}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
