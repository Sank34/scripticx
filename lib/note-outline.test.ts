import { describe, expect, it } from "vitest";

import { buildNoteOutline, getVisualMarkdownSupport } from "./note-outline";

describe("buildNoteOutline", () => {
  it("collects headings and task checkpoints with source offsets", () => {
    const markdown = "# Intro\ntext\n## Plan\n- [ ] Learn graphs\n  - [x] Draw one";
    expect(buildNoteOutline(markdown)).toMatchObject([
      { depth: 1, kind: "heading", line: 1, offset: 0, text: "Intro" },
      { depth: 2, kind: "heading", line: 3, text: "Plan" },
      { checked: false, kind: "task", line: 4, text: "Learn graphs" },
      { checked: true, depth: 2, kind: "task", line: 5, text: "Draw one" },
    ]);
  });

  it("ignores headings and tasks inside fenced code", () => {
    const markdown = "```md\n# fake\n```\n~~~md\n## also fake\n- [ ] fake\n~~~\n# Real";
    expect(buildNoteOutline(markdown)).toMatchObject([{ kind: "heading", text: "Real" }]);
  });

  it("collects setext headings with stable source identities", () => {
    const markdown = "Repeated\n========\n\nRepeated\n--------";
    const items = buildNoteOutline(markdown);
    expect(items).toMatchObject([
      { depth: 1, line: 1, offset: 0, text: "Repeated" },
      { depth: 2, line: 4, text: "Repeated" },
    ]);
    expect(items[0].id).not.toBe(items[1].id);
  });
});

describe("getVisualMarkdownSupport", () => {
  it("flags constructs that cannot safely round-trip through the visual editor", () => {
    expect(getVisualMarkdownSupport("| A |\n| --- |\n| x |\n\n[^1]: hi").unsupported).toEqual(["footnotes"]);
    expect(getVisualMarkdownSupport("[![alt](image.png)](https://example.com)").supported).toBe(false);
  });

  it("accepts GFM tables while protecting frontmatter and nested linked images", () => {
    expect(getVisualMarkdownSupport("A | B\n- | :-\nx | y").supported).toBe(true);
    expect(getVisualMarkdownSupport("A | B\n--- | ---\nx | y").supported).toBe(true);
    expect(getVisualMarkdownSupport("---\ntitle: Lesson\n---\n# Body").unsupported).toContain("frontmatter");
    expect(
      getVisualMarkdownSupport("[![diagram](<https://img.test/a_(1).png>)](https://site.test/a_(1))").unsupported
    ).toContain("linked-images");
  });

  it("accepts ordinary headings, lists, tasks and images", () => {
    expect(getVisualMarkdownSupport("# Hi\n- [ ] Task\n![alt](<https://example.com/a.png>)").supported).toBe(true);
  });

  it("keeps tables nested in lists in source mode because GFM cannot round-trip them visually", () => {
    const nested = "- | A | B |\n  | --- | --- |\n  | x | y |";
    expect(getVisualMarkdownSupport(nested).unsupported).toContain("nested-tables");
    expect(getVisualMarkdownSupport("```md\n- | A | B |\n  | --- | --- |\n```").supported).toBe(true);
  });
});
