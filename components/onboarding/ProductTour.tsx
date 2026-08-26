"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MousePointer2,
  Sparkles,
  X,
} from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
  onboardingMetadataKeys,
  productTourStorageKey,
} from "@/lib/onboarding";
import {
  getWorkspacePersonaFromMetadata,
  type WorkspacePersona,
} from "@/lib/workspaces";

type ProductTourProps = {
  onComplete: () => void;
};

type SpotlightRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type TourStep = {
  activateSelector?: string;
  chapter: { en: string; ro: string };
  description: { en: string; ro: string };
  route: string;
  selector: string;
  title: { en: string; ro: string };
};

const chapters = {
  orientation: { en: "Orientation", ro: "Orientare" },
  workspace: { en: "Workspace", ro: "Workspace" },
  editor: { en: "Editor", ro: "Editor" },
  learning: { en: "Learning", ro: "Învățare" },
  teaching: { en: "Teaching", ro: "Predare" },
} as const;

function getLearningTourSteps(persona: WorkspacePersona): TourStep[] {
  const openingSteps: TourStep[] =
    persona === "student"
      ? [
          {
            chapter: chapters.workspace,
            route: "/workspace/student",
            selector: "[data-tour='student-overview']",
            title: { en: "Your school workspace", ro: "Workspace-ul tău pentru școală" },
            description: {
              en: "The student workspace keeps your planner, notes, whiteboards and graphs together, separate from personal practice.",
              ro: "Workspace-ul de elev adună planner-ul, notițele, whiteboard-urile și grafurile, separat de practica personală.",
            },
          },
          {
            chapter: chapters.workspace,
            route: "/workspace/student",
            selector: "[data-tour='workspace-switcher']",
            title: { en: "Move between workspaces", ro: "Schimbă rapid workspace-ul" },
            description: {
              en: "Use this switcher to move between your school tools and personal learning space without losing context.",
              ro: "Folosește switcher-ul pentru a trece între instrumentele pentru școală și spațiul personal fără să pierzi contextul.",
            },
          },
          {
            chapter: chapters.workspace,
            route: "/workspace/student",
            selector: "[data-tour='student-tools']",
            title: { en: "Capture every kind of idea", ro: "Organizează orice tip de idee" },
            description: {
              en: "Open the planner, write Markdown notes, sketch on a whiteboard or build an interactive graph from one place.",
              ro: "Deschide planner-ul, scrie notițe Markdown, desenează pe whiteboard sau construiește un graf interactiv din același loc.",
            },
          },
          {
            chapter: chapters.orientation,
            route: "/dashboard",
            selector: "[data-tour='dashboard-overview']",
            title: { en: "Your learning dashboard", ro: "Dashboard-ul tău de învățare" },
            description: {
              en: "The personal dashboard summarizes solved problems, recent scores and the next useful action.",
              ro: "Dashboard-ul personal rezumă problemele rezolvate, scorurile recente și următorul pas util.",
            },
          },
        ]
      : [
          {
            chapter: chapters.orientation,
            route: "/dashboard",
            selector: "[data-tour='dashboard-overview']",
            title: { en: "Your learning dashboard", ro: "Dashboard-ul tău de învățare" },
            description: {
              en: "This is the starting point for progress, recent results and the next useful action across ScripticX.",
              ro: "Acesta este punctul de pornire pentru progres, rezultate recente și următorul pas util în ScripticX.",
            },
          },
          {
            chapter: chapters.workspace,
            route: "/dashboard",
            selector: "[data-tour='workspace-switcher']",
            title: { en: "Your active workspace", ro: "Workspace-ul activ" },
            description: {
              en: "Your workspace keeps navigation and tools focused on how you use ScripticX. Available spaces follow your account type.",
              ro: "Workspace-ul adaptează navigarea și instrumentele modului în care folosești ScripticX. Spațiile disponibile depind de tipul contului.",
            },
          },
          {
            chapter: chapters.orientation,
            route: "/dashboard",
            selector: "[data-tour='dashboard-daily-challenge']",
            title: { en: "Build a daily rhythm", ro: "Construiește un ritm zilnic" },
            description: {
              en: "The daily challenge gives you a focused problem, bonus points and a simple way to keep momentum.",
              ro: "Challenge-ul zilei îți oferă o problemă clară, puncte bonus și o metodă simplă de a păstra ritmul.",
            },
          },
        ];

  return [
    ...openingSteps,
    {
      chapter: chapters.orientation,
      route: "/dashboard",
      selector: "[data-tour='command-menu']",
      title: { en: "Go anywhere quickly", ro: "Ajungi rapid oriunde" },
      description: {
        en: "Open the command menu with Command or Control + K to navigate, create projects and reach account settings.",
        ro: "Deschide meniul de comenzi cu Command sau Control + K pentru navigare, proiecte noi și setările contului.",
      },
    },
    {
      chapter: chapters.editor,
      route: "/editor",
      selector: "[data-tour='editor-activity-bar']",
      title: { en: "One editor, several tools", ro: "Un editor, mai multe instrumente" },
      description: {
        en: "The activity bar opens your files, project search, run tools, saved projects, Live Share and source control.",
        ro: "Bara de activități deschide fișierele, căutarea, rularea, proiectele salvate, Live Share și source control.",
      },
    },
    {
      activateSelector: "[data-tour='editor-activity-explorer']",
      chapter: chapters.editor,
      route: "/editor",
      selector: "[data-tour='editor-panel-explorer']",
      title: { en: "Projects have real structure", ro: "Proiecte cu structură reală" },
      description: {
        en: "Create folders and files, rename them, open several tabs and share an individual source file when needed.",
        ro: "Creează foldere și fișiere, redenumește-le, deschide mai multe tab-uri și distribuie un fișier individual când ai nevoie.",
      },
    },
    {
      activateSelector: "[data-tour='editor-activity-projects']",
      chapter: chapters.editor,
      route: "/editor",
      selector: "[data-tour='editor-panel-projects']",
      title: { en: "Your project library", ro: "Biblioteca ta de proiecte" },
      description: {
        en: "Saved projects sync with your account, so you can reopen complete workspaces instead of copying isolated snippets.",
        ro: "Proiectele salvate se sincronizează cu contul, astfel încât redeschizi workspace-uri complete, nu fragmente izolate.",
      },
    },
    {
      chapter: chapters.editor,
      route: "/editor",
      selector: "[data-tour='editor-code']",
      title: { en: "A focused Monaco editor", ro: "Un editor Monaco concentrat" },
      description: {
        en: "Write MiniScript+, C++, Python and other supported files with syntax highlighting, completion and configurable editor behavior.",
        ro: "Scrie MiniScript+, C++, Python și alte fișiere suportate cu highlighting, completare și comportament configurabil.",
      },
    },
    {
      chapter: chapters.editor,
      route: "/editor",
      selector: "[data-tour='editor-run']",
      title: { en: "Run without leaving the workspace", ro: "Rulează fără să părăsești workspace-ul" },
      description: {
        en: "Run the active file. MiniScript+ also supports stepping, variables, output and visual execution analysis.",
        ro: "Rulează fișierul activ. MiniScript+ oferă și execuție pas cu pas, variabile, output și analiză vizuală.",
      },
    },
    {
      chapter: chapters.editor,
      route: "/editor",
      selector: "[data-tour='editor-terminal']",
      title: { en: "Output and terminal stay close", ro: "Output și terminal la îndemână" },
      description: {
        en: "Open the integrated terminal for program input, command history and runtime output without switching pages.",
        ro: "Deschide terminalul integrat pentru input, istoricul comenzilor și output fără să schimbi pagina.",
      },
    },
    {
      chapter: chapters.editor,
      route: "/editor",
      selector: "[data-tour='editor-live-share']",
      title: { en: "Collaborate in the same project", ro: "Colaborați în același proiect" },
      description: {
        en: "Start Live Share, invite people and work together across the project while keeping the editor in place.",
        ro: "Pornește Live Share, invită persoane și lucrați în același proiect fără să părăsiți editorul.",
      },
    },
    {
      chapter: chapters.editor,
      route: "/editor",
      selector: "[data-tour='editor-activity-source-control']",
      title: { en: "GitHub source control", ro: "Source control cu GitHub" },
      description: {
        en: "Connect repositories, review changes and synchronize project history from the source control panel.",
        ro: "Conectează repository-uri, verifică schimbările și sincronizează istoricul proiectului din panoul de source control.",
      },
    },
    {
      chapter: chapters.learning,
      route: "/learn",
      selector: "[data-tour='roadmap-workspace'], [data-tour='mobile-menu']",
      title: { en: "Follow a guided roadmap", ro: "Urmează un roadmap ghidat" },
      description: {
        en: "Lessons, quizzes and code challenges form a path through the concepts you unlock and the language you choose.",
        ro: "Lecțiile, quiz-urile și challenge-urile formează un traseu prin conceptele deblocate și limbajul ales.",
      },
    },
    {
      chapter: chapters.learning,
      route: "/problems",
      selector: "[data-tour='problems-workspace'], [data-tour='mobile-menu']",
      title: { en: "Turn knowledge into practice", ro: "Transformă teoria în practică" },
      description: {
        en: "Filter the problem library, solve in the integrated editor and use submissions to measure real progress.",
        ro: "Filtrează biblioteca, rezolvă în editorul integrat și folosește submisiile pentru a măsura progresul real.",
      },
    },
  ];
}

