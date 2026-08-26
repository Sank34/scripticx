import { describe, expect, it } from "vitest";

import {
  extractDocsHeadings,
  normalizeDocsSlug,
  parseDocsMarkdown,
  prepareDocsMarkdown,
} from "@/lib/docs-content";

describe("parseDocsMarkdown", () => {
  it("reads page metadata without leaking frontmatter into the article", () => {
    const page = parseDocsMarkdown(`---
title: Loops
description: Repeat instructions safely.
slug: /language/loops
sidebar_position: 3
keywords: [loops, MiniScript+]
---

## WHILE loops

Content.`);

    expect(page.frontmatter).toMatchObject({
      title: "Loops",
      description: "Repeat instructions safely.",
      slug: "/language/loops",
      sidebarPosition: 3,
      keywords: ["loops", "MiniScript+"],
    });
    expect(page.content).toBe("## WHILE loops\n\nContent.");
  });

  it("extracts unique heading anchors and ignores headings inside code fences", () => {
    expect(
      extractDocsHeadings(`## Setup

\`\`\`md
## Not a heading
\`\`\`

## Setup
### Run code`),
    ).toEqual([
      { depth: 2, id: "setup", title: "Setup" },
      { depth: 2, id: "setup-2", title: "Setup" },
      { depth: 3, id: "run-code", title: "Run code" },
    ]);
  });

  it("handles documents written with CRLF line endings", () => {
    const page = parseDocsMarkdown(
      "---\r\ntitle: Windows document\r\n---\r\n\r\n## Content\r\n",
    );
    expect(page.content).toBe("## Content");
  });
});

describe("documentation Markdown helpers", () => {
  it("normalizes public docs paths safely", () => {
    expect(normalizeDocsSlug(["language", "loops"])).toBe("language/loops");
    expect(normalizeDocsSlug("/docs/../basics")).toBe("basics");
  });

  it("converts Docusaurus admonitions to safe GFM blockquotes", () => {
    expect(prepareDocsMarkdown(":::tip[Remember]\nUse **clear names**.\n:::"))
      .toBe("> [!TIP] Remember\n> \n> Use **clear names**.");
  });
});
