import {
  learnLessons,
  learnSections,
  type LearnLesson,
  type LearnSection,
} from "@/lib/learn-lessons";
import { supabase } from "@/lib/supabase";

export type RoadmapConfigNode = {
  id: string;
  sectionId: string;
  x: number;
  y: number;
};

export type RoadmapConnectionSide = "top" | "right" | "bottom" | "left";

export type RoadmapConfigConnection = {
  id: string;
  sourceId: string;
  sourceSide: RoadmapConnectionSide;
  targetId: string;
  targetSide: RoadmapConnectionSide;
};

export type RoadmapSectionFrame = {
  height: number;
  sectionId: string;
  width: number;
  x: number;
  y: number;
};

export type RoadmapCategory = {
  description: {
    en: string;
    ro: string;
  };
  id: string;
  order: number;
  sectionIds: string[];
  title: {
    en: string;
    ro: string;
  };
};

export type RoadmapConfig = {
  categories: RoadmapCategory[];
  connections: RoadmapConfigConnection[];
  lessons: LearnLesson[];
  nodes: RoadmapConfigNode[];
  sectionFrames: RoadmapSectionFrame[];
  sections: LearnSection[];
  updatedAt: string;
  version: 1;
};

export const roadmapConfigKey = "scripticx.roadmapConfig.v1";
export const roadmapConfigEvent = "scripticx:roadmap-config";
export const roadmapConfigId = "default";
const roadmapMetadataKey = "__roadmap";
const defaultCategoryIds = {
  miniscript: "miniscript-roadmap",
  complexity: "complexity-analysis",
} as const;

export const defaultRoadmapCategories: RoadmapCategory[] = [
  {
    id: defaultCategoryIds.miniscript,
    order: 1,
    sectionIds: learnSections
      .filter((section) => !section.id.startsWith("complexity-"))
      .map((section) => section.id),
    title: { en: "MiniScript+ Roadmap", ro: "Roadmap MiniScript+" },
    description: {
      en: "A guided learning path with short lessons, visual execution and practice after every concept.",
      ro: "Un traseu ghidat cu lecții scurte, execuție vizuală și exerciții după fiecare concept.",
    },
  },
  {
    id: defaultCategoryIds.complexity,
    order: 2,
    sectionIds: learnSections
      .filter((section) => section.id.startsWith("complexity-"))
      .map((section) => section.id),
    title: { en: "Complexity Analysis", ro: "Analiza complexității" },
    description: {
      en: "Understand Big-O, loop nesting, AST-based estimates and memory usage.",
      ro: "Înțelege Big-O, bucle imbricate, estimări pe AST și memoria folosită.",
    },
  },
];

function categoryIdFromPathSlug(slug: string) {
  return slug === "miniscript-plus" ? defaultCategoryIds.miniscript : slug;
}

function pathSlugFromCategoryId(id: string) {
  return id === defaultCategoryIds.miniscript ? "miniscript-plus" : id;
}

function categoryIdForStaticSection(sectionId: string) {
  return sectionId.startsWith("complexity-")
    ? defaultCategoryIds.complexity
    : defaultCategoryIds.miniscript;
}

type RemoteRoadmapLayout = {
  connections?: RoadmapConfigConnection[];
  deletedCategoryIds?: string[];
  deletedSectionIds?: string[];
  nodes?: RoadmapConfigNode[];
  sectionFrames?: RoadmapSectionFrame[];
};

type RemotePathDescription = Partial<RoadmapCategory["description"]> & {
  __roadmap?: RemoteRoadmapLayout;
};

type RemoteLearningPathRow = {
  description_i18n: RemotePathDescription | null;
  id: string;
  order_index: number | null;
  slug: string;
  title_i18n: Partial<RoadmapCategory["title"]> | null;
};

type RemoteUnitRoadmapMetadata = {
  frame?: RoadmapSectionFrame;
};

type RemoteUnitDescription = Partial<LearnSection["description"]> & {
  __roadmap?: RemoteUnitRoadmapMetadata;
};

type RemoteUnitRow = {
  description_i18n: RemoteUnitDescription | null;
  id: string;
  order_index: number | null;
  path_id: string | null;
  slug: string;
  title_i18n: Partial<LearnSection["title"]> | null;
};

