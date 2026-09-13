import { Editor } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Markdown as MarkdownPreview } from "@/components/Markdown";

import {
  DEFAULT_NOTE_TABLE_MARKDOWN,
  MarkdownNoteTable,
  MarkdownNoteTableCell,
  MarkdownNoteTableHeader,
} from "./note-table";

function createTableEditor(content: string) {
  return new Editor({
    content,
    contentType: "markdown",
    extensions: [
      StarterKit,
      TableKit.configure({ table: false, tableCell: false, tableHeader: false }),
      MarkdownNoteTable.configure({ renderWrapper: true, resizable: false }),
      MarkdownNoteTableCell,
      MarkdownNoteTableHeader,
      Markdown.configure({ markedOptions: { gfm: true } }),
    ],
  });
}

describe("note table markdown", () => {
  it("keeps GFM column alignment in preview and export markup", () => {
    const html = renderToStaticMarkup(
      createElement(
        MarkdownPreview,
        null,
        "| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |"
      )
    );
    expect(html).toContain("text-align:left");
    expect(html).toContain("text-align:center");
    expect(html).toContain("text-align:right");
  });

  it("keeps following source content outside a slash-inserted table", () => {
    const editor = createTableEditor(`${DEFAULT_NOTE_TABLE_MARKDOWN}After table`);
    expect(editor.getJSON().content?.map((node) => node.type)).toEqual(["table", "paragraph"]);
    expect(editor.getText()).toContain("After table");
    editor.destroy();
  });

  it("preserves ordinary pipes in plain, bold and linked table cells", () => {
    const source = [
      "| Plain | Rich | Link | Tail |",
      "| --- | --- | --- | --- |",
      "| a \\| b | **c \\| d** | [e \\| f](https://example.com/a%7Cb) | kept |",
    ].join("\n");
    const first = createTableEditor(source);
    const serialized = first.getMarkdown();
    const second = createTableEditor(serialized);

    expect(serialized).toContain("a \\| b");
    expect(serialized).toContain("**c \\| d**");
    expect(serialized).toContain("kept");
    expect(second.getJSON()).toEqual(first.getJSON());

    first.destroy();
    second.destroy();
  });

  it("preserves significant whitespace inside inline code cells", () => {
    const first = createTableEditor("| A | B |\n| --- | --- |\n| `a  b` | `c\td` |");
    const serialized = first.getMarkdown();
    const second = createTableEditor(serialized);

    expect(serialized).toContain("`a  b`");
    expect(serialized).toContain("`c\td`");
    expect(second.getJSON()).toEqual(first.getJSON());

    first.destroy();
    second.destroy();
  });

  it("keeps the same number of rows if the first row is no longer a header", () => {
    const editor = createTableEditor("| A | B |\n| --- | --- |\n| C | D |");
    editor.commands.setTextSelection(3);
    expect(editor.commands.toggleHeaderRow()).toBe(true);
    const rowsBefore = editor.getJSON().content?.[0]?.content?.length ?? 0;

    const reloaded = createTableEditor(editor.getMarkdown());
    expect(reloaded.getJSON().content?.[0]?.content).toHaveLength(rowsBefore);

    editor.destroy();
    reloaded.destroy();
  });

  it("keeps cells in the single-paragraph subset supported by GFM", () => {
    const editor = createTableEditor("| A | B |\n| --- | --- |\n| C | D |");
    editor.commands.setTextSelection(3);

    expect(editor.commands.toggleHeading({ level: 2 })).toBe(false);
    expect(editor.commands.splitBlock()).toBe(false);
    expect(editor.commands.setHardBreak()).toBe(true);
    expect(editor.getMarkdown()).not.toContain("<br");

    editor.destroy();
  });

  it("round-trips headers, alignment, inline formatting, escaped pipes and following content", () => {
    const source = [
      "| Name | Details |",
      "| :--- | ---: |",
      "| **Graph** | `a\\|b` |",
      "| [Docs](https://example.com) | value |",
      "",
      "## After table",
      "",
      "Kept content.",
    ].join("\n");
    const first = createTableEditor(source);
    const serialized = first.getMarkdown();
    const second = createTableEditor(serialized);

    expect(serialized).toContain("| :");
    expect(serialized).toContain("---:");
    expect(serialized).toContain("`a\\|b`");
    expect(serialized).toContain("## After table");
    expect(second.getJSON()).toEqual(first.getJSON());

    first.destroy();
    second.destroy();
  });

  it("inserts an editable table with a header row", () => {
    const editor = createTableEditor("Start");
    editor.commands.setTextSelection(editor.state.doc.content.size);

    expect(editor.commands.insertTable({ cols: 3, rows: 3, withHeaderRow: true })).toBe(true);
    const markdown = editor.getMarkdown();
    expect(markdown.split("\n").filter((line) => line.includes("|"))).toHaveLength(4);
    expect(editor.getJSON().content?.some((node) => node.type === "table")).toBe(true);

    editor.destroy();
  });
});
