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
      className={`fixed inset-0 z-[120] overflow-y-auto bg-background text-foreground transition-opacity duration-700 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-muted/20" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-primary" />

      <div className="relative flex min-h-[100dvh] flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)] sm:px-8">
        <header className="flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logoSCX.svg" alt="ScripticX" className="h-9 w-9 dark:invert" />
          <span className="text-lg font-semibold">ScripticX</span>
        </header>

        <main className="relative z-[1] flex min-h-80 flex-1 items-center justify-center py-10 sm:py-12">
          <div className="w-full max-w-3xl text-center" role="status" aria-live="polite" aria-label={c.status}>
            <div className="mx-auto mb-7 flex h-11 w-11 items-center justify-center rounded-lg border bg-card text-foreground shadow-sm">
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
            <div className="mx-auto mt-8 h-1 w-full max-w-sm overflow-hidden rounded-full bg-muted shadow-inner backdrop-blur-sm">
              <div className="onboarding-preparing-progress h-full rounded-full bg-primary" />
            </div>
          </div>
        </main>

        <aside className="relative z-[1] shrink-0 px-1 pb-2 text-center sm:px-8">
          <div className="mx-auto max-w-2xl">
            <p className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5" />
              {c.factsLabel}
            </p>
            <p
              key={`${language}-${factIndex}`}
              className="mt-3 animate-in fade-in slide-in-from-bottom-3 text-sm leading-6 text-muted-foreground duration-700 sm:text-base"
            >
              {c.facts[factIndex]}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