type RemoteLessonRow = {
  content_i18n: Record<string, unknown> | null;
  example_code: string | null;
  id: string;
  is_published: boolean | null;
  level: LearnLesson["level"] | null;
  order_index: number | null;
  quiz: LearnLesson["quiz"] | null;
  sample_input: string | null;
  slug: string;
  summary_i18n: Partial<LearnLesson["summary"]> | null;
  tags: string[] | null;
  title_i18n: Partial<LearnLesson["title"]> | null;
  transcript_i18n: Partial<LearnLesson["transcript"]> | null;
  unit_id: string | null;
  youtube_url: string | null;
};

type RemoteRoadmapMetadata = {
  connections?: RoadmapConfigConnection[];
  kind?: LearnLesson["kind"];
  node?: RoadmapConfigNode;
  recommendedProblems?: LearnLesson["recommendedProblems"];
  theory?: LearnLesson["theory"];
  unlockRule?: LearnLesson["unlockRule"];
};

function getConnectionSides(
  source: RoadmapConfigNode,
  target: RoadmapConfigNode
): Pick<RoadmapConfigConnection, "sourceSide" | "targetSide"> {
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0
      ? { sourceSide: "right", targetSide: "left" }
      : { sourceSide: "left", targetSide: "right" };
  }

  return deltaY >= 0
    ? { sourceSide: "bottom", targetSide: "top" }
    : { sourceSide: "top", targetSide: "bottom" };
}

export function buildDefaultRoadmapConnections(
  nodes: RoadmapConfigNode[],
  sections: LearnSection[]
): RoadmapConfigConnection[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return sections.flatMap((section) =>
    section.lessonIds.slice(0, -1).flatMap((sourceId, index) => {
      const targetId = section.lessonIds[index + 1];
      const source = nodeById.get(sourceId);
      const target = nodeById.get(targetId);
      if (!source || !target) return [];

      return [
        {
          id: `${sourceId}--${targetId}`,
          sourceId,
          targetId,
          ...getConnectionSides(source, target),
        },
      ];
    })
  );
}

function mergeDefaultSections(
  remoteSections: LearnSection[],
  remoteLessons: LearnLesson[],
  deletedSectionIds: string[] = []
) {
  const remoteSectionIds = new Set(remoteSections.map((section) => section.id));
  const remoteLessonIds = new Set(remoteLessons.map((lesson) => lesson.id));
  const deletedSectionIdSet = new Set(deletedSectionIds);
  const missingSections = learnSections.map((section) => {
    if (remoteSectionIds.has(section.id) || deletedSectionIdSet.has(section.id)) {
      return null;
    }

    return {
      ...section,
      lessonIds: section.lessonIds.filter((lessonId) => !remoteLessonIds.has(lessonId)),
    };
  });

  return [
    ...remoteSections,
    ...missingSections.filter((section): section is LearnSection => Boolean(section)),
  ];
}

function mergeDefaultCategories(
  remoteCategories: RoadmapCategory[],
  remoteSections: LearnSection[],
  deletedCategoryIds: string[] = []
) {
  const remoteCategoryIds = new Set(remoteCategories.map((category) => category.id));
  const remoteSectionIds = new Set(remoteSections.map((section) => section.id));
  const deletedCategoryIdSet = new Set(deletedCategoryIds);
  const merged = [...remoteCategories];

  for (const defaultCategory of defaultRoadmapCategories) {
    if (deletedCategoryIdSet.has(defaultCategory.id)) continue;
    if (remoteCategoryIds.has(defaultCategory.id)) {
      const category = merged.find((item) => item.id === defaultCategory.id);
      if (category) {
        category.sectionIds = Array.from(
          new Set([
            ...category.sectionIds,
            ...defaultCategory.sectionIds.filter((sectionId) => !remoteSectionIds.has(sectionId)),
          ])
        );
      }
      continue;
    }

    merged.push(defaultCategory);
  }

  return merged.sort((a, b) => a.order - b.order);
}

export function readRoadmapConfig(): RoadmapConfig | null {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(
      localStorage.getItem(roadmapConfigKey) || "null"
    ) as (RoadmapConfig & {
      categories?: RoadmapCategory[];
      sectionFrames?: RoadmapSectionFrame[];
    }) | null;

    if (!parsed?.lessons?.length || !parsed.sections?.length) return null;

    const connections =
      parsed.connections ?? buildDefaultRoadmapConnections(parsed.nodes, parsed.sections);

    return {
      ...parsed,
      categories:
        parsed.categories?.length
          ? parsed.categories
          : defaultRoadmapCategories.map((category) => ({
              ...category,
              sectionIds: parsed.sections
                .filter(
                  (section) =>
                    categoryIdForStaticSection(section.id) === category.id
                )
                .map((section) => section.id),
            })),
      connections,
      sectionFrames: parsed.sectionFrames ?? [],
    };
  } catch {
    return null;
  }
}

