"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, Lightbulb } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";

type OnboardingPreparingProps = {
  onComplete: () => void;
  onStart: () => void;
  ready: boolean;
};

const preparationDuration = 20000;

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

export function OnboardingPreparing({ onComplete, onStart, ready }: OnboardingPreparingProps) {
  const { locale } = useLanguage();
  const language = locale === "ro" ? "ro" : "en";
  const c = content[language];
  const [messageIndex, setMessageIndex] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const readyTitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => readyTitleRef.current?.focus({ preventScroll: true }), 1000);
    return () => window.clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    if (ready) return;
    const messageTimers = c.messages.slice(1).map((_, index) =>
      window.setTimeout(() => setMessageIndex(index + 1), (index + 1) * 4000)
    );
    const factTimers = c.facts.slice(1).map((_, index) =>
      window.setTimeout(() => setFactIndex(index + 1), (index + 1) * 5000)
    );
    const completionTimer = window.setTimeout(
      onComplete,
      preparationDuration
    );

    return () => {
      messageTimers.forEach(window.clearTimeout);
      factTimers.forEach(window.clearTimeout);
      window.clearTimeout(completionTimer);
    };
  }, [c.facts, c.messages, onComplete, ready]);

  return (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto bg-background text-foreground"
    >
      <div className="pointer-events-none absolute inset-0 bg-muted/20" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-primary" />

      <div className="relative flex min-h-[max(100dvh,32rem)] flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)] sm:px-8">
        <header
          className="absolute left-1/2 z-10 -translate-x-1/2 transition-[top] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ top: ready ? "calc(50% - 10rem)" : "calc(env(safe-area-inset-top) + 1.5rem)" }}
        >
          <Image src="/logo-text.svg" alt="ScripticX" width={203} height={41} className="h-auto w-44 dark:invert" />
        </header>

        <main
          aria-hidden={ready}
          inert={ready}
          className={`relative z-[1] flex min-h-80 flex-1 items-center justify-center py-10 transition-[opacity,transform] duration-500 motion-reduce:transition-none sm:py-12 ${ready ? "-translate-y-3 opacity-0" : "translate-y-0 opacity-100"}`}
        >
          <div className="w-full max-w-3xl text-center" role={ready ? undefined : "status"} aria-live={ready ? "off" : "polite"} aria-label={c.status}>
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

        <aside aria-hidden={ready} className={`relative z-[1] shrink-0 px-1 pb-2 text-center transition-opacity duration-500 motion-reduce:transition-none sm:px-8 ${ready ? "opacity-0" : "opacity-100"}`}>
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
        <section
          aria-hidden={!ready}
          inert={!ready}
          aria-labelledby="onboarding-ready-title"
          className={`absolute inset-0 flex items-center justify-center px-6 pt-12 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${ready ? "translate-y-0 opacity-100 delay-200" : "pointer-events-none translate-y-5 opacity-0"}`}
        >
          <div className="w-full max-w-lg text-center">
            <h1 ref={readyTitleRef} tabIndex={-1} id="onboarding-ready-title" className="text-3xl font-semibold tracking-tight outline-none sm:text-4xl">
              {language === "ro" ? "Contul tău este pregătit." : "Your account is ready."}
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              {language === "ro" ? "Preferințele tale sunt salvate. Hai să descoperim workspace-ul tău împreună." : "Your preferences are saved. Let’s take a tour of your workspace."}
            </p>
            <Button onClick={onStart} size="lg" className="mt-8 gap-2">
              {language === "ro" ? "Să începem turul" : "Let’s start the tour"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
