import {
  text,
  type LearnLesson,
  type LessonLocale,
} from "@/lib/learn-lessons";

export type LessonMarkdownHeading = {
  id: string;
  level: 2 | 3;
  text: string;
};

export function slugifyLessonHeading(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "section";
}

export function extractLessonMarkdownHeadings(
  markdown: string
): LessonMarkdownHeading[] {
  const used = new Map<string, number>();
  let fence: string | null = null;

  return markdown.split("\n").flatMap((line) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      fence = fence === marker ? null : fence ?? marker;
      return [];
    }
    if (fence) return [];

    const match = line.match(/^\s*(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!match) return [];
    const label = match[2].replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "").trim();
    const base = slugifyLessonHeading(label);
    const occurrence = used.get(base) ?? 0;
    used.set(base, occurrence + 1);

    return [{
      id: occurrence ? `${base}-${occurrence + 1}` : base,
      level: match[1].length as 2 | 3,
      text: label,
    }];
  });
}

export function buildLegacyLessonMarkdown(
  lesson: LearnLesson,
  locale: LessonLocale
) {
  const transcript = text(lesson.transcript, locale).trim();
  const sections = [transcript];

  for (const block of lesson.theory ?? []) {
    const heading = text(block.heading, locale).trim();
    const body = text(block.body, locale).trim();
    const bullets = block.bullets?.map((item) => `- ${text(item, locale)}`) ?? [];
    sections.push(`## ${heading}\n\n${body}${bullets.length ? `\n\n${bullets.join("\n")}` : ""}`);
  }

  if (lesson.code.trim()) {
    const heading = locale === "ro" ? "Exemplu" : "Example";
    sections.push(`## ${heading}\n\n\`\`\`miniscript\n${lesson.code.trim()}\n\`\`\``);
  }

  if (lesson.sampleInput.trim()) {
    const heading = locale === "ro" ? "Date de intrare" : "Sample input";
    sections.push(`## ${heading}\n\n\`\`\`text\n${lesson.sampleInput.trim()}\n\`\`\``);
  }

  return sections.filter(Boolean).join("\n\n").trim();
}

export function getLessonMarkdown(lesson: LearnLesson, locale: LessonLocale) {
  const localized = lesson.markdown?.[locale]?.trim() || lesson.markdown?.en?.trim();
  return localized || buildLegacyLessonMarkdown(lesson, locale);
}
