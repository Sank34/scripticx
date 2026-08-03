"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ClipboardList,
  Code2,
  Copy,
  Eye,
  EyeOff,
  Grip,
  Link2,
  Maximize2,
  Minus,
  MousePointer2,
  Plus,
  Save,
  Search,
  Settings2,
  Shuffle,
  Sparkles,
  Timer,
  Trash2,
  Trophy,
  Play,
  Video,
} from "lucide-react";

import RouteGuard from "@/components/RouteGuard";
import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getLessonKind,
  getLessonRule,
  learnLessons,
  learnSections,
  text,
  type LearnLesson,
  type LearnSection,
  type LessonRuleKind,
  type LessonLocale,
} from "@/lib/learn-lessons";
import {
  clearRoadmapConfig,
  defaultRoadmapCategories,
  getRoadmapConfigData,
  readRoadmapConfig,
  readRemoteRoadmapConfig,
  writeRoadmapConfig,
  writeRemoteRoadmapConfig,
  type RoadmapConfig,
  type RoadmapCategory,
} from "@/lib/roadmap-config";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CanvasNode = {
  id: string;
  lesson: LearnLesson;
  sectionId: string;
  x: number;
  y: number;
};

type DragState =
  | {
      type: "nodes";
      ids: string[];
      startX: number;
      startY: number;
      origins: Record<string, { x: number; y: number }>;
    }
  | { type: "canvas"; startX: number; startY: number; originX: number; originY: number }
  | { type: "selection"; startX: number; startY: number; currentX: number; currentY: number }
  | null;

type QuizDraft = {
  answerIndex: number;
  options: string[];
  question: string;
};

type LessonDraft = {
  code: string;
  kind: NonNullable<LearnLesson["kind"]>;
  level: LearnLesson["level"];
  locked: boolean;
  minutes: number;
  quiz: QuizDraft[];
  requiredProblemCodes: string;
  requiresCorrectQuiz: boolean;
  sampleInput: string;
  summary: string;
  tags: string;
  title: string;
  transcript: string;
  videoUrl: string;
};

type SelectionRect = {
  currentX: number;
  currentY: number;
  startX: number;
  startY: number;
};

type ClipboardNode = {
  draft: LessonDraft;
  node: CanvasNode;
  offsetX: number;
  offsetY: number;
};

const NODE_WIDTH = 210;
const NODE_HEIGHT = 94;
const NODE_COLUMN_GAP = 340;
const NODE_ROW_GAP = 150;
const SECTION_COLUMNS = 4;
const SECTION_GAP = 310;
const STAGE_SIZE = 2200;
const MIN_ZOOM = 55;
const MAX_ZOOM = 125;

const ruleStyles = {
  required: {
    badge: "border-zinc-200 bg-zinc-50 text-zinc-700",
    border: "border-zinc-200",
    icon: "bg-zinc-300",
    node: "bg-white",
  },
  bonus: {
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    border: "border-sky-100",
    icon: "bg-sky-400",
    node: "bg-sky-50/50",
  },
  challenge: {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    border: "border-amber-100",
    icon: "bg-amber-400",
    node: "bg-amber-50/50",
  },
  theory: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    border: "border-emerald-100",
    icon: "bg-emerald-500",
    node: "bg-emerald-50/50",
  },
  video: {
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    border: "border-blue-100",
    icon: "bg-blue-500",
    node: "bg-blue-50/50",
  },
  assessment: {
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    border: "border-violet-100",
    icon: "bg-violet-500",
    node: "bg-violet-50/50",
  },
} as const;

const copy = {
  en: {
    title: "Lesson Roadmap Configurator",
    subtitle: "Arrange lesson nodes, tune metadata, and shape quiz blocks before wiring persistence.",
    back: "Admin",
    save: "Save",
    saving: "Saving...",
    addMenu: "Add item",
    addCategory: "New category",
    addVideo: "Video lesson",
    addTheory: "Theory lesson",
    addChallenge: "Code challenge",
    addAssessment: "Evaluation quiz",
    addSection: "New section",
    duplicate: "Duplicate selected",
    copy: "Copy selected",
    paste: "Paste",
    delete: "Delete selected",
    hideWidgets: "Hide widgets",
    showWidgets: "Show widgets",
    keybinds: "Space + drag to pan, Ctrl + wheel to zoom",
    newLesson: "New lesson",
    preview: "Preview",
    nodes: "Nodes",
    sections: "Sections",
    quizItems: "Quiz items",
    selected: "Selected lesson",
    lesson: "Lesson",
    kind: "Type",
    quiz: "Quiz",
    content: "Content",
    search: "Search lesson...",
    reset: "Reset layout",
    canvas: "Roadmap canvas",
    canvasHint: "Drag nodes or the background. Use zoom for large roadmap passes.",
    section: "Section",
    sectionDetails: "Section details",
    sectionDescription: "Section description",
    sectionNamePrompt: "Section name",
    sectionTitle: "Section title",
    category: "Category",
    categoryDetails: "Category details",
    categoryDescription: "Category description",
    categoryNamePrompt: "Category name",
    categoryTitle: "Category title",
    cancel: "Cancel",
    create: "Create",
    level: "Level",
    minutes: "Minutes",
    video: "Video URL",
    titleLabel: "Title",
    summary: "Summary",
    transcript: "Transcript",
    tags: "Tags",
    code: "Starter code",
    sampleInput: "Sample input",
    quizConfig: "Quiz configuration",
    question: "Question",
    options: "Options",
    correct: "Correct answer",
    addQuestion: "Add question",
    requiredQuiz: "Requires correct quiz",
    requiredProblems: "Required problems",
    visualRules: "Unlock rules",
    unlockStatus: "Access",
    ruleKind: "Rule type",
    unlocked: "Unlocked",
    locked: "Locked",
    saveSuccess: "Roadmap changes saved",
    saveError: "Could not save roadmap changes",
    localFallback: "Loaded local roadmap draft. Supabase could not be reached.",
    addedLesson: "Lesson added",
    deletedLesson: "Lesson deleted",
    duplicatedLesson: "Lesson duplicated",
    pastedLessons: "Lessons pasted",
    addedSection: "Section added",
    resetDone: "Roadmap reset",
  },
  ro: {
    title: "Configurator Roadmap Lecții",
    subtitle: "Aranjează nodurile, ajustează metadata și configurează quiz-urile înainte de persistare.",
    back: "Admin",
    save: "Salvează",
    saving: "Se salvează...",
    addMenu: "Adaugă",
    addCategory: "Categorie nouă",
    addVideo: "Lecție video",
    addTheory: "Lecție teorie",
    addChallenge: "Code challenge",
    addAssessment: "Quiz de evaluare",
    addSection: "Secțiune nouă",
    duplicate: "Duplică selecția",
    copy: "Copiază selecția",
    paste: "Lipește",
    delete: "Șterge selecția",
    hideWidgets: "Ascunde widget-uri",
    showWidgets: "Arată widget-uri",
    keybinds: "Space + drag pentru pan, Ctrl + wheel pentru zoom",
    newLesson: "Lecție nouă",
    preview: "Preview",
    nodes: "Noduri",
    sections: "Secțiuni",
    quizItems: "Întrebări quiz",
    selected: "Lecția selectată",
    lesson: "Lecție",
    kind: "Tip",
    quiz: "Quiz",
    content: "Conținut",
    search: "Caută lecție...",
    reset: "Resetează layout",
    canvas: "Canvas roadmap",
    canvasHint: "Mută nodurile sau fundalul. Folosește zoom pentru roadmap-uri mari.",
    section: "Secțiune",
    sectionDetails: "Detalii secțiune",
    sectionDescription: "Descriere secțiune",
    sectionNamePrompt: "Nume secțiune",
    sectionTitle: "Titlu secțiune",
    category: "Categorie",
    categoryDetails: "Detalii categorie",
    categoryDescription: "Descriere categorie",
    categoryNamePrompt: "Nume categorie",
    categoryTitle: "Titlu categorie",
    cancel: "Anulează",
    create: "Creează",
    level: "Nivel",
    minutes: "Minute",
    video: "URL video",
    titleLabel: "Titlu",
    summary: "Rezumat",
    transcript: "Transcript",
    tags: "Tag-uri",
    code: "Cod starter",
    sampleInput: "Input exemplu",
    quizConfig: "Configurare quiz",
    question: "Întrebare",
    options: "Opțiuni",
    correct: "Răspuns corect",
    addQuestion: "Adaugă întrebare",
    requiredQuiz: "Necesită quiz corect",
    requiredProblems: "Probleme obligatorii",
    visualRules: "Reguli de deblocare",
    unlockStatus: "Acces",
    ruleKind: "Tip regulă",
    unlocked: "Deblocat",
    locked: "Blocat",
    saveSuccess: "Modificările roadmap-ului au fost salvate",
    saveError: "Nu am putut salva modificările roadmap-ului",
    localFallback: "Am încărcat draft-ul local. Supabase nu a putut fi accesat.",
    addedLesson: "Lecție adăugată",
    deletedLesson: "Lecție ștearsă",
    duplicatedLesson: "Lecție duplicată",
    pastedLessons: "Lecții lipite",
    addedSection: "Secțiune adăugată",
    resetDone: "Roadmap resetat",
  },
} as const;