export function writeRoadmapConfig(config: RoadmapConfig) {
  if (typeof window === "undefined") return;

  localStorage.setItem(roadmapConfigKey, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent(roadmapConfigEvent, { detail: config }));
}

export async function readRemoteRoadmapConfig(): Promise<RoadmapConfig | null> {
  const { data: pathRows, error: pathError } = await supabase
    .from("learning_paths")
    .select("id, slug, title_i18n, description_i18n, order_index")
    .order("order_index", { ascending: true })
    .returns<RemoteLearningPathRow[]>();

  if (pathError) throw pathError;
  if (!pathRows?.length) return null;

  const [{ data: unitRows, error: unitError }, { data: lessonRows, error: lessonError }] =
    await Promise.all([
      supabase
        .from("learning_units")
        .select("id, path_id, slug, title_i18n, description_i18n, order_index")
        .in("path_id", pathRows.map((path) => path.id))
        .order("order_index", { ascending: true })
        .returns<RemoteUnitRow[]>(),
      supabase
        .from("lessons")
        .select("id, unit_id, slug, title_i18n, summary_i18n, content_i18n, transcript_i18n, youtube_url, example_code, sample_input, quiz, tags, level, estimated_minutes, order_index, is_published")
        .order("order_index", { ascending: true })
        .returns<(RemoteLessonRow & { estimated_minutes: number | null })[]>(),
    ]);

  if (unitError) throw unitError;
  if (lessonError) throw lessonError;
  if (!unitRows?.length && !lessonRows?.length) return null;

  const categories: RoadmapCategory[] = pathRows.map((path, index) => ({
    id: categoryIdFromPathSlug(path.slug),
    order: path.order_index ?? index + 1,
    sectionIds: [],
    title: {
      en: path.title_i18n?.en ?? path.slug,
      ro: path.title_i18n?.ro ?? path.title_i18n?.en ?? path.slug,
    },
    description: {
      en: path.description_i18n?.en ?? "",
      ro: path.description_i18n?.ro ?? path.description_i18n?.en ?? "",
    },
  }));
  const categoryByPathId = new Map(
    pathRows.map((path, index) => [path.id, categories[index]])
  );
  const savedLayout = pathRows
    .map((path) => path.description_i18n?.[roadmapMetadataKey])
    .find(
      (layout): layout is RemoteRoadmapLayout =>
        Boolean(
          layout &&
            (Array.isArray(layout.nodes) ||
              Array.isArray(layout.sectionFrames) ||
              Array.isArray(layout.connections))
        )
    );

  const units: LearnSection[] = (unitRows ?? []).map((unit, index) => {
    const category = unit.path_id ? categoryByPathId.get(unit.path_id) : undefined;
    if (category) category.sectionIds.push(unit.slug);

    return {
    id: unit.slug,
    order: unit.order_index ?? index + 1,
    label: {
      en: unit.title_i18n?.en ?? unit.slug,
      ro: unit.title_i18n?.ro ?? unit.title_i18n?.en ?? unit.slug,
    },
    title: {
      en: unit.title_i18n?.en ?? unit.slug,
      ro: unit.title_i18n?.ro ?? unit.title_i18n?.en ?? unit.slug,
    },
    description: {
      en: unit.description_i18n?.en ?? "",
      ro: unit.description_i18n?.ro ?? unit.description_i18n?.en ?? "",
    },
    lessonIds: [],
    };
  });
  const sectionByUnitId = new Map(
    (unitRows ?? []).map((unit, index) => [unit.id, units[index]])
  );
  const unitSectionFrames = (unitRows ?? []).flatMap((unit) => {
    const frame = unit.description_i18n?.[roadmapMetadataKey]?.frame;
    return frame ? [{ ...frame, sectionId: unit.slug }] : [];
  });
  const sectionFrames = savedLayout?.sectionFrames ?? unitSectionFrames;

  const hasLessonConnections = (lessonRows ?? []).some((row) => {
    const metadata = (row.content_i18n?.[roadmapMetadataKey] ??
      {}) as RemoteRoadmapMetadata;
    return Array.isArray(metadata.connections);
  });
  const lessonConnections = (lessonRows ?? []).flatMap((row) => {
    const metadata = (row.content_i18n?.[roadmapMetadataKey] ??
      {}) as RemoteRoadmapMetadata;
    return metadata.connections ?? [];
  });
  const hasExplicitConnections =
    Array.isArray(savedLayout?.connections) || hasLessonConnections;
  const remoteConnections = savedLayout?.connections ?? lessonConnections;

  const lessons = (lessonRows ?? []).map((row, index) => {
    const metadata = (row.content_i18n?.[roadmapMetadataKey] ??
      {}) as RemoteRoadmapMetadata;
    const section = row.unit_id ? sectionByUnitId.get(row.unit_id) : undefined;

    if (section) section.lessonIds.push(row.slug);

    return {
      id: row.slug,
      order: row.order_index ?? index + 1,
      unit: section?.title ?? { en: "Roadmap", ro: "Roadmap" },
      title: {
        en: row.title_i18n?.en ?? row.slug,
        ro: row.title_i18n?.ro ?? row.title_i18n?.en ?? row.slug,
      },
      summary: {
        en: row.summary_i18n?.en ?? "",
        ro: row.summary_i18n?.ro ?? row.summary_i18n?.en ?? "",
      },
      transcript: {
        en: row.transcript_i18n?.en ?? "",
        ro: row.transcript_i18n?.ro ?? row.transcript_i18n?.en ?? "",
      },
      videoUrl: row.youtube_url ?? undefined,
      tags: row.tags ?? [],
      level: row.level ?? "beginner",
      minutes: row.estimated_minutes ?? 8,
      sampleInput: row.sample_input ?? "",
      code: row.example_code ?? "",
      quiz: row.quiz ?? [],
      recommendedProblems: metadata.recommendedProblems ?? [],
      kind: metadata.kind,
      theory: metadata.theory,
      unlockRule: metadata.unlockRule,
    } satisfies LearnLesson;
  });

  const savedNodeById = new Map(
    (savedLayout?.nodes ?? []).map((node) => [node.id, node])
  );
  const remoteNodes = lessons.map((lesson, index) => {
    const row = (lessonRows ?? [])[index];
    const metadata = (row.content_i18n?.[roadmapMetadataKey] ??
      {}) as RemoteRoadmapMetadata;
    const section = row.unit_id ? sectionByUnitId.get(row.unit_id) : undefined;

    return (
      savedNodeById.get(lesson.id) ?? metadata.node ?? {
        id: lesson.id,
        sectionId: section?.id ?? units[0]?.id ?? "roadmap",
        x: 120 + (index % 4) * 340,
        y: 120 + Math.floor(index / 4) * 160,
      }
    );
  });

  const mergedSections = mergeDefaultSections(
    units,
    lessons,
    savedLayout?.deletedSectionIds
  );
  const remoteLessonIds = new Set(lessons.map((lesson) => lesson.id));
  const mergedLessons = [
    ...lessons,
    ...learnLessons.filter((lesson) => !remoteLessonIds.has(lesson.id)),
  ];

  const remoteNodeById = new Map(remoteNodes.map((node) => [node.id, node]));
  const sectionByLessonId = new Map<string, string>();
  mergedSections.forEach((section) => {
    section.lessonIds.forEach((lessonId) => sectionByLessonId.set(lessonId, section.id));
  });

  const nodes = mergedLessons.map(
    (lesson, index) =>
      remoteNodeById.get(lesson.id) ?? {
        id: lesson.id,
        sectionId:
          sectionByLessonId.get(lesson.id) ??
          mergedSections[0]?.id ??
          "roadmap",
        x: 120 + (index % 4) * 340,
        y: 120 + Math.floor(index / 4) * 160,
      }
  );

  const connections = hasExplicitConnections
    ? remoteConnections.filter(
        (connection) =>
          nodes.some((node) => node.id === connection.sourceId) &&
          nodes.some((node) => node.id === connection.targetId)
      )
    : buildDefaultRoadmapConnections(nodes, mergedSections);

  return {
    categories: mergeDefaultCategories(
      categories,
      units,
      savedLayout?.deletedCategoryIds
    ),
    connections,
    lessons: mergedLessons,
    nodes,
    sectionFrames,
    sections: mergedSections,
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}

export async function writeRemoteRoadmapConfig(config: RoadmapConfig) {
  const { data: existingPaths, error: pathsReadError } = await supabase
    .from("learning_paths")
    .select("id, slug, description_i18n")
    .returns<
      Array<{
        description_i18n: RemotePathDescription | null;
        id: string;
        slug: string;
      }>
    >();

  if (pathsReadError) throw pathsReadError;

  const pathIdByCategoryId = new Map(
    (existingPaths ?? []).map((path) => [
      categoryIdFromPathSlug(path.slug),
      path.id,
    ])
  );
  const existingPathByCategoryId = new Map(
    (existingPaths ?? []).map((path) => [categoryIdFromPathSlug(path.slug), path])
  );
  const pathRows = config.categories.map((category, index) => {
    const existing = existingPathByCategoryId.get(category.id);
    const id = existing?.id ?? crypto.randomUUID();
    pathIdByCategoryId.set(category.id, id);

    return {
      id,
      slug: pathSlugFromCategoryId(category.id),
      title_i18n: category.title,
      description_i18n: {
        ...(existing?.description_i18n ?? {}),
        ...category.description,
        ...(index === 0
          ? {
              [roadmapMetadataKey]: {
                connections: config.connections,
                deletedCategoryIds: defaultRoadmapCategories
                  .filter(
                    (defaultCategory) =>
                      !config.categories.some(
                        (category) => category.id === defaultCategory.id
                      )
                  )
                  .map((category) => category.id),
                deletedSectionIds: learnSections
                  .filter(
                    (defaultSection) =>
                      !config.sections.some(
                        (section) => section.id === defaultSection.id
                      )
                  )
                  .map((section) => section.id),
                nodes: config.nodes,
                sectionFrames: config.sectionFrames,
              },
            }
          : {}),
      },
      language: "msp",
      order_index: category.order ?? index + 1,
      is_published: true,
    };
  });

  const { error: pathsError } = await supabase
    .from("learning_paths")
    .upsert(pathRows, { onConflict: "id" });

  if (pathsError) throw pathsError;

  const { data: existingUnits, error: unitsReadError } = await supabase
    .from("learning_units")
    .select("id, slug, description_i18n")
    .returns<Array<{ description_i18n: RemoteUnitDescription | null; id: string; slug: string }>>();

  if (unitsReadError) throw unitsReadError;

  const existingUnitBySectionId = new Map(
    (existingUnits ?? []).map((unit) => [unit.slug, unit])
  );
  const unitIdBySectionId = new Map(
    (existingUnits ?? []).map((unit) => [unit.slug, unit.id])
  );
  const frameBySectionId = new Map(
    config.sectionFrames.map((frame) => [frame.sectionId, frame])
  );
  const categoryBySectionId = new Map<string, RoadmapCategory>();
  config.categories.forEach((category) => {
    category.sectionIds.forEach((sectionId) =>
      categoryBySectionId.set(sectionId, category)
    );
  });
  const unitRows = config.sections.map((section, index) => {
    const existing = existingUnitBySectionId.get(section.id);
    const id = existing?.id ?? crypto.randomUUID();
    unitIdBySectionId.set(section.id, id);
    const category =
      categoryBySectionId.get(section.id) ?? config.categories[0];

    return {
      id,
      path_id: pathIdByCategoryId.get(category.id),
      slug: section.id,
      title_i18n: section.title,
      description_i18n: {
        ...(existing?.description_i18n ?? {}),
        ...section.description,
        [roadmapMetadataKey]: {
          ...(existing?.description_i18n?.[roadmapMetadataKey] ?? {}),
          frame: frameBySectionId.get(section.id),
        },
      },
      order_index: section.order ?? index + 1,
      is_published: true,
    };
  });

  const { error: unitsError } = await supabase
    .from("learning_units")
    .upsert(unitRows, { onConflict: "id" });

  if (unitsError) throw unitsError;

  const { data: existingLessons, error: lessonsReadError } = await supabase
    .from("lessons")
    .select("id, slug, content_i18n")
    .returns<Array<{ content_i18n: Record<string, unknown> | null; id: string; slug: string }>>();

  if (lessonsReadError) throw lessonsReadError;

  const existingLessonBySlug = new Map(
    (existingLessons ?? []).map((lesson) => [lesson.slug, lesson])
  );
  const nodeByLessonId = new Map(config.nodes.map((node) => [node.id, node]));
  const sectionByLessonId = new Map<string, LearnSection>();

  config.sections.forEach((section) => {
    section.lessonIds.forEach((lessonId) => sectionByLessonId.set(lessonId, section));
  });

  const lessonRows = config.lessons.map((lesson, index) => {
    const existing = existingLessonBySlug.get(lesson.id);
    const section = sectionByLessonId.get(lesson.id) ?? config.sections[0];
    const existingContent = existing?.content_i18n ?? {};

    return {
      id: existing?.id ?? crypto.randomUUID(),
      unit_id: unitIdBySectionId.get(section.id),
      slug: lesson.id,
      title_i18n: lesson.title,
      summary_i18n: lesson.summary,
      content_i18n: {
        ...existingContent,
        [roadmapMetadataKey]: {
          connections: config.connections.filter(
            (connection) => connection.sourceId === lesson.id
          ),
          kind: lesson.kind,
          node: nodeByLessonId.get(lesson.id),
          recommendedProblems: lesson.recommendedProblems,
          theory: lesson.theory,
          unlockRule: lesson.unlockRule,
        },
      },
      transcript_i18n: lesson.transcript,
      youtube_url: lesson.videoUrl ?? null,
      example_code: lesson.code,
      sample_input: lesson.sampleInput,
      quiz: lesson.quiz,
      tags: lesson.tags,
      level: lesson.level,
      estimated_minutes: lesson.minutes,
      order_index: lesson.order ?? index + 1,
      is_published: true,
    };
  });

  if (lessonRows.length > 0) {
    const { error: lessonsError } = await supabase
      .from("lessons")
      .upsert(lessonRows, { onConflict: "id" });

    if (lessonsError) throw lessonsError;
  }

  const savedSlugs = new Set(config.lessons.map((lesson) => lesson.id));
  const localConfig = readRoadmapConfig();
  const removableSlugs = new Set([
    ...learnLessons.map((lesson) => lesson.id),
    ...(localConfig?.lessons ?? []).map((lesson) => lesson.id),
  ]);
  const deletedSlugs = [...removableSlugs].filter((slug) => !savedSlugs.has(slug));

  if (deletedSlugs.length > 0) {
    const { error: deleteError } = await supabase
      .from("lessons")
      .delete()
      .in("slug", deletedSlugs);

    if (deleteError) throw deleteError;
  }

  const savedSectionIds = new Set(config.sections.map((section) => section.id));
  const removableSectionIds = new Set([
    ...learnSections.map((section) => section.id),
    ...(localConfig?.sections ?? []).map((section) => section.id),
  ]);
  const deletedUnitIds = (existingUnits ?? [])
    .filter(
      (unit) =>
        removableSectionIds.has(unit.slug) && !savedSectionIds.has(unit.slug)
    )
    .map((unit) => unit.id);

  if (deletedUnitIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("learning_units")
      .delete()
      .in("id", deletedUnitIds);

    if (deleteError) throw deleteError;
  }

  const savedCategoryIds = new Set(
    config.categories.map((category) => category.id)
  );
  const removableCategoryIds = new Set([
    ...defaultRoadmapCategories.map((category) => category.id),
    ...(localConfig?.categories ?? []).map((category) => category.id),
  ]);
  const deletedPathIds = (existingPaths ?? [])
    .filter((path) => {
      const categoryId = categoryIdFromPathSlug(path.slug);
      return (
        removableCategoryIds.has(categoryId) &&
        !savedCategoryIds.has(categoryId)
      );
    })
    .map((path) => path.id);

  if (deletedPathIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("learning_paths")
      .delete()
      .in("id", deletedPathIds);

    if (deleteError) throw deleteError;
  }
}

export function clearRoadmapConfig() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(roadmapConfigKey);
  window.dispatchEvent(new CustomEvent(roadmapConfigEvent));
}

export function getRoadmapConfigData(config?: RoadmapConfig | null) {
  return {
    categories: config?.categories?.length
      ? config.categories
      : defaultRoadmapCategories,
    lessons: config?.lessons?.length ? config.lessons : learnLessons,
    connections:
      config?.connections ??
      buildDefaultRoadmapConnections(config?.nodes ?? [], config?.sections ?? learnSections),
    sectionFrames: config?.sectionFrames ?? [],
    sections: config?.sections?.length ? config.sections : learnSections,
  };
}