function getTeacherTourSteps(): TourStep[] {
  return [
    {
      chapter: chapters.teaching,
      route: "/workspace/teacher",
      selector: "[data-tour='teacher-dashboard']",
      title: { en: "Your teaching overview", ro: "Imaginea de ansamblu pentru profesor" },
      description: {
        en: "The teacher dashboard brings together class activity, student completion and upcoming work.",
        ro: "Dashboard-ul profesorului adună activitatea claselor, progresul elevilor și temele care urmează.",
      },
    },
    {
      chapter: chapters.workspace,
      route: "/workspace/teacher",
      selector: "[data-tour='workspace-switcher']",
      title: { en: "A workspace built for teaching", ro: "Un workspace construit pentru predare" },
      description: {
        en: "Teacher accounts stay focused on classes, students, assignments and progress. Administrators can inspect every workspace.",
        ro: "Conturile de profesor rămân concentrate pe clase, elevi, teme și progres. Administratorii pot deschide orice workspace.",
      },
    },
    {
      chapter: chapters.orientation,
      route: "/workspace/teacher",
      selector: "[data-tour='command-menu']",
      title: { en: "Navigate with the command menu", ro: "Navighează din meniul de comenzi" },
      description: {
        en: "Use Command or Control + K to find pages and actions without leaving your current context.",
        ro: "Folosește Command sau Control + K pentru a găsi pagini și acțiuni fără să pierzi contextul curent.",
      },
    },
    {
      chapter: chapters.teaching,
      route: "/workspace/teacher/classes",
      selector: "[data-tour='teacher-classes']",
      title: { en: "Organize classes", ro: "Organizează clasele" },
      description: {
        en: "Create classes, share enrollment codes and open each class to manage its members and coursework.",
        ro: "Creează clase, distribuie coduri de înscriere și deschide fiecare clasă pentru membri și conținut.",
      },
    },
    {
      chapter: chapters.teaching,
      route: "/workspace/teacher/students",
      selector: "[data-tour='teacher-students']",
      title: { en: "See who needs attention", ro: "Vezi cine are nevoie de ajutor" },
      description: {
        en: "Review students across classes and compare their combined completion before opening detailed results.",
        ro: "Vezi elevii din toate clasele și compară progresul cumulat înainte de rezultatele detaliate.",
      },
    },
    {
      chapter: chapters.teaching,
      route: "/workspace/teacher/assignments",
      selector: "[data-tour='teacher-assignments']",
      title: { en: "Track assignments and tests", ro: "Urmărește temele și testele" },
      description: {
        en: "Monitor deadlines and completion by class, then open the relevant class when work needs adjustment.",
        ro: "Urmărește deadline-urile și completarea pe clasă, apoi deschide clasa relevantă când trebuie să intervii.",
      },
    },
    {
      chapter: chapters.teaching,
      route: "/workspace/teacher/calendar",
      selector: "[data-tour='teacher-calendar']",
      title: { en: "Plan deadlines visually", ro: "Planifică deadline-urile vizual" },
      description: {
        en: "The class calendar places every deadline on one timeline, making busy weeks easier to balance.",
        ro: "Calendarul claselor pune toate deadline-urile pe aceeași axă, pentru a echilibra mai ușor săptămânile aglomerate.",
      },
    },
    {
      chapter: chapters.teaching,
      route: "/workspace/teacher/analytics",
      selector: "[data-tour='teacher-analytics']",
      title: { en: "Use progress to guide support", ro: "Folosește progresul pentru intervenții" },
      description: {
        en: "Analytics compares class performance and surfaces students who may benefit from additional support.",
        ro: "Analiza compară performanța claselor și evidențiază elevii care pot beneficia de sprijin suplimentar.",
      },
    },
  ];
}

