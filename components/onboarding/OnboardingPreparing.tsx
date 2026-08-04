"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Sparkles } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";

type OnboardingPreparingProps = {
  onComplete: () => void;
};

const preparationDuration = 20000;
const exitDuration = 700;

const content = {
  en: {
    factsLabel: "Did you know?",
    facts: [
      "MiniScript+ began taking shape during a computer science class in high school.",
      "An abstract syntax tree turns source code into a structure that both interpreters and visualizers can understand.",
      "Binary search can find an item in one million sorted values in about twenty comparisons.",
      "ScripticX can pause execution one instruction at a time, so you can see variables change instead of guessing what happened.",
    ],
    messages: [
      "Getting things ready for you... hold on tight!",
      "Baking your choices into your learning path...",
      "Tuning your editor and configuring your profile...",
      "One last compile, then it is all yours.",
      "Your roadmap is ready. Opening the doors...",
    ],
    status: "Preparing your ScripticX workspace",
  },
  ro: {
    factsLabel: "Știai că?",
    facts: [
      "MiniScript+ a început să prindă formă în timpul unei ore de informatică din liceu.",
      "Un arbore sintactic abstract transformă sursa într-o structură pe care interpretoarele și vizualizatoarele o pot înțelege.",
      "Căutarea binară poate găsi un element printre un milion de valori sortate în aproximativ douăzeci de comparații.",
      "ScripticX poate opri execuția după fiecare instrucțiune, ca să vezi cum se schimbă variabilele în loc să ghicești ce s-a întâmplat.",
    ],
    messages: [
      "Pregătim totul pentru tine... ține-te bine!",
      "Integrăm alegerile tale în traseul de învățare...",
      "Reglăm editorul și configurăm profilul...",
      "Încă o ultimă compilare și totul este al tău.",
      "Roadmap-ul este pregătit. Deschidem ușile...",
    ],
    status: "Pregătim spațiul tău ScripticX",
  },
} as const;

export function OnboardingPreparing({ onComplete }: OnboardingPreparingProps) {
  const { locale } = useLanguage();
  const language = locale === "ro" ? "ro" : "en";
  const c = content[language];
  const [messageIndex, setMessageIndex] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let enterFrame = 0;
    let visibleFrame = 0;
    enterFrame = window.requestAnimationFrame(() => {
      visibleFrame = window.requestAnimationFrame(() => setVisible(true));
    });
    const messageTimers = c.messages.slice(1).map((_, index) =>
      window.setTimeout(() => setMessageIndex(index + 1), (index + 1) * 4000)
    );
    const factTimers = c.facts.slice(1).map((_, index) =>
      window.setTimeout(() => setFactIndex(index + 1), (index + 1) * 5000)
    );
    const exitTimer = window.setTimeout(() => setVisible(false), preparationDuration);
    const completionTimer = window.setTimeout(
      onComplete,
      preparationDuration + exitDuration
    );

    return () => {
      window.cancelAnimationFrame(enterFrame);
      window.cancelAnimationFrame(visibleFrame);
      messageTimers.forEach(window.clearTimeout);
      factTimers.forEach(window.clearTimeout);
      window.clearTimeout(exitTimer);
      window.clearTimeout(completionTimer);
    };
  }, [c.facts, c.messages, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[120] overflow-y-auto bg-white text-zinc-950 transition-opacity duration-700 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_58%,#f0fdf4_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-sky-500 to-violet-500" />

      <div className="absolute left-1/2 top-[45%] h-64 w-[min(78vw,680px)] -translate-x-1/2 -translate-y-1/2 sm:h-80">
        <div className="onboarding-preparing-blob absolute inset-0 rounded-[46%] bg-[conic-gradient(from_120deg,rgba(52,211,153,0.58),rgba(56,189,248,0.65),rgba(139,92,246,0.52),rgba(52,211,153,0.58))] opacity-65 blur-3xl" />
      </div>

      <div className="relative flex min-h-[100dvh] flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)] sm:px-8">
        <header className="flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logoSCX.svg" alt="ScripticX" className="h-9 w-9" />
          <span className="text-lg font-semibold">ScripticX</span>
        </header>

        <main className="relative z-[1] flex min-h-80 flex-1 items-center justify-center py-10 sm:py-12">
          <div className="w-full max-w-3xl text-center" role="status" aria-live="polite" aria-label={c.status}>
            <div className="mx-auto mb-7 flex h-11 w-11 items-center justify-center rounded-lg border border-white/80 bg-white/70 text-sky-700 shadow-[0_12px_40px_rgba(14,165,233,0.2)] backdrop-blur-md">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex min-h-28 items-center justify-center sm:min-h-32">
              <h1
                key={`${language}-${messageIndex}`}
                className="animate-in fade-in slide-in-from-bottom-5 text-2xl font-semibold leading-tight tracking-normal duration-700 sm:text-4xl"
              >
                {c.messages[messageIndex]}
              </h1>
            </div>
            <div className="mx-auto mt-8 h-1 w-full max-w-sm overflow-hidden rounded-full bg-white/65 shadow-inner backdrop-blur-sm">
              <div className="onboarding-preparing-progress h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500" />
            </div>
          </div>
        </main>

        <aside className="relative z-[1] shrink-0 px-1 pb-2 text-center sm:px-8">
          <div className="mx-auto max-w-2xl">
            <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase text-emerald-700">
              <Lightbulb className="h-3.5 w-3.5" />
              {c.factsLabel}
            </p>
            <p
              key={`${language}-${factIndex}`}
              className="mt-3 animate-in fade-in slide-in-from-bottom-3 text-sm leading-6 text-zinc-600 duration-700 sm:text-base"
            >
              {c.facts[factIndex]}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
