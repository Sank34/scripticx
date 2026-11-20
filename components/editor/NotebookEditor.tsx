"use client";

import { ArrowDown, ArrowUp, Play, Plus, RotateCcw, Square, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectFile } from "@/lib/editor-project";
import { closeNotebookKernel, executeNotebookCells, startNotebookKernel, type NotebookCellResult, type NotebookKernel } from "@/lib/notebook-kernel";
import {
  createNotebookCell,
  isPythonNotebook,
  notebookStoredOutput,
  notebookText,
  parseEditorNotebook,
  type EditorNotebook,
} from "@/lib/editor-notebook";

export function NotebookEditor({
  file,
  files,
  onChange,
  onShowSource,
}: {
  file: ProjectFile;
  files: ProjectFile[];
  onChange: (content: string) => void;
  onShowSource: () => void;
}) {
  const { locale, t } = useLanguage();
  const notebook = useMemo(() => parseEditorNotebook(file.content), [file.content]);
  const [running, setRunning] = useState<number[] | null>(null);
  const [kernelReady, setKernelReady] = useState(false);
  const [message, setMessage] = useState<string>();
  const [stdin, setStdin] = useState("");
  const [preview, setPreview] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const kernel = useRef<NotebookKernel | null>(null);
  const latestNotebook = useRef(notebook);
  latestNotebook.current = notebook;
  const cellElements = useRef(new Map<number, HTMLElement>());
  const cellFocus = useRef(new WeakMap<HTMLElement, () => void>());
  const pendingFocus = useRef<number | null>(null);

  function focusCell(index: number) {
    const element = cellElements.current.get(index);
    if (!element) return;
    element.scrollIntoView({ block: "nearest" });
    const focusEditor = cellFocus.current.get(element);
    if (!focusEditor && element.dataset.notebookCell === "code") return;
    const textarea = element.querySelector("textarea");
    if (focusEditor) focusEditor();
    else if (textarea) textarea.focus();
    else element.focus();
    pendingFocus.current = null;
  }

  useEffect(() => {
    if (pendingFocus.current !== null) focusCell(pendingFocus.current);
  }, [notebook]);

  useEffect(() => () => {
    controller.current?.abort();
    controller.current = null;
    if (kernel.current) void closeNotebookKernel(kernel.current);
    kernel.current = null;
  }, []);

  if (!notebook) {
    return (
      <div className="space-y-3 p-5">
        <p role="alert" className="text-sm">{t("editor.notebook.invalid")}</p>
        <Button variant="outline" onClick={onShowSource}>{t("editor.notebook.source")}</Button>
      </div>
    );
  }

  const canRun = isPythonNotebook(notebook);
  function saveCells(cells: EditorNotebook["cells"]) {
    onChange(JSON.stringify({ ...notebook, cells }, null, 2) + "\n");
  }

  function moveCell(index: number, delta: number) {
    if (!notebook) return;
    const cells = [...notebook.cells];
    const [cell] = cells.splice(index, 1);
    cells.splice(index + delta, 0, cell);
    saveCells(cells);
  }

  function restartKernel() {
    if (kernel.current) void closeNotebookKernel(kernel.current);
    kernel.current = null;
    setKernelReady(false);
    setMessage(t("editor.notebook.restarted"));
  }

  function applyResults(results: Map<number, NotebookCellResult>) {
    const current = latestNotebook.current;
    if (!current || !results.size) return;
    const cells = current.cells.map((cell, index) => {
      const result = results.get(index);
      if (!result || cell.cell_type !== "code") return cell;
      const outputs = [
        ...(result.stdout ? [{ output_type: "stream", name: "stdout", text: result.stdout }] : []),
        ...(result.stderr ? [{ output_type: "stream", name: "stderr", text: result.stderr }] : []),
      ];
      return { ...cell, execution_count: result.count, outputs };
    });
    onChange(JSON.stringify({ ...current, cells }, null, 2) + "\n");
  }

  async function runCells(index?: number, advance = false) {
    if (!notebook || !canRun || controller.current) return;
    const cells = notebook.cells.flatMap((cell, cellIndex): Array<[number, string]> =>
      cell.cell_type === "code" && (index === undefined || index === cellIndex) && notebookText(cell.source).trim()
        ? [[cellIndex, notebookText(cell.source)]]
        : []
    );
    if (advance && index !== undefined) {
      const next = index + 1;
      pendingFocus.current = next;
      if (next === notebook.cells.length) saveCells([...notebook.cells, createNotebookCell("code")]);
      else focusCell(next);
    }
    if (!cells.length) return;

    const run = new AbortController();
    controller.current = run;
    setRunning(cells.map(([cellIndex]) => cellIndex));
    setMessage(undefined);
    const results = new Map<number, NotebookCellResult>();
    try {
      const session = kernel.current ?? await startNotebookKernel(files);
      if (controller.current !== run) {
        void closeNotebookKernel(session);
        return;
      }
      kernel.current = session;
      run.signal.throwIfAborted();
      setKernelReady(true);
      await executeNotebookCells(session, cells, stdin, run.signal, (result) => results.set(result.index, result));
    } catch (error) {
      if (controller.current !== run) return;
      if (kernel.current) void closeNotebookKernel(kernel.current);
      kernel.current = null;
      setKernelReady(false);
      setMessage(run.signal.aborted ? t("editor.notebook.stopped")
        : `${error instanceof Error ? error.message : t("editor.notebook.runError")} ${t("editor.notebook.kernelEnded")}`);
    } finally {
      if (controller.current === run) {
        applyResults(results);
        controller.current = null;
        setRunning(null);
      }
    }
  }

  function handleCellShortcut(event: React.KeyboardEvent, index: number, type: string) {
    if (event.key !== "Enter" || event.altKey || event.nativeEvent.isComposing) return;
    if (!event.shiftKey && !event.ctrlKey && !event.metaKey) return;
    if (type !== "code" || !canRun || (event.target instanceof Element && event.target.closest("button"))) return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) void runCells(index, event.shiftKey);
  }

  return (
    <section className="min-h-0 flex-1 overflow-auto" aria-label={t("editor.notebook.title")}>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2">
        <Button size="sm" variant="outline" disabled={Boolean(running)} onClick={() => saveCells([...notebook.cells, createNotebookCell("code")])}>
          <Plus aria-hidden="true" />{t("editor.notebook.code")}
        </Button>
        <Button size="sm" variant="outline" disabled={Boolean(running)} onClick={() => saveCells([...notebook.cells, createNotebookCell("markdown")])}>
          <Plus aria-hidden="true" />Markdown
        </Button>
        <Button size="sm" variant="ghost" aria-pressed={preview} onClick={() => setPreview(!preview)}>
          {t("editor.notebook.preview")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onShowSource}>{t("editor.notebook.source")}</Button>
        {running ? (
          <Button size="sm" variant="outline" onClick={() => controller.current?.abort()}>
            <Square aria-hidden="true" />{t("editor.notebook.stop")}
          </Button>
        ) : (
          <Button size="sm" disabled={!canRun || !notebook.cells.some((cell) => cell.cell_type === "code" && notebookText(cell.source).trim())} onClick={() => void runCells()}>
            <Play aria-hidden="true" />{t("editor.notebook.run")}
          </Button>
        )}
        {canRun && (
          <Button size="sm" variant="ghost" disabled={!kernelReady || Boolean(running)} onClick={restartKernel}>
            <RotateCcw aria-hidden="true" />{t("editor.notebook.restart")}
          </Button>
        )}
      </div>

      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        {!canRun && <p className="text-sm text-muted-foreground">{t("editor.notebook.pythonOnly")}</p>}
        {!notebook.cells.length && <p className="text-sm text-muted-foreground">{t("editor.notebook.empty")}</p>}
        {canRun && <p className="text-xs text-muted-foreground">{t("editor.notebook.shortcuts")}</p>}
        {message && <p role="status" className="rounded-lg border px-4 py-3 text-sm">{message}</p>}
        {notebook.cells.map((cell, index) => {
          const label = cell.cell_type === "code" ? t("editor.notebook.code") : cell.cell_type;
          const cellLabel = t("editor.notebook.cell", { index: index + 1, type: label });
          const source = notebookText(cell.source);
          const output = notebookStoredOutput(cell);
          const editable = (cell.metadata as { editable?: boolean } | undefined)?.editable !== false;
          return (
            <div
              key={typeof cell.id === "string" ? cell.id : index}
              ref={(element) => { if (element) cellElements.current.set(index, element); else cellElements.current.delete(index); }}
              data-notebook-cell={cell.cell_type}
              tabIndex={-1}
              aria-label={cellLabel}
              onKeyDownCapture={(event) => handleCellShortcut(event, index, cell.cell_type)}
              className="min-w-0 scroll-mt-16 overflow-hidden rounded-lg border bg-card focus-within:border-ring"
            >
              <div className="flex flex-wrap items-center justify-between gap-1 border-b px-3 py-1">
                <div className="flex items-center gap-2">
                  {cell.cell_type === "code" && canRun && (
                    <Button type="button" size="icon-sm" variant="ghost" disabled={Boolean(running) || !source.trim()}
                      aria-label={t("editor.notebook.runCell", { index: index + 1 })} title={t("editor.notebook.runCell", { index: index + 1 })}
                      onClick={() => void runCells(index)}><Play aria-hidden="true" /></Button>
                  )}
                  <span className="text-xs font-medium text-muted-foreground">{cellLabel}</span>
                  {cell.cell_type === "code" && (
                    <span className="font-mono text-xs text-muted-foreground">[{typeof cell.execution_count === "number" ? cell.execution_count : " "}]</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon-sm" variant="ghost" disabled={Boolean(running) || index === 0} aria-label={t("editor.notebook.moveUp", { index: index + 1 })} onClick={() => moveCell(index, -1)}><ArrowUp /></Button>
                  <Button size="icon-sm" variant="ghost" disabled={Boolean(running) || index === notebook.cells.length - 1} aria-label={t("editor.notebook.moveDown", { index: index + 1 })} onClick={() => moveCell(index, 1)}><ArrowDown /></Button>
                  <Button size="icon-sm" variant="ghost" disabled={Boolean(running) || !editable || (cell.metadata as { deletable?: boolean } | undefined)?.deletable === false} aria-label={t("editor.notebook.delete", { index: index + 1 })} onClick={() => saveCells(notebook.cells.filter((_, cellIndex) => cellIndex !== index))}><Trash2 /></Button>
                </div>
              </div>
              {cell.cell_type === "code" ? (
                <MiniScriptMonacoEditor
                  language={canRun ? "python" : "text"}
                  value={source}
                  readOnly={!editable || Boolean(running)}
                  liveErrors={false}
                  height={`${Math.max(76, Math.min(320, 22 * source.split("\n").length + 18))}px`}
                  onMount={(editor) => {
                    const element = editor.getDomNode()?.closest<HTMLElement>("[data-notebook-cell]");
                    if (!element) return;
                    cellFocus.current.set(element, () => editor.focus());
                    editor.onDidDispose(() => cellFocus.current.delete(element));
                    if (pendingFocus.current !== null && cellElements.current.get(pendingFocus.current) === element) {
                      focusCell(pendingFocus.current);
                    }
                  }}
                  onChange={(value) => saveCells(notebook.cells.map((entry, cellIndex) =>
                    cellIndex === index ? { ...entry, source: value } : entry
                  ))}
                  options={{
                    ariaLabel: cellLabel,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: "on",
                    lineNumbersMinChars: 3,
                    padding: { top: 8, bottom: 8 },
                    scrollbar: { alwaysConsumeMouseWheel: false },
                  }}
                />
              ) : preview && cell.cell_type === "markdown" && source ? (
                <Markdown className="p-4 wrap-anywhere" codeLocale={locale}>{source}</Markdown>
              ) : (
                <Textarea
                  aria-label={cellLabel}
                  readOnly={!editable || Boolean(running)}
                  spellCheck={cell.cell_type === "markdown"}
                  value={source}
                  rows={Math.max(3, Math.min(16, source.split("\n").length))}
                  className="min-h-20 resize-y rounded-none border-0 font-mono shadow-none focus-visible:ring-inset"
                  onChange={(event) => saveCells(notebook.cells.map((entry, cellIndex) =>
                    cellIndex === index ? { ...entry, source: event.target.value } : entry
                  ))}
                />
              )}
              {running?.includes(index) && <p role="status" className="border-t px-4 py-2 text-xs text-muted-foreground">{t("editor.notebook.running")}</p>}
              {output && <pre className="max-h-64 overflow-auto border-t px-4 py-3 text-xs whitespace-pre-wrap wrap-anywhere">{output}</pre>}
            </div>
          );
        })}

        {canRun && (
          <details className="rounded-lg border px-3 py-2">
            <summary className="cursor-pointer text-sm">{t("editor.notebook.stdin")}</summary>
            <Textarea className="mt-2 font-mono" aria-label={t("editor.notebook.stdin")} value={stdin} onChange={(event) => setStdin(event.target.value)} />
          </details>
        )}
      </div>
    </section>
  );
}
