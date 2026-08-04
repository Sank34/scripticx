"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Check, MousePointer2, Sparkles, X } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  onboardingMetadataKeys,
  productTourStorageKey,
} from "@/lib/onboarding";

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
  description: { en: string; ro: string };
  route: string;
  selector: string;
  title: { en: string; ro: string };
};

const steps: TourStep[] = [
  {
    route: "/dashboard",
    selector: "[data-tour='nav-editor'], [data-tour='mobile-menu']",
    title: { en: "Your build space", ro: "Spațiul tău de lucru" },
    description: {
      en: "The Editor is where ideas become runnable MiniScript+ programs. We will open it for the next step.",
      ro: "În Editor transformi ideile în programe MiniScript+ executabile. Îl deschidem la pasul următor.",
    },
  },
  {
    route: "/editor",
    selector: "[data-tour='editor-code']",
    title: { en: "Write with context", ro: "Scrie cod cu context" },
    description: {
      en: "The code workspace supports multiple files, smart editing and the MiniScript+ language out of the box.",
      ro: "Spațiul de cod suportă mai multe fișiere, editare inteligentă și limbajul MiniScript+ direct din start.",
    },
  },
  {
    route: "/editor",
    selector: "[data-tour='editor-run']",
    title: { en: "Run or step through code", ro: "Rulează sau execută pas cu pas" },
    description: {
      en: "Run the whole program, or use Step to see variables and output evolve one instruction at a time.",
      ro: "Rulează tot programul sau folosește Step pentru a urmări variabilele și output-ul instrucțiune cu instrucțiune.",
    },
  },
  {
    route: "/editor",
    selector: "[data-tour='editor-visualize']",
    title: { en: "See what the code means", ro: "Vezi ce înseamnă codul" },
    description: {
      en: "Open AST and flowchart views to connect source code with its structure and execution flow.",
      ro: "Deschide vizualizările AST și flowchart pentru a conecta sursa cu structura și fluxul execuției.",
    },
  },
  {
    route: "/learn",
    selector: "[data-tour='roadmap-workspace'], [data-tour='mobile-menu']",
    title: { en: "Follow your roadmap", ro: "Urmează roadmap-ul" },
    description: {
      en: "Lessons, quizzes and code challenges form a guided path that adapts to the concepts you unlock.",
      ro: "Lecțiile, quiz-urile și challenge-urile formează un traseu ghidat prin conceptele pe care le deblochezi.",
    },
  },
  {
    route: "/problems",
    selector: "[data-tour='problems-workspace'], [data-tour='mobile-menu']",
    title: { en: "Practice deliberately", ro: "Exersează cu intenție" },
    description: {
      en: "Use the problem library to turn each lesson into practice. You can filter by difficulty and track solved work.",
      ro: "Folosește biblioteca de probleme pentru a transforma fiecare lecție în practică și urmărește ce ai rezolvat.",
    },
  },
];

const copy = {
  en: { finish: "Finish tour", next: "Next", skip: "Skip tour", step: "Step" },
  ro: { finish: "Încheie turul", next: "Continuă", skip: "Sari peste", step: "Pasul" },
} as const;

const cardFadeDuration = 280;
const tourFadeDuration = 550;

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
  const language = locale === "ro" ? "ro" : "en";
  const c = copy[language];
  const stepTimerRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [resolvedStepIndex, setResolvedStepIndex] = useState(-1);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
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
    if (resolvedStepIndex !== stepIndex || finishing) return;
    const timer = window.setTimeout(() => {
      setCardVisible(true);
      setTransitioning(false);
    }, 100);
    return () => window.clearTimeout(timer);
  }, [finishing, resolvedStepIndex, stepIndex]);

  useEffect(() => {
    if (pathname !== step.route) {
      router.push(step.route);
      return;
    }

    let target: Element | null = null;
    let animationFrame = 0;

    function updateTarget() {
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
    updateTarget();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
      window.clearInterval(retry);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
    };
  }, [pathname, router, step.route, step.selector, stepIndex]);

  const cardPosition = useMemo(() => {
    if (!rect || typeof window === "undefined") return undefined;
    const cardWidth = Math.min(360, window.innerWidth - 32);
    const cardHeight = 250;
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
    await Promise.all([
      api.auth.updateUserMetadata({
        [onboardingMetadataKeys.tourCompletedAt]: new Date().toISOString(),
      }),
      waitFor(tourFadeDuration),
    ]);
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
            filter: "drop-shadow(0 0 10px rgba(56,189,248,0.95))",
          }}
        >
          <MousePointer2 className="h-8 w-8 animate-[pulse_1.6s_ease-in-out_infinite] fill-zinc-950 text-white" strokeWidth={2.6} />
        </div>
      ) : null}

      <section
        key={stepIndex}
        className={`fixed z-[2] rounded-lg border border-white/15 bg-zinc-950 p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-opacity duration-300 ease-out ${
          cardVisible && overlayVisible
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!cardVisible}
        style={cardPosition ?? {
          left: "50%",
          top: "50%",
          width: "min(360px, calc(100vw - 32px))",
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-sky-300">
            <Sparkles className="h-3.5 w-3.5" />
            {c.step} {stepIndex + 1}/{steps.length}
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
        <h2 className="mt-4 text-xl font-semibold tracking-normal">{step.title[language]}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-300">{step.description[language]}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void finish()}
            className="text-sm text-zinc-400 transition hover:text-white"
          >
            {c.skip}
          </button>
          <Button type="button" onClick={next} className="bg-white text-zinc-950 hover:bg-sky-50">
            {stepIndex === steps.length - 1 ? (
              <Check className="h-4 w-4" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {stepIndex === steps.length - 1 ? c.finish : c.next}
          </Button>
        </div>
      </section>
    </div>,
    document.body
  );
}