function buildInitialSections() {
  return [...learnSections];
}

function buildInitialCategories() {
  return defaultRoadmapCategories.map((category) => ({ ...category }));
}

function buildInitialNodes(
  sections: LearnSection[] = learnSections,
  lessons: LearnLesson[] = learnLessons,
  savedNodes?: CanvasNode[]
): CanvasNode[] {
  if (savedNodes?.length) return savedNodes;

  let sectionY = 120;

  return sections.flatMap((section) => {
    const sectionNodes = section.lessonIds
      .map((lessonId, lessonIndex) => {
        const lesson = lessons.find((item) => item.id === lessonId);
        if (!lesson) return null;
        const row = Math.floor(lessonIndex / SECTION_COLUMNS);
        const column = lessonIndex % SECTION_COLUMNS;

        return {
          id: lesson.id,
          lesson,
          sectionId: section.id,
          x: 120 + column * NODE_COLUMN_GAP,
          y: sectionY + row * NODE_ROW_GAP,
        };
      })
      .filter((node): node is CanvasNode => Boolean(node));

    const rowCount = Math.max(
      1,
      Math.ceil(section.lessonIds.length / SECTION_COLUMNS)
    );
    sectionY += rowCount * NODE_ROW_GAP + SECTION_GAP - NODE_ROW_GAP;

    return sectionNodes;
  });
}

function buildInitialDrafts(
  locale: LessonLocale,
  lessons: LearnLesson[] = learnLessons
): Record<string, LessonDraft> {
  return Object.fromEntries(
    lessons.map((lesson) => {
      const rule = getLessonRule(lesson);

      return [
        lesson.id,
        {
        code: lesson.code,
        kind: getLessonKind(lesson),
        level: lesson.level,
        locked:
          lesson.unlockRule?.locked ??
          (rule.requiresCorrectQuiz || rule.requiredProblemCodes.length > 0),
        minutes: lesson.minutes,
        quiz: lesson.quiz.map((question) => ({
          answerIndex: question.answerIndex,
          options: question.options.map((option) => text(option, locale)),
          question: text(question.question, locale),
        })),
        requiredProblemCodes: rule.requiredProblemCodes.join(", "),
        requiresCorrectQuiz: rule.requiresCorrectQuiz,
        sampleInput: lesson.sampleInput,
        summary: text(lesson.summary, locale),
        tags: lesson.tags.join(", "),
        title: text(lesson.title, locale),
        transcript: text(lesson.transcript, locale),
        videoUrl: lesson.videoUrl ?? "",
        },
      ];
    })
  );
}

function buildAdminState(locale: LessonLocale) {
  const config = readRoadmapConfig();
  const { lessons, sections } = getRoadmapConfigData(config);
  const savedNodes = config?.nodes
    ?.map((node) => {
      const lesson = lessons.find((item) => item.id === node.id);
      if (!lesson) return null;

      return {
        id: node.id,
        lesson,
        sectionId: node.sectionId,
        x: node.x,
        y: node.y,
      };
    })
    .filter((node): node is CanvasNode => Boolean(node));

  const nodes = buildInitialNodes(sections, lessons, savedNodes);

  return {
    categories: config?.categories?.length
      ? config.categories
      : buildInitialCategories(),
    drafts: buildInitialDrafts(locale, lessons),
    nodes,
    sections,
  };
}

function getDraftRuleKind(lesson: LearnLesson, draft?: LessonDraft) {
  if (draft?.kind === "theory") return "theory";
  if (draft?.kind === "assessment") return "assessment";
  if (draft?.kind === "challenge" || draft?.level === "challenge") return "challenge";
  if (draft?.kind === "video") return "video";

  return getLessonRule(lesson).kind;
}

function createLessonShell(
  id: string,
  kind: NonNullable<LearnLesson["kind"]>,
  order: number,
  locale: LessonLocale
): LearnLesson {
  const titles = {
    interactive: locale === "ro" ? "Lecție interactivă nouă" : "New interactive lesson",
    theory: locale === "ro" ? "Lecție de teorie nouă" : "New theory lesson",
    video: locale === "ro" ? "Lecție video nouă" : "New video lesson",
    challenge: locale === "ro" ? "Challenge nou" : "New code challenge",
    assessment: locale === "ro" ? "Quiz de evaluare nou" : "New evaluation quiz",
  } satisfies Record<NonNullable<LearnLesson["kind"]>, string>;
  const title = titles[kind];
  const summary =
    locale === "ro"
      ? "Configurează obiectivul, conținutul și quiz-ul acestei lecții."
      : "Configure the goal, content, and quiz for this lesson.";
  const hasCode = kind === "challenge" || kind === "interactive";
  const hasQuiz = kind !== "theory";

  return {
    id,
    order,
    unit: { en: "Draft", ro: "Draft" },
    title: { en: title, ro: title },
    summary: { en: summary, ro: summary },
    transcript: { en: "", ro: "" },
    videoUrl: kind === "video" ? "https://youtube.com/..." : undefined,
    tags: [kind],
    level:
      kind === "challenge" || kind === "assessment"
        ? "challenge"
        : kind === "theory"
          ? "beginner"
          : "practice",
    minutes: 8,
    sampleInput: "",
    code: hasCode ? "INPUT N\nPRINT N" : "",
    quiz: hasQuiz
      ? [
          {
            question: { en: "What should students understand?", ro: "Ce trebuie să înțeleagă elevii?" },
            options: [
              { en: "The core idea", ro: "Ideea principală" },
              { en: "Only syntax", ro: "Doar sintaxa" },
              { en: "Nothing yet", ro: "Nimic momentan" },
            ],
            answerIndex: 0,
          },
        ]
      : [],
    recommendedProblems: [],
    kind,
    theory:
      kind === "theory"
        ? [
            {
              heading: { en: title, ro: title },
              body: { en: summary, ro: summary },
            },
          ]
        : undefined,
  };
}

function materializeLesson(
  node: CanvasNode,
  draft: LessonDraft,
  order: number,
  section: LearnSection | undefined
): LearnLesson {
  const tags = draft.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const requiredProblemCodes = draft.requiredProblemCodes
    .split(",")
    .map((code) => Number(code.trim()))
    .filter((code) => Number.isFinite(code));
  const ruleKind: LessonRuleKind =
    draft.kind === "challenge" || draft.kind === "assessment"
      ? "challenge"
      : draft.kind === "theory"
        ? "required"
        : "required";

  return {
    ...node.lesson,
    code: draft.code,
    kind: draft.kind,
    level: draft.level,
    minutes: draft.minutes,
    order,
    quiz: draft.quiz.map((question) => ({
      answerIndex: Math.min(
        Math.max(question.answerIndex, 0),
        Math.max(question.options.length - 1, 0)
      ),
      options: question.options.map((option) => ({ en: option, ro: option })),
      question: { en: question.question, ro: question.question },
    })),
    recommendedProblems: node.lesson.recommendedProblems ?? [],
    sampleInput: draft.sampleInput,
    summary: { en: draft.summary, ro: draft.summary },
    tags,
    theory:
      draft.kind === "theory"
        ? [
            {
              heading: { en: draft.title, ro: draft.title },
              body: { en: draft.transcript || draft.summary, ro: draft.transcript || draft.summary },
              bullets: tags.map((tag) => ({ en: tag, ro: tag })),
            },
          ]
        : node.lesson.theory,
    title: { en: draft.title, ro: draft.title },
    transcript: { en: draft.transcript, ro: draft.transcript },
    unit: section?.title ?? node.lesson.unit,
    unlockRule: {
      kind: ruleKind,
      locked: draft.locked,
      requiredProblemCodes: draft.locked ? requiredProblemCodes : [],
      requiresCorrectQuiz: draft.locked ? draft.requiresCorrectQuiz : false,
    },
    videoUrl: draft.videoUrl || undefined,
  };
}

