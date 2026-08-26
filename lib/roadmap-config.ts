import {
  getLessonCompletionRequirement,
  getLessonRule,
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

export type LearningPathKind =
  | "foundation"
  | "specialization"
  | "supplemental";

export type LearningPathAvailability =
  | "draft"
  | "coming_soon"
  | "published"
  | "archived";

export type RoadmapCategory = {
  accentColor?: string;
  availability: LearningPathAvailability;
  databaseId?: string;
  description: {
    en: string;
    ro: string;
  };
  estimatedHours?: number;
  id: string;
  icon?: string;
  kind: LearningPathKind;
  language: string;
  order: number;
  prerequisitePathId?: string | null;
  sectionIds: string[];
  slug: string;
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
const legacyMiniScriptCategoryId = "miniscript-roadmap";
const foundationPathSlug = "miniscript-plus";
const staticLessonById = new Map(
  learnLessons.map((lesson) => [lesson.id, lesson])
);

export const defaultRoadmapCategories: RoadmapCategory[] = [
  {
    accentColor: "#10b981",
    availability: "published",
    estimatedHours: 12,
    id: foundationPathSlug,
    icon: "braces",
    kind: "foundation",
    language: "msp",
    order: 1,
    prerequisitePathId: null,
    sectionIds: learnSections
      .filter((section) => section.pathSlug === foundationPathSlug)
      .map((section) => section.id),
    title: { en: "MiniScript+ Roadmap", ro: "Roadmap MiniScript+" },
    slug: foundationPathSlug,
    description: {
      en: "A guided learning path with short lessons, visual execution and practice after every concept.",
      ro: "Un traseu ghidat cu lecții scurte, execuție vizuală și exerciții după fiecare concept.",
    },
  },
  {
    accentColor: "#8b5cf6",
    availability: "published",
    estimatedHours: 4,
    id: "complexity-analysis",
    icon: "chart",
    kind: "supplemental",
    language: "msp",
    order: 2,
    prerequisitePathId: null,
    sectionIds: learnSections
      .filter((section) => section.pathSlug === "complexity-analysis")
      .map((section) => section.id),
    title: { en: "Complexity Analysis", ro: "Analiza complexității" },
    slug: "complexity-analysis",
    description: {
      en: "Understand Big-O, loop nesting, AST-based estimates and memory usage.",
      ro: "Înțelege Big-O, bucle imbricate, estimări pe AST și memoria folosită.",
    },
  },
  {
    accentColor: "#3776ab",
    availability: "coming_soon",
    estimatedHours: 24,
    id: "python",
    icon: "python",
    kind: "specialization",
    language: "python",
    order: 3,
    prerequisitePathId: foundationPathSlug,
    sectionIds: [],
    slug: "python",
    title: { en: "Python", ro: "Python" },
    description: {
      en: "Turn your algorithmic foundation into practical Python programs.",
      ro: "Transformă fundația algoritmică în programe practice scrise în Python.",
    },
  },
  {
    accentColor: "#f7df1e",
    availability: "coming_soon",
    estimatedHours: 26,
    id: "javascript",
    icon: "javascript",
    kind: "specialization",
    language: "javascript",
    order: 4,
    prerequisitePathId: foundationPathSlug,
    sectionIds: [],
    slug: "javascript",
    title: { en: "JavaScript", ro: "JavaScript" },
    description: {
      en: "Build interactive web experiences with modern JavaScript.",
      ro: "Construiește experiențe web interactive cu JavaScript modern.",
    },
  },
  {
    accentColor: "#00599c",
    availability: "coming_soon",
    estimatedHours: 30,
    id: "cpp",
    icon: "cpp",
    kind: "specialization",
    language: "cpp",
    order: 5,
    prerequisitePathId: foundationPathSlug,
    sectionIds: [],
    slug: "cpp",
    title: { en: "C++", ro: "C++" },
    description: {
      en: "Go deeper into performance, data structures and competitive algorithms.",
      ro: "Aprofundează performanța, structurile de date și algoritmica de concurs.",
    },
  },
];

function normalizeRoadmapCategory(
  category: Partial<RoadmapCategory> &
    Pick<RoadmapCategory, "description" | "id" | "order" | "sectionIds" | "title">,
  index = 0
): RoadmapCategory {
  const normalizedId =
    category.id === legacyMiniScriptCategoryId
      ? foundationPathSlug
      : category.id;
  const fallback = defaultRoadmapCategories.find(
    (item) => item.id === normalizedId
  );
  const slug = category.slug ?? fallback?.slug ?? normalizedId;

  return {
    accentColor: category.accentColor ?? fallback?.accentColor,
    availability:
      category.availability ?? fallback?.availability ?? "published",
    databaseId: category.databaseId,
    description: category.description,
    estimatedHours: category.estimatedHours ?? fallback?.estimatedHours,
    icon: category.icon ?? fallback?.icon,
    id: normalizedId,
    kind: category.kind ?? fallback?.kind ?? "specialization",
    language: category.language ?? fallback?.language ?? slug,
    order: category.order ?? index + 1,
    prerequisitePathId:
      category.prerequisitePathId === legacyMiniScriptCategoryId
        ? foundationPathSlug
        : category.prerequisitePathId ?? fallback?.prerequisitePathId ?? null,
    sectionIds: category.sectionIds,
    slug,
    title: category.title,
  };
}

export function getCategoryForSection(
  categories: RoadmapCategory[],
  sectionId: string
) {
  return categories.find((category) => category.sectionIds.includes(sectionId));
}

export function getCategoryForLesson(
  categories: RoadmapCategory[],
  sections: LearnSection[],
  lessonId: string
) {
  const section = sections.find((item) => item.lessonIds.includes(lessonId));
  return section ? getCategoryForSection(categories, section.id) : undefined;
}

function categoryIdForStaticSection(sectionId: string) {
  const section = learnSections.find((item) => item.id === sectionId);
  return (
    defaultRoadmapCategories.find(
      (category) => category.slug === section?.pathSlug
    )?.id ?? defaultRoadmapCategories[0].id
  );
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
  accent_color: string | null;
  availability: LearningPathAvailability | null;
  description_i18n: RemotePathDescription | null;
  estimated_hours: number | null;
  id: string;
  icon: string | null;
  kind: LearningPathKind | null;
  language: string | null;
  order_index: number | null;
  prerequisite_path_id: string | null;
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
  completion_requirement: LearnLesson["completionRequirement"] | null;
  content_i18n: Record<string, unknown> | null;
  example_code: string | null;
  id: string;
  is_published: boolean | null;
  level: LearnLesson["level"] | null;
  order_index: number | null;
  quiz: LearnLesson["quiz"] | null;
  required_problem_codes: number[] | null;
  requires_correct_quiz: boolean | null;
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

type RemoteLessonContent = Record<string, unknown> & {
  markdown?: Partial<NonNullable<LearnLesson["markdown"]>>;
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
  const normalizedRemoteCategories = remoteCategories.map((category, index) =>
    normalizeRoadmapCategory(category, index)
  );
  const remoteCategoryIds = new Set(
    normalizedRemoteCategories.map((category) => category.id)
  );
  const remoteSectionIds = new Set(remoteSections.map((section) => section.id));
  const deletedCategoryIdSet = new Set(deletedCategoryIds);
  const merged = [...normalizedRemoteCategories];

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
          ? parsed.categories.map((category, index) =>
              normalizeRoadmapCategory(category, index)
            )
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
    .select("id, slug, title_i18n, description_i18n, language, kind, prerequisite_path_id, availability, estimated_hours, icon, accent_color, order_index")
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
        .select("id, unit_id, slug, title_i18n, summary_i18n, content_i18n, transcript_i18n, youtube_url, example_code, sample_input, quiz, tags, level, estimated_minutes, completion_requirement, requires_correct_quiz, required_problem_codes, order_index, is_published")
        .order("order_index", { ascending: true })
        .returns<(RemoteLessonRow & { estimated_minutes: number | null })[]>(),
    ]);

  if (unitError) throw unitError;
  if (lessonError) throw lessonError;
  if (!unitRows?.length && !lessonRows?.length) return null;

  const categoryIdByPathId = new Map(
    pathRows.map((path) => [path.id, path.slug])
  );
  const categories: RoadmapCategory[] = pathRows.map((path, index) => ({
    accentColor: path.accent_color ?? undefined,
    availability: path.availability ?? "published",
    databaseId: path.id,
    estimatedHours: path.estimated_hours ?? undefined,
    id: path.slug,
    icon: path.icon ?? undefined,
    kind: path.kind ?? "specialization",
    language: path.language ?? "msp",
    order: path.order_index ?? index + 1,
    prerequisitePathId: path.prerequisite_path_id
      ? categoryIdByPathId.get(path.prerequisite_path_id) ?? null
      : null,
    sectionIds: [],
    slug: path.slug,
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
    pathSlug: category?.slug,
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
    const content = (row.content_i18n ?? {}) as RemoteLessonContent;
    const metadata = (content[roadmapMetadataKey] ??
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
    const content = (row.content_i18n ?? {}) as RemoteLessonContent;
    const metadata = (row.content_i18n?.[roadmapMetadataKey] ??
      {}) as RemoteRoadmapMetadata;
    const section = row.unit_id ? sectionByUnitId.get(row.unit_id) : undefined;
    const staticLesson = staticLessonById.get(row.slug);
    const isLegacySparseLesson = Boolean(
      staticLesson &&
        !row.youtube_url &&
        !row.example_code?.trim() &&
        !row.sample_input?.trim() &&
        !(row.quiz?.length ?? 0) &&
        !row.transcript_i18n?.en?.trim() &&
        !row.transcript_i18n?.ro?.trim() &&
        !(metadata.theory?.length ?? 0)
    );
    const fallbackLesson = isLegacySparseLesson ? staticLesson : undefined;
    const fallbackRequiredProblemCodes =
      fallbackLesson && row.completion_requirement === "capstone"
        ? fallbackLesson.recommendedProblems
            .slice(0, 1)
            .map((problem) => problem.code)
            .filter((code): code is number => typeof code === "number")
        : undefined;
    const fallbackRequiresCorrectQuiz = fallbackLesson
      ? (row.completion_requirement === "required" ||
          row.completion_requirement === "capstone") &&
        fallbackLesson.quiz.length > 0
      : undefined;

    if (section) section.lessonIds.push(row.slug);

    return {
      id: row.slug,
      order: row.order_index ?? index + 1,
      unit: section?.title ?? { en: "Roadmap", ro: "Roadmap" },
      title: {
        en: fallbackLesson?.title.en ?? row.title_i18n?.en ?? row.slug,
        ro:
          fallbackLesson?.title.ro ??
          row.title_i18n?.ro ??
          row.title_i18n?.en ??
          row.slug,
      },
      summary: {
        en: fallbackLesson?.summary.en ?? row.summary_i18n?.en ?? "",
        ro:
          fallbackLesson?.summary.ro ??
          row.summary_i18n?.ro ??
          row.summary_i18n?.en ??
          "",
      },
      transcript: {
        en: fallbackLesson?.transcript.en ?? row.transcript_i18n?.en ?? "",
        ro:
          fallbackLesson?.transcript.ro ??
          row.transcript_i18n?.ro ??
          row.transcript_i18n?.en ??
          "",
      },
      markdown: content.markdown
        ? {
            en: content.markdown.en ?? content.markdown.ro ?? "",
            ro: content.markdown.ro ?? content.markdown.en ?? "",
          }
        : fallbackLesson?.markdown,
      videoUrl: fallbackLesson?.videoUrl ?? row.youtube_url ?? undefined,
      tags: fallbackLesson?.tags ?? row.tags ?? [],
      level: fallbackLesson?.level ?? row.level ?? "beginner",
      minutes: fallbackLesson?.minutes ?? row.estimated_minutes ?? 8,
      sampleInput: fallbackLesson?.sampleInput ?? row.sample_input ?? "",
      code: fallbackLesson?.code ?? row.example_code ?? "",
      quiz: fallbackLesson?.quiz ?? row.quiz ?? [],
      recommendedProblems:
        fallbackLesson?.recommendedProblems ?? metadata.recommendedProblems ?? [],
      kind: metadata.kind ?? fallbackLesson?.kind,
      completionRequirement: row.completion_requirement ?? undefined,
      theory: fallbackLesson?.theory ?? metadata.theory,
      unlockRule: {
        ...metadata.unlockRule,
        requiredProblemCodes:
          fallbackRequiredProblemCodes ??
          row.required_problem_codes?.filter((code) => code > 0) ??
          metadata.unlockRule?.requiredProblemCodes,
        requiresCorrectQuiz:
          fallbackRequiresCorrectQuiz ??
          row.requires_correct_quiz ??
          metadata.unlockRule?.requiresCorrectQuiz,
      },
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
    (existingPaths ?? []).map((path) => [path.slug, path.id])
  );
  const existingPathByCategoryId = new Map(
    (existingPaths ?? []).map((path) => [path.slug, path])
  );
  config.categories.forEach((category) => {
    const existing =
      (category.databaseId
        ? (existingPaths ?? []).find((path) => path.id === category.databaseId)
        : undefined) ?? existingPathByCategoryId.get(category.slug);
    if (existing) {
      pathIdByCategoryId.set(category.id, existing.id);
    }
    if (!pathIdByCategoryId.has(category.id)) {
      pathIdByCategoryId.set(category.id, crypto.randomUUID());
    }
  });
  const pathRows = config.categories.map((category, index) => {
    const existing =
      (category.databaseId
        ? (existingPaths ?? []).find((path) => path.id === category.databaseId)
        : undefined) ?? existingPathByCategoryId.get(category.slug);
    const id = existing?.id ?? pathIdByCategoryId.get(category.id)!;
    pathIdByCategoryId.set(category.id, id);

    return {
      id,
      slug: category.slug || category.id,
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
      language: category.language,
      kind: category.kind,
      prerequisite_path_id: category.prerequisitePathId
        ? pathIdByCategoryId.get(category.prerequisitePathId) ?? null
        : null,
      availability: category.availability,
      estimated_hours: category.estimatedHours ?? null,
      icon: category.icon ?? null,
      accent_color: category.accentColor ?? null,
      order_index: category.order ?? index + 1,
      is_published:
        category.availability === "published" ||
        category.availability === "coming_soon",
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
    const rule = getLessonRule(lesson);

    return {
      id: existing?.id ?? crypto.randomUUID(),
      unit_id: unitIdBySectionId.get(section.id),
      slug: lesson.id,
      title_i18n: lesson.title,
      summary_i18n: lesson.summary,
      content_i18n: {
        ...existingContent,
        markdown: lesson.markdown,
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
      completion_requirement: getLessonCompletionRequirement(lesson),
      requires_correct_quiz: rule.requiresCorrectQuiz,
      required_problem_codes: rule.requiredProblemCodes,
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

  const savedCategorySlugs = new Set(
    config.categories.map((category) => category.slug)
  );
  const removableCategorySlugs = new Set([
    ...defaultRoadmapCategories.map((category) => category.slug),
    ...(localConfig?.categories ?? []).map((category) => category.slug),
  ]);
  const deletedPathIds = (existingPaths ?? [])
    .filter(
      (path) =>
        removableCategorySlugs.has(path.slug) &&
        !savedCategorySlugs.has(path.slug)
    )
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
      ? config.categories.map((category, index) =>
          normalizeRoadmapCategory(category, index)
        )
      : defaultRoadmapCategories,
    lessons: config?.lessons?.length ? config.lessons : learnLessons,
    connections:
      config?.connections ??
      buildDefaultRoadmapConnections(config?.nodes ?? [], config?.sections ?? learnSections),
    sectionFrames: config?.sectionFrames ?? [],
    sections: config?.sections?.length ? config.sections : learnSections,
  };
}
