import { beforeEach, describe, expect, it, vi } from "vitest";
import { testLesson } from "./test-fixtures/learning";

const mock = vi.hoisted(() => ({ tables: {} as Record<string, unknown[]>, writes: [] as Array<{ table: string; rows: Record<string, unknown>[] }>, deletions: [] as Array<{ table: string; ids: unknown[] }>, error: null as Error | null }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: (table: string) => {
  const builder = {
    select: () => builder, in: () => builder, eq: () => builder, order: () => builder,
    returns: async () => ({ data: mock.tables[table] ?? [], error: mock.error }),
    upsert: async (rows: Record<string, unknown>[]) => { mock.writes.push({ table, rows }); return { error: null }; },
    delete: () => ({ in: async (_column: string, ids: unknown[]) => { mock.deletions.push({ table, ids }); return { error: null }; } }),
  };
  return builder;
} } }));
import { getRoadmapConfigData, readRemoteRoadmapConfig, writeRemoteRoadmapConfig } from "./roadmap-config";
import { learnLessons, learnSections } from "./learn-lessons";

describe("database roadmap content", () => {
  beforeEach(() => { mock.tables = {}; mock.writes = []; mock.deletions = []; mock.error = null; });

  it("does not supply local lessons or sections when the database is empty", async () => {
    expect(learnLessons).toEqual([]);
    expect(learnSections).toEqual([]);
    expect(getRoadmapConfigData().lessons).toEqual([]);
    expect(getRoadmapConfigData().sections).toEqual([]);
    expect(await readRemoteRoadmapConfig()).toBeNull();
  });

  it("reads and saves editor content, quizzes and platform problems without a file fallback", async () => {
    const lesson = testLesson({ markdown: { en: "Database body", ro: "Conținut din bază" }, recommendedProblems: [{ code: 20, href: "/problems/example", title: { en: "Example problem", ro: "Problemă de test" }, topic: "practice" }] });
    const label = { en: "Module", ro: "Modul" };
    mock.tables.learning_paths = [{ id: "path", slug: "miniscript-plus", title_i18n: label, description_i18n: {}, kind: "foundation", language: "msp", availability: "published", order_index: 1 }];
    mock.tables.learning_units = [{ id: "unit", path_id: "path", slug: "unit", title_i18n: label, description_i18n: { __roadmap: { label } }, order_index: 1 }];
    mock.tables.lessons = [{ id: "database-id", unit_id: "unit", slug: lesson.id, title_i18n: lesson.title, summary_i18n: lesson.summary, content_i18n: { markdown: lesson.markdown, __roadmap: { kind: lesson.kind, recommendedProblems: lesson.recommendedProblems, unlockRule: lesson.unlockRule } }, transcript_i18n: lesson.transcript, quiz: lesson.quiz, requires_correct_quiz: true, required_problem_codes: [], completion_requirement: "required", is_published: true, order_index: 1 }];
    const config = await readRemoteRoadmapConfig();
    expect(config?.lessons).toHaveLength(1);
    expect(config?.lessons[0].markdown).toEqual(lesson.markdown);
    expect(config?.lessons[0].quiz).toEqual(lesson.quiz);
    expect(config?.lessons[0].recommendedProblems).toEqual(lesson.recommendedProblems);
    expect(config?.categories).toHaveLength(1);
    await writeRemoteRoadmapConfig(config!);
    const saved = mock.writes.find(write => write.table === "lessons")!.rows[0];
    expect(saved.id).toBe("database-id");
    expect(saved.quiz).toEqual(lesson.quiz);
    expect(saved.content_i18n).toMatchObject({ markdown: lesson.markdown, __roadmap: { recommendedProblems: lesson.recommendedProblems } });
    expect(mock.writes.find(write => write.table === "learning_units")!.rows[0].description_i18n).toMatchObject({ __roadmap: { label } });
  });

  it("surfaces database errors instead of inventing a local course", async () => {
    mock.error = new Error("Database unavailable");
    await expect(readRemoteRoadmapConfig()).rejects.toThrow("Database unavailable");
  });
  it("rejects a missing quiz before writing any part of the roadmap", async () => {
    await expect(writeRemoteRoadmapConfig({ categories: [], connections: [], lessons: [testLesson({ quiz: [] })], nodes: [], sectionFrames: [], sections: [], updatedAt: "", version: 1 })).rejects.toThrow("valid bilingual quiz");
    expect(mock.writes).toEqual([]);
  });
  it("does not delete a draft path absent from the editor's loaded snapshot", async () => {
    mock.tables.learning_paths = [{ id: "hidden-draft", slug: "complexity-analysis", description_i18n: {}, availability: "draft" }];
    await writeRemoteRoadmapConfig({ categories: [], connections: [], lessons: [], nodes: [], sectionFrames: [], sections: [], updatedAt: "", version: 1 });
    expect(mock.deletions).toEqual([]);
  });
});
