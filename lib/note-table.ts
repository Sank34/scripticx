import type { JSONContent, MarkdownRendererHelpers } from "@tiptap/core";
import { Table, TableCell, TableHeader } from "@tiptap/extension-table";

type TableAlignment = "center" | "left" | "right" | null;

type SerializedCell = {
  align: TableAlignment;
  text: string;
};

export const DEFAULT_NOTE_TABLE_MARKDOWN = [
  "| Column 1 | Column 2 | Column 3 |",
  "| --- | --- | --- |",
  "|  |  |  |",
  "|  |  |  |",
  "",
  "",
].join("\n");

/**
 * GFM tables can only persist one line per cell. These extensions keep the
 * visual schema inside that lossless subset and use a serializer that escapes
 * literal pipes before they can be mistaken for column delimiters.
 */
export const MarkdownNoteTable = Table.extend({
  renderMarkdown(node, helpers) {
    return renderNoteTableMarkdown(node, helpers);
  },
});

export const MarkdownNoteTableCell = TableCell.extend({
  content: "paragraph",
});

export const MarkdownNoteTableHeader = TableHeader.extend({
  content: "paragraph",
});

export function renderNoteTableMarkdown(
  node: JSONContent,
  helpers: MarkdownRendererHelpers
) {
  const rows = (node.content ?? []).map((row) =>
    (row.content ?? []).map<SerializedCell>((cell) => ({
      align: normalizeAlignment(cell.attrs?.align),
      text: escapeTablePipes(renderCell(cell, helpers)),
    }))
  );
  const columnCount = rows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  if (!columnCount) return "";

  const header = rows[0] ?? [];
  const alignments = Array.from<TableAlignment>({ length: columnCount }).fill(null);
  rows.forEach((row) => {
    row.forEach((cell, index) => {
      alignments[index] ||= cell.align;
    });
  });

  const widths = Array.from<number>({ length: columnCount }).fill(3);
  rows.forEach((row) => {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index], cell.text.length);
    });
  });

  const formatRow = (row: SerializedCell[]) =>
    `| ${Array.from({ length: columnCount }, (_, index) =>
      (row[index]?.text ?? "").padEnd(widths[index], " ")
    ).join(" | ")} |`;
  const separator = `| ${widths
    .map((width, index) => formatSeparator(width, alignments[index]))
    .join(" | ")} |`;
  const body = rows.slice(1).map(formatRow);

  // Markdown requires a header row. If an older in-memory document somehow
  // has ordinary cells in row one, promote that row instead of adding a new
  // empty row and changing the table's size after reload.
  return `\n${[formatRow(header), separator, ...body].join("\n")}\n`;
}

function renderCell(cell: JSONContent, helpers: MarkdownRendererHelpers) {
  const rendered = (cell.content ?? [])
    .map((child) => helpers.renderChildren(child))
    .join(" ");

  return rendered
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/[ \t]*\r?\n[ \t]*/g, " ")
    .trim();
}

function escapeTablePipes(value: string) {
  let escaped = "";
  let precedingBackslashes = 0;

  for (const character of value) {
    if (character === "|") {
      if (precedingBackslashes % 2 === 0) escaped += "\\";
      escaped += character;
      precedingBackslashes = 0;
      continue;
    }

    escaped += character;
    precedingBackslashes = character === "\\" ? precedingBackslashes + 1 : 0;
  }

  return escaped;
}

function normalizeAlignment(value: unknown): TableAlignment {
  return value === "center" || value === "left" || value === "right" ? value : null;
}

function formatSeparator(width: number, alignment: TableAlignment) {
  const dashes = "-".repeat(Math.max(3, width));
  if (alignment === "left") return `:${dashes}`;
  if (alignment === "right") return `${dashes}:`;
  if (alignment === "center") return `:${dashes}:`;
  return dashes;
}
