type NotebookCell = Record<string, unknown> & {
  cell_type: string;
  source: string | string[];
};

export type EditorNotebook = Record<string, unknown> & {
  nbformat: 4;
  cells: NotebookCell[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function notebookText(value: unknown): string {
  if (typeof value === "string") return value;
  return Array.isArray(value) && value.every((line) => typeof line === "string") ? value.join("") : "";
}

export function parseEditorNotebook(content: string): EditorNotebook | null {
  if (!content.trim()) return { nbformat: 4, nbformat_minor: 5, metadata: {}, cells: [] };
  try {
    const document: unknown = JSON.parse(content);
    if (!isRecord(document) || document.nbformat !== 4 || !Array.isArray(document.cells)) return null;
    if (!document.cells.every((cell: unknown) => isRecord(cell) && typeof cell.cell_type === "string" && (
      typeof cell.source === "string" || (Array.isArray(cell.source) && cell.source.every((line) => typeof line === "string"))
    ))) return null;
    return document as EditorNotebook;
  } catch {
    return null;
  }
}

export function createNotebookCell(type: "code" | "markdown"): NotebookCell {
  const cell = { id: crypto.randomUUID(), cell_type: type, metadata: {}, source: "" };
  return type === "code" ? { ...cell, execution_count: null, outputs: [] } : cell;
}

export function isPythonNotebook(notebook: EditorNotebook) {
  const metadata = notebook.metadata;
  if (!isRecord(metadata)) return true;
  const languageInfo = isRecord(metadata.language_info) ? metadata.language_info.name : undefined;
  const kernel = isRecord(metadata.kernelspec) ? metadata.kernelspec : undefined;
  const language = languageInfo ?? kernel?.language;
  if (typeof language === "string") return language.toLowerCase() === "python";
  return typeof kernel?.name !== "string" || /^python/i.test(kernel.name);
}

export function notebookStoredOutput(cell: NotebookCell) {
  if (!Array.isArray(cell.outputs)) return "";
  return cell.outputs.flatMap((output: unknown) => {
    if (!isRecord(output)) return [];
    if (output.output_type === "error") return notebookText(output.traceback) || notebookText(output.evalue);
    if (output.output_type === "stream") return notebookText(output.text);
    return isRecord(output.data) ? notebookText(output.data["text/plain"]) : "";
  }).filter(Boolean).join("\n");
}
