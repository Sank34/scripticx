import { describe, expect, it } from "vitest";

import {
  extractLessonMarkdownHeadings,
  getLessonMarkdown,
} from "@/lib/lesson-markdown";
import type { LearnLesson } from "@/lib/learn-lessons";

const lesson = {
  id: "demo",
  order: 1,
  unit: { en: "Unit", ro: "Unitate" },
  title: { en: "Demo", ro: "Demo" },
  summary: { en: "", ro: "" },
  transcript: { en: "Legacy body", ro: "Conținut vechi" },
  tags: [], level: "beginner", minutes: 5, sampleInput: "", code: "PRINT 1",
  quiz: [], recommendedProblems: [],
} satisfies LearnLesson;

describe("lesson markdown", () => {
  it("uses canonical localized markdown and falls back to legacy lesson data", () => {
    expect(getLessonMarkdown({ ...lesson, markdown: { en: "# New", ro: "# Nou" } }, "ro")).toBe("# Nou");
    expect(getLessonMarkdown(lesson, "en")).toContain("Legacy body");
    expect(getLessonMarkdown(lesson, "en")).toContain("```miniscript");
  });

  it("builds stable table-of-contents entries and ignores code fences", () => {
    expect(extractLessonMarkdownHeadings("## Intro\n### Demo\n```md\n## Fake\n```\n## Intro")).toEqual([
      { id: "intro", level: 2, text: "Intro" },
      { id: "demo", level: 3, text: "Demo" },
      { id: "intro-2", level: 2, text: "Intro" },
    ]);
  });
});