const copy = {
  en: { back: "Back", finish: "Finish tour", next: "Next", skip: "Skip tour", step: "Step" },
  ro: { back: "Înapoi", finish: "Încheie turul", next: "Continuă", skip: "Sari peste", step: "Pasul" },
} as const;

const cardFadeDuration = 280;
const tourFadeDuration = 550;
const targetFallbackDelay = 1600;

function waitFor(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function getSpotlightRect(element: Element): SpotlightRect {
  const rect = element.getBoundingClientRect();
  const padding = 8;
  return {
    height: rect.height + padding * 2,
    left: rect.left - padding,
    top: rect.top - padding,
    width: rect.width + padding * 2,
  };
}

function findVisibleTarget(selector: string) {
  return Array.from(document.querySelectorAll(selector)).find((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0;
  }) ?? null;
}

export function ProductTour({ onComplete }: ProductTourProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useLanguage();
  const { isAdmin, loading: authLoading, user } = useAuth();
  const language = locale === "ro" ? "ro" : "en";
  const c = copy[language];
  const stepTimerRef = useRef<number | null>(null);
  const preparedStepRef = useRef(-1);
  const [mounted, setMounted] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [resolvedStepIndex, setResolvedStepIndex] = useState(-1);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const persona =
    getWorkspacePersonaFromMetadata(
      user?.user_metadata as Record<string, unknown> | undefined
    ) || "learner";
  const steps = useMemo(
    () => (persona === "teacher" && !isAdmin ? getTeacherTourSteps() : getLearningTourSteps(persona)),
    [isAdmin, persona]
  );
  const step = steps[stepIndex];

  useEffect(() => {
    let enterFrame = 0;
    let visibleFrame = 0;
    setMounted(true);
    enterFrame = window.requestAnimationFrame(() => {
      visibleFrame = window.requestAnimationFrame(() => setOverlayVisible(true));
    });

    return () => {
      window.cancelAnimationFrame(enterFrame);
      window.cancelAnimationFrame(visibleFrame);
      if (stepTimerRef.current) window.clearTimeout(stepTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (authLoading || resolvedStepIndex !== stepIndex || finishing) return;
    const timer = window.setTimeout(() => {
      setCardVisible(true);
      setTransitioning(false);
    }, 100);
    return () => window.clearTimeout(timer);
  }, [authLoading, finishing, resolvedStepIndex, stepIndex]);

  useEffect(() => {
    if (authLoading) return;
    if (pathname !== step.route) {
      router.push(step.route);
      return;
    }

    let target: Element | null = null;
    let animationFrame = 0;
    let targetFallbackTimer = 0;

    // Never keep the previous spotlight visible while the next page or target
    // is resolving. A stale rectangle makes the tour appear frozen.
    setRect(null);
    setResolvedStepIndex(-1);

    function updateTarget() {
      if (step.activateSelector && preparedStepRef.current !== stepIndex) {
        const activator = findVisibleTarget(step.activateSelector);
        if (activator instanceof HTMLElement) {
          if (activator.getAttribute("aria-pressed") !== "true") {
            activator.click();
          }
          preparedStepRef.current = stepIndex;
        }
      }

      target = findVisibleTarget(step.selector);
      if (!target) return;

      const bounds = target.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setRect(getSpotlightRect(target));
      setResolvedStepIndex(stepIndex);
    }

    function scheduleUpdate() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateTarget);
    }

    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);
    const retry = window.setInterval(updateTarget, 300);
    targetFallbackTimer = window.setTimeout(() => {
      if (findVisibleTarget(step.selector)) return;

      // Product surfaces change over time. If an anchor is temporarily absent,
      // keep the explanatory card and navigation available instead of trapping
      // the user behind an unclickable overlay.
      setRect(null);
      setResolvedStepIndex(stepIndex);
    }, targetFallbackDelay);
    updateTarget();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
      window.clearInterval(retry);
      window.clearTimeout(targetFallbackTimer);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
    };
  }, [authLoading, pathname, router, step.activateSelector, step.route, step.selector, stepIndex]);

  const cardPosition = useMemo(() => {
    if (!rect || typeof window === "undefined") return undefined;
    const cardWidth = Math.min(360, window.innerWidth - 32);
    const cardHeight = 310;
    const gap = 20;
    const clampX = (value: number) =>
      Math.max(16, Math.min(value, window.innerWidth - cardWidth - 16));
    const clampY = (value: number) =>
      Math.max(16, Math.min(value, window.innerHeight - cardHeight - 16));

    if (window.innerWidth < 640) {
      return { bottom: 16, left: 16, width: cardWidth };
    }
    if (rect.left + rect.width + gap + cardWidth < window.innerWidth) {
      return {
        left: rect.left + rect.width + gap,
        top: clampY(rect.top),
        width: cardWidth,
      };
    }
    if (rect.top + rect.height + gap + cardHeight < window.innerHeight) {
      return {
        left: clampX(rect.left),
        top: rect.top + rect.height + gap,
        width: cardWidth,
      };
    }
    return {
      left: clampX(rect.left),
      top: clampY(rect.top - cardHeight - gap),
      width: cardWidth,
    };
  }, [rect]);

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    setCardVisible(false);
    setOverlayVisible(false);
    localStorage.removeItem(productTourStorageKey);
    void api.auth
      .updateUserMetadata({
        [onboardingMetadataKeys.tourCompletedAt]: new Date().toISOString(),
      })
      .catch(() => undefined);
    await waitFor(tourFadeDuration);
    onComplete();
  }

  function next() {
    if (transitioning || finishing) return;
    if (stepIndex === steps.length - 1) {
      void finish();
      return;
    }

    setTransitioning(true);
    setCardVisible(false);
    stepTimerRef.current = window.setTimeout(() => {
      setResolvedStepIndex(-1);
      setStepIndex((current) => current + 1);
      stepTimerRef.current = null;
    }, cardFadeDuration);
  }

  function previous() {
    if (transitioning || finishing || stepIndex === 0) return;
    setTransitioning(true);
    setCardVisible(false);
    stepTimerRef.current = window.setTimeout(() => {
      setResolvedStepIndex(-1);
      setStepIndex((current) => Math.max(0, current - 1));
      stepTimerRef.current = null;
    }, cardFadeDuration);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[110] pointer-events-none transition-opacity duration-500 ease-out ${
        overlayVisible ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={step.title[language]}
    >
      {rect ? (
        <div
          className="fixed rounded-lg border-2 border-sky-300 transition-all duration-700 ease-out"
          style={{
            height: rect.height,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            boxShadow:
              "0 0 0 9999px rgba(9, 12, 20, 0.78), 0 0 22px rgba(56, 189, 248, 0.9), inset 0 0 18px rgba(125, 211, 252, 0.2)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-[1px]" />
      )}

      {rect ? (
        <div
          className="fixed z-[1] transition-all duration-700 ease-out"
          style={{
            left: rect.left + Math.min(rect.width * 0.72, rect.width - 16),
            top: rect.top + Math.min(rect.height * 0.68, rect.height - 16),
          }}
        >
          <MousePointer2 className="h-8 w-8 animate-[pulse_1.6s_ease-in-out_infinite] fill-zinc-950 text-white" strokeWidth={2.6} />
        </div>
      ) : null}

      <section
        key={stepIndex}
        className={`sx-overlay fixed z-[2] overflow-hidden rounded-xl border border-white/15 bg-zinc-950 text-white shadow-2xl transition-[opacity,transform] duration-300 ease-out ${
          cardVisible && overlayVisible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-1.5 opacity-0"
        }`}
        aria-hidden={!cardVisible}
        style={cardPosition ?? {
          left: "50%",
          top: "50%",
          width: "min(360px, calc(100vw - 32px))",
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-sky-300 transition-[width] duration-500 ease-out"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-sky-200">
                <Sparkles className="h-3.5 w-3.5" />
                {step.chapter[language]}
              </div>
              <p className="mt-1 text-xs tabular-nums text-white/50">
                {c.step} {stepIndex + 1} / {steps.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void finish()}
              className="rounded-md p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              aria-label={c.skip}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-normal">
            {step.title[language]}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {step.description[language]}
          </p>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => void finish()}
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              {c.skip}
            </button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={previous}
                  className="border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {c.back}
                </Button>
              ) : null}
              <Button type="button" onClick={next} className="bg-white text-zinc-950 hover:bg-sky-50">
                {stepIndex === steps.length - 1 ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {stepIndex === steps.length - 1 ? c.finish : c.next}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