function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable=true]"
    )
  );
}

function isCanvasWidgetTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(target.closest("[data-canvas-widget]"));
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function getSelectionBounds(rect: SelectionRect) {
  return {
    left: Math.min(rect.startX, rect.currentX),
    top: Math.min(rect.startY, rect.currentY),
    width: Math.abs(rect.currentX - rect.startX),
    height: Math.abs(rect.currentY - rect.startY),
  };
}

function LessonsAdminContent() {
  const { locale } = useLanguage();
  const lessonLocale = (locale === "ro" ? "ro" : "en") as LessonLocale;
  const c = copy[lessonLocale];
  const [categories, setCategories] = useState<RoadmapCategory[]>(() =>
    buildAdminState(lessonLocale).categories
  );
  const [sections, setSections] = useState<LearnSection[]>(() =>
    buildAdminState(lessonLocale).sections
  );
  const [nodes, setNodes] = useState<CanvasNode[]>(() =>
    buildAdminState(lessonLocale).nodes
  );
  const [drafts, setDrafts] = useState<Record<string, LessonDraft>>(() =>
    buildAdminState(lessonLocale).drafts
  );
  const [selectedId, setSelectedId] = useState(nodes[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    nodes[0]?.id ? [nodes[0].id] : []
  );
  const [selectedSectionId, setSelectedSectionId] = useState(
    nodes[0]?.sectionId ?? sections[0]?.id ?? ""
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id ?? ""
  );
  const [createDialogType, setCreateDialogType] = useState<
    "category" | "section" | null
  >(null);
  const [createName, setCreateName] = useState("");
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState([84]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [widgetsHidden, setWidgetsHidden] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const dragRef = useRef<DragState>(null);
  const clipboardRef = useRef<ClipboardNode[]>([]);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const selectedNode =
    nodes.find((node) => node.id === selectedId) ?? (selectedId ? nodes[0] : undefined);
  const selectedLesson = selectedNode?.lesson;
  const selectedDraft = selectedLesson ? drafts[selectedLesson.id] : null;
  const selectedSection = selectedNode
    ? sections.find((section) => section.id === selectedNode.sectionId)
    : null;
  const selectedSectionDetails =
    selectedSection ??
    sections.find((section) => section.id === selectedSectionId) ??
    null;
  const selectedCategoryDetails =
    categories.find((category) => category.id === selectedCategoryId) ??
    categories.find((category) =>
      selectedSectionDetails
        ? category.sectionIds.includes(selectedSectionDetails.id)
        : false
    ) ??
    null;
  const selectedRule =
    selectedNode && selectedDraft
      ? getLessonRule(
          materializeLesson(
            selectedNode,
            selectedDraft,
            selectedNode.lesson.order,
            selectedSection ?? undefined
          )
        )
      : null;
  const scale = zoom[0] / 100;

  const nodeCount = nodes.length;
  const quizCount = Object.values(drafts).reduce(
    (total, draft) => total + draft.quiz.length,
    0
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRemoteConfig() {
      try {
        const remoteConfig = await readRemoteRoadmapConfig();
        if (cancelled || !remoteConfig) return;

        writeRoadmapConfig(remoteConfig);
        const { categories, lessons, sections } = getRoadmapConfigData(remoteConfig);
        const remoteNodes = buildInitialNodes(
          sections,
          lessons,
          remoteConfig.nodes
            .map((node) => {
              const lesson = lessons.find((item) => item.id === node.id);
              if (!lesson) return null;

              return {
                id: node.id,
                lesson,
                sectionId: node.sectionId,
                x: node.x,
                y: node.y,
              };
            })
            .filter((node): node is CanvasNode => Boolean(node))
        );

        setCategories(categories);
        setSections(sections);
        setNodes(remoteNodes);
        setDrafts(buildInitialDrafts(lessonLocale, lessons));
        setSelectedId(remoteNodes[0]?.id ?? "");
        setSelectedIds(remoteNodes[0]?.id ? [remoteNodes[0].id] : []);
        setSelectedSectionId(remoteNodes[0]?.sectionId ?? sections[0]?.id ?? "");
        setSelectedCategoryId(
          categories.find((category) =>
            category.sectionIds.includes(remoteNodes[0]?.sectionId ?? sections[0]?.id ?? "")
          )?.id ??
            categories[0]?.id ??
            ""
        );
      } catch {
        if (!cancelled && readRoadmapConfig()) {
          toast.warning(c.localFallback);
        }
      }
    }

    void loadRemoteConfig();

    return () => {
      cancelled = true;
    };
  }, [c.localFallback, lessonLocale]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const activeViewport = viewport;

    function handleNativeWheel(event: WheelEvent) {
      if (isCanvasWidgetTarget(event.target)) return;

      event.preventDefault();

      const rect = activeViewport.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;

      if (event.ctrlKey || event.metaKey) {
        const nextZoom = clampZoom(zoom[0] + (event.deltaY > 0 ? -5 : 5));
        const nextScale = nextZoom / 100;
        const worldX = (pointerX - pan.x) / scale;
        const worldY = (pointerY - pan.y) / scale;

        setZoom([nextZoom]);
        setPan({
          x: pointerX - worldX * nextScale,
          y: pointerY - worldY * nextScale,
        });
        return;
      }

      setPan((current) => ({
        x: current.x - (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX),
        y: current.y - (event.shiftKey && !event.deltaX ? 0 : event.deltaY),
      }));
    }

    activeViewport.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => activeViewport.removeEventListener("wheel", handleNativeWheel);
  }, [pan.x, pan.y, scale, zoom]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.code !== "Space" ||
        isTextEditingTarget(event.target) ||
        isCanvasWidgetTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      setSpacePressed(true);
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        setSpacePressed(false);
        if (dragRef.current?.type === "canvas") {
          dragRef.current = null;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const filteredNodes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return nodes;

    return nodes.filter((node) => {
      const title = (drafts[node.id]?.title ?? text(node.lesson.title, lessonLocale)).toLowerCase();
      const unit = text(node.lesson.unit, lessonLocale).toLowerCase();
      return title.includes(normalized) || unit.includes(normalized) || node.id.includes(normalized);
    });
  }, [drafts, lessonLocale, nodes, query]);

  function resetLayout() {
    clearRoadmapConfig();
    const initialCategories = buildInitialCategories();
    const initialSections = buildInitialSections();
    const initialNodes = buildInitialNodes(initialSections, learnLessons);
    setCategories(initialCategories);
    setSections(initialSections);
    setNodes(initialNodes);
    setDrafts(buildInitialDrafts(lessonLocale));
    setSelectedId(initialNodes[0]?.id ?? "");
    setSelectedIds(initialNodes[0]?.id ? [initialNodes[0].id] : []);
    setSelectedSectionId(initialNodes[0]?.sectionId ?? initialSections[0]?.id ?? "");
    setSelectedCategoryId(initialCategories[0]?.id ?? "");
    setPan({ x: 0, y: 0 });
    setZoom([84]);
    setSelectionRect(null);
    toast.success(c.resetDone);
  }

  async function saveRoadmapConfig() {
    setIsSaving(true);

    const orderedNodes = [...nodes].sort((a, b) => a.y - b.y || a.x - b.x);
    const nextSections = sections.map((section, sectionIndex) => ({
      ...section,
      lessonIds: orderedNodes
        .filter((node) => node.sectionId === section.id)
        .sort((a, b) => a.x - b.x || a.y - b.y)
        .map((node) => node.id),
      order: sectionIndex + 1,
    }));
    const assignedSectionIds = new Set(
      categories.flatMap((category) => category.sectionIds)
    );
    const nextCategories = categories.map((category, categoryIndex) => ({
      ...category,
      order: categoryIndex + 1,
      sectionIds: [
        ...category.sectionIds.filter((sectionId) =>
          nextSections.some((section) => section.id === sectionId)
        ),
        ...nextSections
          .filter((section) => !assignedSectionIds.has(section.id))
          .map((section) => section.id)
          .filter((sectionId) => categoryIndex === 0 && sectionId),
      ],
    }));
    const sectionById = new Map(nextSections.map((section) => [section.id, section]));
    const nextLessons = orderedNodes
      .map((node, index) => {
        const draft = drafts[node.id];
        if (!draft) return null;

        return materializeLesson(
          node,
          draft,
          index + 1,
          sectionById.get(node.sectionId)
        );
      })
      .filter((lesson): lesson is LearnLesson => Boolean(lesson));

    const config: RoadmapConfig = {
      categories: nextCategories,
      lessons: nextLessons,
      nodes: orderedNodes.map((node) => ({
        id: node.id,
        sectionId: node.sectionId,
        x: node.x,
        y: node.y,
      })),
      sections: nextSections,
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    try {
      await writeRemoteRoadmapConfig(config);
      writeRoadmapConfig(config);

      setNodes((current) =>
        current.map((node) => {
          const lesson = nextLessons.find((item) => item.id === node.id);
          return lesson ? { ...node, lesson } : node;
        })
      );
      setSections(nextSections);
      setCategories(nextCategories);
      toast.success(c.saveSuccess);
    } catch (error) {
      const message = error instanceof Error ? error.message : c.saveError;
      toast.error(c.saveError, { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  function slugify(value: string) {
    return (
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || `item-${Date.now().toString(36)}`
    );
  }

  function openCreateDialog(type: "category" | "section") {
    setCreateDialogType(type);
    setCreateName("");
  }

  function closeCreateDialog() {
    setCreateDialogType(null);
    setCreateName("");
  }

  function createCategory(title: string) {
    const id = `category-${slugify(title)}-${Date.now().toString(36)}`;

    setCategories((current) => [
      ...current,
      {
        id,
        order: current.length + 1,
        sectionIds: [],
        title: { en: title, ro: title },
        description: {
          en: "Configure this category from the inspector.",
          ro: "Configurează această categorie din inspector.",
        },
      },
    ]);
    setSelectedId("");
    setSelectedIds([]);
    setSelectedSectionId("");
    setSelectedCategoryId(id);
    toast.success(c.addedSection);
  }

  function addSection(title: string) {
    const id = `draft-section-${Date.now().toString(36)}`;
    const y =
      nodes.length > 0
        ? Math.max(...nodes.map((node) => node.y)) + SECTION_GAP
        : 100;

    setSections((current) => [
      ...current,
      {
        id,
        order: current.length + 1,
        label: { en: `Section ${current.length + 1}`, ro: `Secțiunea ${current.length + 1}` },
        title: { en: title, ro: title },
        description: {
          en: "Configure this section from the lesson inspector.",
          ro: "Configurează această secțiune din inspectorul lecției.",
        },
        lessonIds: [],
      },
    ]);
    setCategories((current) =>
      current.map((category, index) =>
        category.id === (selectedCategoryId || current[0]?.id) || (!selectedCategoryId && index === 0)
          ? {
              ...category,
              sectionIds: [...category.sectionIds, id],
            }
          : category
      )
    );
    setSelectedId("");
    setSelectedIds([]);
    setSelectedSectionId(id);
    setSelectedCategoryId(selectedCategoryId || categories[0]?.id || "");
    setPan((current) => ({ ...current, y: current.y - y * scale + 180 }));
    toast.success(c.addedSection);
  }

  function submitCreateDialog() {
    const title = createName.trim();
    if (!title || !createDialogType) return;

    if (createDialogType === "category") {
      createCategory(title);
    } else {
      addSection(title);
    }

    closeCreateDialog();
  }

  function updateDraft(id: string, patch: Partial<LessonDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  }

  function updateSection(id: string, patch: Partial<LearnSection>) {
    setSections((current) =>
      current.map((section) =>
        section.id === id ? { ...section, ...patch } : section
      )
    );
  }

  function updateQuizQuestion(questionIndex: number, patch: Partial<QuizDraft>) {
    if (!selectedLesson || !selectedDraft) return;

    updateDraft(selectedLesson.id, {
      quiz: selectedDraft.quiz.map((question, index) =>
        index === questionIndex ? { ...question, ...patch } : question
      ),
    });
  }

  function updateQuizOption(questionIndex: number, optionIndex: number, value: string) {
    if (!selectedLesson || !selectedDraft) return;

    updateQuizQuestion(questionIndex, {
      options: selectedDraft.quiz[questionIndex].options.map((option, index) =>
        index === optionIndex ? value : option
      ),
    });
  }

  function addQuizQuestion() {
    if (!selectedLesson || !selectedDraft) return;

    updateDraft(selectedLesson.id, {
      quiz: [
        ...selectedDraft.quiz,
        {
          answerIndex: 0,
          options:
            lessonLocale === "ro"
              ? ["Prima opțiune", "A doua opțiune", "A treia opțiune"]
              : ["First option", "Second option", "Third option"],
          question:
            lessonLocale === "ro"
              ? "Întrebare nouă pentru quiz"
              : "New quiz question",
        },
      ],
    });
  }

  function addLesson(kind: NonNullable<LearnLesson["kind"]>) {
    const id = `draft-${kind}-${Date.now().toString(36)}`;
    const lesson = createLessonShell(id, kind, nodes.length + 1, lessonLocale);
    const viewport = viewportRef.current;
    const centerX = viewport ? viewport.clientWidth / 2 : 520;
    const centerY = viewport ? viewport.clientHeight / 2 : 320;
    const x = Math.max(24, (centerX - pan.x) / scale - NODE_WIDTH / 2);
    const y = Math.max(24, (centerY - pan.y) / scale - NODE_HEIGHT / 2);
    const sectionId = selectedNode?.sectionId ?? selectedSectionId ?? sections[0]?.id ?? "draft";

    setNodes((current) => [
      ...current,
      {
        id,
        lesson,
        sectionId,
        x,
        y,
      },
    ]);
    setDrafts((current) => ({
      ...current,
      [id]: buildInitialDrafts(lessonLocale)[id] ?? {
        code: lesson.code,
        kind,
        level: lesson.level,
        locked: kind !== "theory",
        minutes: lesson.minutes,
        quiz: lesson.quiz.map((question) => ({
          answerIndex: question.answerIndex,
          options: question.options.map((option) => text(option, lessonLocale)),
          question: text(question.question, lessonLocale),
        })),
        requiredProblemCodes: "",
        requiresCorrectQuiz: kind !== "theory",
        sampleInput: lesson.sampleInput,
        summary: text(lesson.summary, lessonLocale),
        tags: lesson.tags.join(", "),
        title: text(lesson.title, lessonLocale),
        transcript: text(lesson.transcript, lessonLocale),
        videoUrl: lesson.videoUrl ?? "",
      },
    }));
    setSelectedId(id);
    setSelectedIds([id]);
    setSelectedSectionId(sectionId);
    toast.success(c.addedLesson);
  }

  function duplicateSelectedLesson() {
    if (!selectedLesson || !selectedDraft || !selectedNode) return;

    const id = `${selectedLesson.id}-copy-${Date.now().toString(36)}`;
    const lesson: LearnLesson = {
      ...selectedLesson,
      id,
      order: nodes.length + 1,
      title: {
        en: `${selectedDraft.title} copy`,
        ro: `${selectedDraft.title} copie`,
      },
    };

    setNodes((current) => [
      ...current,
      {
        ...selectedNode,
        id,
        lesson,
        x: selectedNode.x + 36,
        y: selectedNode.y + 36,
      },
    ]);
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...selectedDraft,
        title: `${selectedDraft.title} copy`,
      },
    }));
    setSelectedId(id);
    setSelectedIds([id]);
    toast.success(c.duplicatedLesson);
  }

  function deleteSelectedLesson() {
    if (!selectedLesson || nodes.length <= 1) return;

    const idsToDelete = new Set(selectedIds.length ? selectedIds : [selectedLesson.id]);
    if (idsToDelete.size >= nodes.length) return;

    const nextNodes = nodes.filter((node) => !idsToDelete.has(node.id));
    setNodes(nextNodes);
    setDrafts((current) => {
      const next = { ...current };
      idsToDelete.forEach((id) => delete next[id]);
      return next;
    });
    setSelectedId(nextNodes[0]?.id ?? "");
    setSelectedIds(nextNodes[0]?.id ? [nextNodes[0].id] : []);
    setSelectedSectionId(nextNodes[0]?.sectionId ?? sections[0]?.id ?? "");
    toast.success(c.deletedLesson);
  }

  function getViewportPoint(event: React.PointerEvent<HTMLDivElement | HTMLButtonElement>) {
    const viewport = viewportRef.current;
    const rect = viewport?.getBoundingClientRect();

    return {
      x: rect ? event.clientX - rect.left : event.clientX,
      y: rect ? event.clientY - rect.top : event.clientY,
    };
  }

  function getNodeIdsInRect(rect: SelectionRect) {
    const bounds = getSelectionBounds(rect);
    const worldBounds = {
      left: (bounds.left - pan.x) / scale,
      right: (bounds.left + bounds.width - pan.x) / scale,
      top: (bounds.top - pan.y) / scale,
      bottom: (bounds.top + bounds.height - pan.y) / scale,
    };

    return nodes
      .filter((node) => {
        const nodeBounds = {
          left: node.x,
          right: node.x + NODE_WIDTH,
          top: node.y,
          bottom: node.y + NODE_HEIGHT,
        };

        return (
          nodeBounds.left <= worldBounds.right &&
          nodeBounds.right >= worldBounds.left &&
          nodeBounds.top <= worldBounds.bottom &&
          nodeBounds.bottom >= worldBounds.top
        );
      })
      .map((node) => node.id);
  }

  function cloneDraft(draft: LessonDraft): LessonDraft {
    return {
      ...draft,
      quiz: draft.quiz.map((question) => ({
        ...question,
        options: [...question.options],
      })),
    };
  }

  function copySelectedNodes() {
    const idsToCopy = selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
    const nodesToCopy = nodes.filter((node) => idsToCopy.includes(node.id));
    if (!nodesToCopy.length) return;

    const minX = Math.min(...nodesToCopy.map((node) => node.x));
    const minY = Math.min(...nodesToCopy.map((node) => node.y));

    clipboardRef.current = nodesToCopy
      .map((node) => {
        const draft = drafts[node.id];
        if (!draft) return null;

        return {
          draft: cloneDraft(draft),
          node,
          offsetX: node.x - minX,
          offsetY: node.y - minY,
        };
      })
      .filter((item): item is ClipboardNode => Boolean(item));
  }

  function pasteCopiedNodes() {
    const copiedNodes = clipboardRef.current;
    if (!copiedNodes.length) return;

    const viewport = viewportRef.current;
    const centerX = viewport ? viewport.clientWidth / 2 : 520;
    const centerY = viewport ? viewport.clientHeight / 2 : 320;
    const baseX = Math.max(24, (centerX - pan.x) / scale - NODE_WIDTH / 2);
    const baseY = Math.max(24, (centerY - pan.y) / scale - NODE_HEIGHT / 2);
    const pastedIds: string[] = [];
    const nextDraftEntries: Array<[string, LessonDraft]> = [];
    const nextNodes = copiedNodes.map((item, index) => {
      const id = `${item.node.id}-copy-${Date.now().toString(36)}-${index + 1}`;
      const draft = {
        ...cloneDraft(item.draft),
        title: `${item.draft.title} copy`,
      };
      const lesson: LearnLesson = {
        ...item.node.lesson,
        id,
        kind: draft.kind,
        level: draft.level,
        minutes: draft.minutes,
        order: nodes.length + index + 1,
        title: {
          en: draft.title,
          ro: draft.title,
        },
      };

      pastedIds.push(id);
      nextDraftEntries.push([id, draft]);

      return {
        ...item.node,
        id,
        lesson,
        x: Math.max(24, baseX + item.offsetX),
        y: Math.max(24, baseY + item.offsetY),
      };
    });

    setNodes((current) => [...current, ...nextNodes]);
    setDrafts((current) => ({
      ...current,
      ...Object.fromEntries(nextDraftEntries),
    }));
    setSelectedIds(pastedIds);
    setSelectedId(pastedIds[0] ?? selectedId);
    toast.success(c.pastedLessons);
  }

  useEffect(() => {
    function handleClipboardShortcuts(event: KeyboardEvent) {
      if (isTextEditingTarget(event.target) || isCanvasWidgetTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "backspace" || key === "delete") {
        event.preventDefault();
        deleteSelectedLesson();
        return;
      }

      if (!event.metaKey && !event.ctrlKey) {
        return;
      }

      if (key === "c") {
        event.preventDefault();
        copySelectedNodes();
      }

      if (key === "v") {
        event.preventDefault();
        pasteCopiedNodes();
      }
    }

    window.addEventListener("keydown", handleClipboardShortcuts);

    return () => window.removeEventListener("keydown", handleClipboardShortcuts);
  });

  function beginNodeDrag(event: React.PointerEvent<HTMLButtonElement>, node: CanvasNode) {
    if (spacePressed) return;

    event.stopPropagation();

    if (event.shiftKey) {
      setSelectedIds((current) => {
        const next = current.includes(node.id)
          ? current.filter((id) => id !== node.id)
          : [...current, node.id];

        if (!next.length) {
          setSelectedId(node.id);
          setSelectedSectionId(node.sectionId);
          return [node.id];
        }

        setSelectedId(next.includes(node.id) ? node.id : next[0]);
        setSelectedSectionId(node.sectionId);
        return next;
      });
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const ids = selectedIds.includes(node.id) ? selectedIds : [node.id];
    const origins = Object.fromEntries(
      nodes
        .filter((item) => ids.includes(item.id))
        .map((item) => [item.id, { x: item.x, y: item.y }])
    );

    dragRef.current = {
      type: "nodes",
      ids,
      startX: event.clientX,
      startY: event.clientY,
      origins,
    };
    setSelectedId(node.id);
    setSelectedIds(ids);
    setSelectedSectionId(node.sectionId);
  }

  function beginCanvasDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (
      isTextEditingTarget(event.target) ||
      isCanvasWidgetTarget(event.target) ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (!spacePressed) {
      const point = getViewportPoint(event);
      const rect = {
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
      };

      dragRef.current = { type: "selection", ...rect };
      setSelectionRect(rect);
      setSelectedIds([]);
      return;
    }

    dragRef.current = {
      type: "canvas",
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.type === "canvas") {
      setPan({
        x: drag.originX + event.clientX - drag.startX,
        y: drag.originY + event.clientY - drag.startY,
      });
      return;
    }

    if (drag.type === "selection") {
      const point = getViewportPoint(event);
      const rect = {
        startX: drag.startX,
        startY: drag.startY,
        currentX: point.x,
        currentY: point.y,
      };
      const nextIds = getNodeIdsInRect(rect);

      dragRef.current = { type: "selection", ...rect };
      setSelectionRect(rect);
      setSelectedIds(nextIds);
      if (nextIds[0]) setSelectedId(nextIds[0]);
      return;
    }

    setNodes((current) =>
      current.map((node) =>
        drag.ids.includes(node.id)
          ? {
              ...node,
              x: Math.max(
                24,
                drag.origins[node.id].x + (event.clientX - drag.startX) / scale
              ),
              y: Math.max(
                24,
                drag.origins[node.id].y + (event.clientY - drag.startY) / scale
              ),
            }
          : node
      )
    );
  }

  function endDrag() {
    if (dragRef.current?.type === "selection") {
      const ids = getNodeIdsInRect(dragRef.current);
      setSelectedIds(ids);
      if (ids[0]) setSelectedId(ids[0]);
    }

    setSelectionRect(null);
    dragRef.current = null;
  }

  return (
    <TooltipProvider>
      <Dialog
        open={Boolean(createDialogType)}
        onOpenChange={(open) => {
          if (!open) closeCreateDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createDialogType === "category" ? c.addCategory : c.addSection}
            </DialogTitle>
          </DialogHeader>
          <label className="space-y-2 text-sm font-medium">
            {createDialogType === "category"
              ? c.categoryNamePrompt
              : c.sectionNamePrompt}
            <Input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitCreateDialog();
              }}
              autoFocus
            />
          </label>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{c.cancel}</Button>
            </DialogClose>
            <Button onClick={submitCreateDialog} disabled={!createName.trim()}>
              {c.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={viewportRef}
            className={cn(
              "relative h-full min-h-0 w-full overflow-hidden bg-[radial-gradient(circle_at_1px_1px,hsl(var(--muted-foreground)/0.18)_1px,transparent_0)] bg-[length:22px_22px]",
              spacePressed ? "cursor-grab active:cursor-grabbing" : "cursor-default"
            )}
            onPointerDown={beginCanvasDrag}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {!widgetsHidden && (
              <div data-canvas-widget className="absolute left-4 top-4 z-20 max-w-[420px] rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
                <div className="flex items-start gap-3">
                  <Button asChild variant="outline" size="icon" className="shrink-0">
                    <Link href="/admin" aria-label={c.back}>
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-semibold">{c.title}</h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.keybinds}</p>
                  </div>
                </div>
              </div>
            )}

            <div data-canvas-widget className="absolute right-4 top-4 z-30 flex max-w-[calc(100%-2rem)] flex-wrap items-center justify-end gap-2 rounded-xl border bg-background/95 p-2 shadow-sm backdrop-blur">
              <div className="relative w-52">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={c.search}
                  className="h-8 pl-8"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="icon" aria-label={c.addMenu}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  data-canvas-widget
                  align="end"
                  className="w-72 p-2"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <PopoverHeader className="px-2 py-1.5">
                    <PopoverTitle className="text-sm">{c.addMenu}</PopoverTitle>
                  </PopoverHeader>
                  <div className="grid gap-1">
                    {[
                      {
                        icon: Video,
                        label: c.addVideo,
                        onClick: () => addLesson("video" as const),
                        tone: "text-blue-600",
                      },
                      {
                        icon: BookOpen,
                        label: c.addTheory,
                        onClick: () => addLesson("theory" as const),
                        tone: "text-emerald-600",
                      },
                      {
                        icon: Trophy,
                        label: c.addChallenge,
                        onClick: () => addLesson("challenge" as const),
                        tone: "text-amber-600",
                      },
                      {
                        icon: ClipboardList,
                        label: c.addAssessment,
                        onClick: () => addLesson("assessment" as const),
                        tone: "text-violet-600",
                      },
                      {
                        icon: Plus,
                        label: c.addSection,
                        onClick: () => openCreateDialog("section"),
                        tone: "text-zinc-700",
                      },
                      {
                        icon: ClipboardList,
                        label: c.addCategory,
                        onClick: () => openCreateDialog("category"),
                        tone: "text-zinc-700",
                      },
                    ].map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            item.onClick();
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted"
                        >
                          <Icon className={cn("h-4 w-4", item.tone)} />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              <Separator orientation="vertical" className="h-6" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoom(([value]) => [clampZoom(value - 10)])}
                    aria-label="Zoom out"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out</TooltipContent>
              </Tooltip>
              <div className="w-28 px-1">
                <Slider value={zoom} min={MIN_ZOOM} max={MAX_ZOOM} step={5} onValueChange={setZoom} />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoom(([value]) => [clampZoom(value + 10)])}
                    aria-label="Zoom in"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in</TooltipContent>
              </Tooltip>
              <Button variant="outline" size="sm" onClick={resetLayout}>
                <Shuffle className="h-3.5 w-3.5" />
                {c.reset}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWidgetsHidden((hidden) => !hidden)}
                aria-label={widgetsHidden ? c.showWidgets : c.hideWidgets}
              >
                {widgetsHidden ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              <Button size="sm" onClick={saveRoadmapConfig} disabled={isSaving}>
                <Save className="h-3.5 w-3.5" />
                {isSaving ? c.saving : c.save}
              </Button>
            </div>

            {!widgetsHidden && (
              <div data-canvas-widget className="absolute left-4 top-28 z-20 flex gap-2 rounded-xl border bg-background/95 p-2 shadow-sm backdrop-blur">
                <Badge variant="secondary" className="rounded-full">{nodeCount} {c.nodes.toLowerCase()}</Badge>
                <Badge variant="secondary" className="rounded-full">{sections.length} {c.sections.toLowerCase()}</Badge>
                <Badge variant="secondary" className="rounded-full">{quizCount} {c.quizItems.toLowerCase()}</Badge>
              </div>
            )}

            <div
              className="absolute left-0 top-0 origin-top-left transition-transform duration-75"
              style={{
                height: STAGE_SIZE,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                width: STAGE_SIZE,
              }}
            >
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {sections.flatMap((section) => {
                  const sectionNodes = nodes
                    .filter((node) => node.sectionId === section.id)
                    .sort((a, b) => a.y - b.y || a.x - b.x);
                  return sectionNodes.slice(0, -1).map((node, index) => {
                    const next = sectionNodes[index + 1];
                    const startX = node.x + NODE_WIDTH;
                    const startY = node.y + NODE_HEIGHT / 2;
                    const endX = next.x;
                    const endY = next.y + NODE_HEIGHT / 2;
                    const control = Math.max(56, (endX - startX) / 2);

                    return (
                      <path
                        key={`${node.id}-${next.id}`}
                        d={`M ${startX} ${startY} C ${startX + control} ${startY}, ${endX - control} ${endY}, ${endX} ${endY}`}
                        fill="none"
                        stroke="#d4d4d8"
                        strokeLinecap="round"
                        strokeWidth="3"
                      />
                    );
                  });
                })}
              </svg>

              {categories.map((category, categoryIndex) => {
                const categorySections = sections.filter((section) =>
                  category.sectionIds.includes(section.id)
                );
                const firstSection = categorySections[0];
                const firstNode = firstSection
                  ? nodes.find((node) => node.sectionId === firstSection.id)
                  : null;

                return (
                  <button
                    key={category.id}
                    type="button"
                    className={cn(
                      "absolute rounded-full border bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800",
                      selectedCategoryId === category.id &&
                        !selectedLesson &&
                        !selectedSectionDetails &&
                        "ring-4 ring-lime-100"
                    )}
                    style={{
                      left: firstNode?.x ?? 80,
                      top:
                        (firstNode?.y ??
                          70 + categoryIndex * (SECTION_GAP + NODE_ROW_GAP)) -
                        88,
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId("");
                      setSelectedIds([]);
                      setSelectedSectionId("");
                      setSelectedCategoryId(category.id);
                    }}
                  >
                    {text(category.title, lessonLocale)}
                  </button>
                );
              })}

              {sections.map((section, sectionIndex) => {
                const firstNode = nodes.find((node) => node.sectionId === section.id);

                return (
                  <button
                    key={section.id}
                    type="button"
                    className={cn(
                      "absolute rounded-full border bg-background/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition hover:border-zinc-400 hover:text-foreground",
                      selectedSectionId === section.id &&
                        !selectedLesson &&
                        "border-lime-400 text-foreground ring-4 ring-lime-100"
                    )}
                    style={{
                      left: firstNode?.x ?? 120,
                      top: (firstNode?.y ?? 120 + sectionIndex * SECTION_GAP) - 48,
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId("");
                      setSelectedIds([]);
                      setSelectedSectionId(section.id);
                      setSelectedCategoryId(
                        categories.find((category) =>
                          category.sectionIds.includes(section.id)
                        )?.id ?? selectedCategoryId
                      );
                    }}
                  >
                    {text(section.title, lessonLocale)}
                  </button>
                );
              })}

              {filteredNodes.map((node) => {
                const isSelected = selectedIds.includes(node.id);
                const nodeDraft = drafts[node.id];
                const nodeRuleKind = getDraftRuleKind(node.lesson, nodeDraft);
                const styles = ruleStyles[nodeRuleKind];
                const nodeSection = sections.find(
                  (section) => section.id === node.sectionId
                );

                return (
                  <button
                    key={node.id}
                    type="button"
                    className={cn(
                      "absolute flex h-[94px] w-[210px] cursor-grab flex-col items-start justify-between rounded-[22px] border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing",
                      styles.node,
                      styles.border,
                      isSelected && "ring-4 ring-lime-100",
                      isSelected &&
                        selectedIds.length > 1 &&
                        "outline outline-2 outline-lime-400"
                    )}
                    style={{ left: node.x, top: node.y }}
                    onPointerDown={(event) => beginNodeDrag(event, node)}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm", styles.icon)}>
                          {nodeRuleKind === "challenge" ? (
                            <Trophy className="h-4 w-4" />
                          ) : nodeRuleKind === "assessment" ? (
                            <ClipboardList className="h-4 w-4" />
                          ) : nodeRuleKind === "theory" ? (
                            <BookOpen className="h-4 w-4" />
                          ) : nodeRuleKind === "video" ? (
                            <Video className="h-4 w-4" />
                          ) : nodeRuleKind === "bonus" ? (
                            <Sparkles className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4 fill-current" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {nodeDraft?.title ?? text(node.lesson.title, lessonLocale)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {nodeSection
                              ? text(nodeSection.title, lessonLocale)
                              : text(node.lesson.unit, lessonLocale)}
                          </span>
                        </span>
                      </span>
                      <Grip className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </span>
                    <span className="flex w-full items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5" />
                        {nodeDraft?.minutes ?? node.lesson.minutes} min
                      </span>
                      <Badge variant="outline" className={cn("rounded-full", styles.badge)}>
                        {nodeRuleKind}
                      </Badge>
                    </span>
                  </button>
                );
              })}
            </div>

            {selectionRect && (
              <div
                className="pointer-events-none absolute z-10 rounded-md border border-lime-500 bg-lime-400/15"
                style={getSelectionBounds(selectionRect)}
              />
            )}

            <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-lg border bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
              <MousePointer2 className="h-3.5 w-3.5" />
              {Math.round(scale * 100)}%
            </div>

            <div className="pointer-events-none absolute bottom-3 left-32 z-20 flex items-center gap-2 rounded-lg border bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
              <Maximize2 className="h-3.5 w-3.5" />
              {c.keybinds}
            </div>

        {!widgetsHidden && (
        <aside data-canvas-widget className="absolute bottom-4 right-4 top-20 z-20 w-[min(460px,calc(100%-2rem))] overflow-y-auto rounded-xl border bg-background/95 p-4 shadow-sm backdrop-blur [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {!selectedLesson && !selectedSectionDetails && selectedCategoryDetails && (
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle>{c.categoryDetails}</CardTitle>
                <CardDescription>{selectedCategoryDetails.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="space-y-2 text-sm font-medium">
                  {c.categoryTitle}
                  <Input
                    value={text(selectedCategoryDetails.title, lessonLocale)}
                    onChange={(event) =>
                      setCategories((current) =>
                        current.map((category) =>
                          category.id === selectedCategoryDetails.id
                            ? {
                                ...category,
                                title: {
                                  en: event.target.value,
                                  ro: event.target.value,
                                },
                              }
                            : category
                        )
                      )
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  {c.categoryDescription}
                  <Textarea
                    value={text(selectedCategoryDetails.description, lessonLocale)}
                    onChange={(event) =>
                      setCategories((current) =>
                        current.map((category) =>
                          category.id === selectedCategoryDetails.id
                            ? {
                                ...category,
                                description: {
                                  en: event.target.value,
                                  ro: event.target.value,
                                },
                              }
                            : category
                        )
                      )
                    }
                    className="min-h-24"
                  />
                </label>
              </CardContent>
            </Card>
          )}
          {!selectedLesson && selectedSectionDetails && (
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle>{c.sectionDetails}</CardTitle>
                <CardDescription>{selectedSectionDetails.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="space-y-2 text-sm font-medium">
                  {c.sectionTitle}
                  <Input
                    value={text(selectedSectionDetails.title, lessonLocale)}
                    onChange={(event) =>
                      updateSection(selectedSectionDetails.id, {
                        title: {
                          en: event.target.value,
                          ro: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  {c.category}
                  <Select
                    value={selectedCategoryDetails?.id ?? ""}
                    onValueChange={(value) => {
                      setCategories((current) =>
                        current.map((category) => ({
                          ...category,
                          sectionIds:
                            category.id === value
                              ? Array.from(
                                  new Set([
                                    ...category.sectionIds,
                                    selectedSectionDetails.id,
                                  ])
                                )
                              : category.sectionIds.filter(
                                  (sectionId) =>
                                    sectionId !== selectedSectionDetails.id
                                ),
                        }))
                      );
                      setSelectedCategoryId(value);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {text(category.title, lessonLocale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  {c.section}
                  <Input
                    value={text(selectedSectionDetails.label, lessonLocale)}
                    onChange={(event) =>
                      updateSection(selectedSectionDetails.id, {
                        label: {
                          en: event.target.value,
                          ro: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  {c.sectionDescription}
                  <Textarea
                    value={text(selectedSectionDetails.description, lessonLocale)}
                    onChange={(event) =>
                      updateSection(selectedSectionDetails.id, {
                        description: {
                          en: event.target.value,
                          ro: event.target.value,
                        },
                      })
                    }
                    className="min-h-24"
                  />
                </label>
              </CardContent>
            </Card>
          )}
          {selectedLesson && selectedDraft && selectedRule && (
            <div className="space-y-4">
              <Card className="border-zinc-200">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{c.selected}</CardTitle>
                      <CardDescription>{selectedLesson.id}</CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full",
                        ruleStyles[getDraftRuleKind(selectedLesson, selectedDraft)].badge
                      )}
                    >
                      {getDraftRuleKind(selectedLesson, selectedDraft)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border bg-background/80 p-4">
                      <p className="text-xs text-muted-foreground">{c.requiredQuiz}</p>
                      <p className="mt-1 flex items-center gap-1.5 font-medium">
                        {selectedRule.requiresCorrectQuiz ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-amber-500" />
                        )}
                        {selectedRule.requiresCorrectQuiz ? c.locked : c.unlocked}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-background/80 p-4">
                      <p className="text-xs text-muted-foreground">{c.requiredProblems}</p>
                      <p className="mt-1 font-medium">
                        {selectedRule.requiredProblemCodes.length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="lesson" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="lesson">
                    <Settings2 className="h-4 w-4" />
                    {c.lesson}
                  </TabsTrigger>
                  <TabsTrigger value="content">
                    <Code2 className="h-4 w-4" />
                    {c.content}
                  </TabsTrigger>
                  <TabsTrigger value="quiz">
                    <ClipboardList className="h-4 w-4" />
                    {c.quiz}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="lesson" className="mt-3 space-y-3">
                  <Card>
                    <CardContent className="space-y-4 p-5">
                      <label className="space-y-2 text-sm font-medium">
                        {c.titleLabel}
                        <Input
                          value={selectedDraft.title}
                          onChange={(event) =>
                            updateDraft(selectedLesson.id, { title: event.target.value })
                          }
                        />
                      </label>
                      <label className="space-y-2 text-sm font-medium">
                        {c.summary}
                        <Textarea
                          value={selectedDraft.summary}
                          onChange={(event) =>
                            updateDraft(selectedLesson.id, { summary: event.target.value })
                          }
                          className="min-h-20"
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-2 text-sm font-medium">
                          {c.section}
                          <Select
                            value={selectedNode.sectionId}
                            onValueChange={(value) =>
                              setNodes((current) =>
                                current.map((node) =>
                                  node.id === selectedLesson.id
                                    ? { ...node, sectionId: value }
                                    : node
                                )
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {sections.map((section) => (
                                <SelectItem key={section.id} value={section.id}>
                                  {text(section.title, lessonLocale)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                        {selectedSection && (
                          <label className="space-y-2 text-sm font-medium">
                            {c.sectionTitle}
                            <Input
                              value={text(selectedSection.title, lessonLocale)}
                              onChange={(event) =>
                                updateSection(selectedSection.id, {
                                  title: {
                                    en: event.target.value,
                                    ro: event.target.value,
                                  },
                                  label: {
                                    en: event.target.value,
                                    ro: event.target.value,
                                  },
                                })
                              }
                            />
                          </label>
                        )}
                        <label className="space-y-2 text-sm font-medium">
                          {c.kind}
                          <Select
                            value={selectedDraft.kind}
                            onValueChange={(value) =>
                              updateDraft(selectedLesson.id, {
                                kind: value as NonNullable<LearnLesson["kind"]>,
                                level:
                                  value === "challenge" || value === "assessment"
                                    ? "challenge"
                                    : value === "theory"
                                      ? "beginner"
                                    : selectedDraft.level,
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="video">{c.addVideo}</SelectItem>
                              <SelectItem value="theory">{c.addTheory}</SelectItem>
                              <SelectItem value="challenge">{c.addChallenge}</SelectItem>
                              <SelectItem value="assessment">{c.addAssessment}</SelectItem>
                            </SelectContent>
                          </Select>
                        </label>
                        <label className="space-y-2 text-sm font-medium">
                          {c.level}
                          <Select
                            value={selectedDraft.level}
                            onValueChange={(value) =>
                              updateDraft(selectedLesson.id, {
                                level: value as LearnLesson["level"],
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">beginner</SelectItem>
                              <SelectItem value="practice">practice</SelectItem>
                              <SelectItem value="challenge">challenge</SelectItem>
                            </SelectContent>
                          </Select>
                        </label>
                      </div>
                      <label className="space-y-2 text-sm font-medium">
                        {c.minutes}
                        <Input
                          value={selectedDraft.minutes}
                          onChange={(event) =>
                            updateDraft(selectedLesson.id, {
                              minutes: Number(event.target.value || 0),
                            })
                          }
                          type="number"
                        />
                      </label>
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="lesson-video-url">
                        {c.video}
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="lesson-video-url"
                            value={selectedDraft.videoUrl}
                            onChange={(event) =>
                              updateDraft(selectedLesson.id, {
                                videoUrl: event.target.value,
                              })
                            }
                            placeholder="https://youtube.com/..."
                          />
                          <Button variant="outline" size="icon" aria-label={c.preview}>
                            <Video className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <label className="space-y-2 text-sm font-medium">
                        {c.tags}
                        <Input
                          value={selectedDraft.tags}
                          onChange={(event) =>
                            updateDraft(selectedLesson.id, { tags: event.target.value })
                          }
                          placeholder="beginner, variables"
                        />
                      </label>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="content" className="mt-3 space-y-3">
                  <Card>
                    <CardContent className="space-y-4 p-5">
                      <label className="space-y-2 text-sm font-medium">
                        {c.transcript}
                        <Textarea
                          value={selectedDraft.transcript}
                          onChange={(event) =>
                            updateDraft(selectedLesson.id, {
                              transcript: event.target.value,
                            })
                          }
                          className="min-h-28"
                        />
                      </label>
                      <label className="space-y-2 text-sm font-medium">
                        {c.code}
                        <Textarea
                          value={selectedDraft.code}
                          onChange={(event) =>
                            updateDraft(selectedLesson.id, { code: event.target.value })
                          }
                          className="min-h-44 font-mono text-xs"
                        />
                      </label>
                      <label className="space-y-2 text-sm font-medium">
                        {c.sampleInput}
                        <Input
                          value={selectedDraft.sampleInput}
                          onChange={(event) =>
                            updateDraft(selectedLesson.id, {
                              sampleInput: event.target.value,
                            })
                          }
                          className="font-mono"
                        />
                      </label>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="quiz" className="mt-3 space-y-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>{c.quizConfig}</CardTitle>
                      <CardDescription>
                        {selectedDraft.quiz.length} {c.quizItems.toLowerCase()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedDraft.quiz.map((question, questionIndex) => (
                        <div key={`${selectedLesson.id}-${questionIndex}`} className="rounded-lg border bg-background p-4">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <Badge variant="secondary">Q{questionIndex + 1}</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={c.correct}
                              onClick={() =>
                                updateQuizQuestion(questionIndex, {
                                  answerIndex:
                                    (question.answerIndex + 1) % question.options.length,
                                })
                              }
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                          <label className="space-y-2 text-sm font-medium">
                            {c.question}
                            <Textarea
                              value={question.question}
                              onChange={(event) =>
                                updateQuizQuestion(questionIndex, {
                                  question: event.target.value,
                                })
                              }
                              className="min-h-16"
                            />
                          </label>
                          <div className="mt-3 space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <label key={`${selectedLesson.id}-${questionIndex}-${optionIndex}`} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-2 text-sm">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuizQuestion(questionIndex, {
                                      answerIndex: optionIndex,
                                    })
                                  }
                                  className={cn(
                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                                    optionIndex === question.answerIndex
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : "bg-background text-muted-foreground"
                                  )}
                                >
                                  {optionIndex + 1}
                                </button>
                                <Input
                                  value={option}
                                  onChange={(event) =>
                                    updateQuizOption(
                                      questionIndex,
                                      optionIndex,
                                      event.target.value
                                    )
                                  }
                                  className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}

                      <Separator />

                      <Button variant="outline" className="w-full" onClick={addQuizQuestion}>
                        <Plus className="h-4 w-4" />
                        {c.addQuestion}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <Card>
                <CardHeader>
                  <CardTitle>{c.visualRules}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <label className="space-y-2 text-sm font-medium">
                    {c.unlockStatus}
                    <Select
                      value={selectedDraft.locked ? "locked" : "unlocked"}
                      onValueChange={(value) =>
                        updateDraft(selectedLesson.id, {
                          locked: value === "locked",
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="locked">{c.locked}</SelectItem>
                        <SelectItem value="unlocked">{c.unlocked}</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    {c.requiredQuiz}
                    <Select
                      value={selectedDraft.requiresCorrectQuiz ? "yes" : "no"}
                      onValueChange={(value) =>
                        updateDraft(selectedLesson.id, {
                          requiresCorrectQuiz: value === "yes",
                        })
                      }
                      disabled={!selectedDraft.locked}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">{c.locked}</SelectItem>
                        <SelectItem value="no">{c.unlocked}</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    {c.requiredProblems}
                    <Input
                      value={selectedDraft.requiredProblemCodes}
                      onChange={(event) =>
                        updateDraft(selectedLesson.id, {
                          requiredProblemCodes: event.target.value,
                        })
                      }
                      disabled={!selectedDraft.locked}
                      placeholder="1, 6, 17"
                    />
                  </label>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-violet-500" />
                      {c.requiredQuiz}
                    </span>
                    <Badge variant="secondary">
                      {selectedRule.requiresCorrectQuiz ? c.locked : c.unlocked}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-cyan-500" />
                      {c.requiredProblems}
                    </span>
                    <Badge variant="secondary">
                      {selectedRule.requiredProblemCodes.join(", ") || "0"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </aside>
        )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuLabel>{c.newLesson}</ContextMenuLabel>
          <ContextMenuItem onSelect={() => addLesson("video")}>
            <Video className="h-4 w-4" />
            {c.addVideo}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => addLesson("theory")}>
            <BookOpen className="h-4 w-4" />
            {c.addTheory}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => addLesson("challenge")}>
            <Trophy className="h-4 w-4" />
            {c.addChallenge}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => addLesson("assessment")}>
            <ClipboardList className="h-4 w-4" />
            {c.addAssessment}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => openCreateDialog("section")}>
            <Plus className="h-4 w-4" />
            {c.addSection}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => openCreateDialog("category")}>
            <ClipboardList className="h-4 w-4" />
            {c.addCategory}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={copySelectedNodes} disabled={!selectedLesson}>
            <Copy className="h-4 w-4" />
            {c.copy}
          </ContextMenuItem>
          <ContextMenuItem onSelect={pasteCopiedNodes}>
            <ClipboardList className="h-4 w-4" />
            {c.paste}
          </ContextMenuItem>
          <ContextMenuItem onSelect={duplicateSelectedLesson} disabled={!selectedLesson}>
            <Copy className="h-4 w-4" />
            {c.duplicate}
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={deleteSelectedLesson}
            disabled={!selectedLesson || nodes.length <= 1}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4" />
            {c.delete}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={resetLayout}>
            <Shuffle className="h-4 w-4" />
            {c.reset}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </TooltipProvider>
  );
}

export default function AdminLessonsPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <LessonsAdminContent />
    </RouteGuard>
  );
}
