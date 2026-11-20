"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, RotateCcw, X } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { text, type LessonLocale, type LessonQuizQuestion } from "@/lib/learn-lessons";
import { gradeLessonQuiz, randomizeLessonQuiz } from "@/lib/lesson-quiz";
import { cn } from "@/lib/utils";

const copy = {
  ro: { quiz: "Quiz-ul lecției", question: "Întrebarea", of: "din", check: "Verifică răspunsul", continue: "Continuă", results: "Vezi rezultatul", retry: "Încearcă din nou", saving: "Se salvează progresul…", correct: "Corect!", incorrect: "Mai verifică ideea aceasta", correctAnswer: "Răspunsul corect", passed: "Ai răspuns corect la toate întrebările!", failed: "Încă puțină practică", required: "Ai nevoie de 100% pentru a promova. Poți reciti lecția și repeta quiz-ul.", finish: "Finalizează lecția", error: "Progresul nu a putut fi salvat. Verifică conexiunea și încearcă din nou.", missing: "Quiz-ul nu este disponibil încă. Lecția nu poate fi finalizată fără el.", back: "Înapoi la lecție" },
  en: { quiz: "Lesson quiz", question: "Question", of: "of", check: "Check answer", continue: "Continue", results: "See results", retry: "Try again", saving: "Saving progress…", correct: "Correct!", incorrect: "Let's review this idea", correctAnswer: "Correct answer", passed: "You answered every question correctly!", failed: "A little more practice", required: "You need 100% to pass. You can review the lesson and repeat the quiz.", finish: "Finish lesson", error: "Your progress could not be saved. Check your connection and try again.", missing: "This quiz is not available yet. The lesson cannot be completed without it.", back: "Back to lesson" },
};

export function LessonQuiz({ questions, locale, lessonTitle, onPassed, onExit }: {
  questions: LessonQuizQuestion[];
  locale: LessonLocale;
  lessonTitle: string;
  onPassed: (score: number) => Promise<void>;
  onExit: () => void;
}) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [items, setItems] = useState(() => randomizeLessonQuiz(questions));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const c = copy[locale];
  const result = gradeLessonQuiz(items, answers);
  const question = items[index];
  const correct = question && answers[index] === question.answerIndex;
  const answeredCount = showResult ? items.length : index + (checked ? 1 : 0);

  useEffect(() => { heading.current?.focus(); }, [index, showResult]);

  async function finish() {
    if (!result.passed || saving) return;
    setSaving(true);
    setError(false);
    try { await onPassed(result.score); }
    catch { setError(true); }
    finally { setSaving(false); }
  }

  return <Dialog open onOpenChange={open => { if (!open && !saving) onExit(); }}>
    <DialogContent showCloseButton={false} onCloseAutoFocus={event => event.preventDefault()} className="inset-0 left-0 top-0 z-[120] flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 text-foreground shadow-none ring-0 sm:max-w-none data-open:animate-none data-closed:animate-none">
      <DialogTitle className="sr-only">{c.quiz}: {lessonTitle}</DialogTitle>
      <DialogDescription className="sr-only">{c.required}</DialogDescription>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-primary"/>
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-5 py-5 sm:px-8">
        <header className="flex shrink-0 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3"><CheckCircle2 className="size-6 shrink-0" aria-hidden="true"/><div className="min-w-0"><p className="text-sm font-semibold">{c.quiz}</p><p className="truncate text-xs text-muted-foreground">{lessonTitle}</p></div></div>
          <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={c.back} onClick={onExit} disabled={saving}><X className="size-5"/></Button>
        </header>
        <div className="mx-auto mt-6 w-full max-w-2xl shrink-0" role="progressbar" aria-label={c.quiz} aria-valuemin={0} aria-valuemax={items.length || 1} aria-valuenow={answeredCount}>
          <div className="flex gap-2">{items.map((_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none", i < answeredCount ? "bg-primary" : "bg-muted")}/>)}</div>
          <p className="mt-3 text-center text-xs text-muted-foreground">{showResult ? `${result.score}/${items.length}` : `${c.question} ${Math.min(index + 1, items.length)} ${c.of} ${items.length}`}</p>
        </div>
        <div className="note-scrollbar flex min-h-0 flex-1 overflow-y-auto py-7 sm:py-10">
          <div key={`${index}-${showResult}`} className="m-auto w-full max-w-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3 motion-safe:duration-200">
            {!items.length ? <h1 ref={heading} tabIndex={-1} className="text-center text-2xl font-semibold outline-none">{c.missing}</h1> : showResult ? <div className="text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border bg-card">{result.passed ? <CheckCircle2 className="size-8"/> : <RotateCcw className="size-8"/>}</div>
              <h1 ref={heading} tabIndex={-1} className="mt-6 text-3xl font-semibold tracking-tight outline-none sm:text-4xl">{result.passed ? c.passed : c.failed}</h1>
              <p className="mt-5 text-3xl font-semibold">{result.score}/{items.length}</p>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-muted-foreground">{result.passed ? (locale === "ro" ? "Finalizează lecția pentru a salva progresul și a continua traseul." : "Finish the lesson to save your progress and continue the path.") : c.required}</p>
            </div> : question && <fieldset className="min-w-0" disabled={checked}>
              <legend className="sr-only">{c.question} {index + 1}</legend>
              <h1 ref={heading} tabIndex={-1} className="sr-only outline-none">{c.question} {index + 1}</h1>
              <Markdown className="mb-6 text-center text-2xl font-semibold leading-snug sm:text-3xl [&_p]:my-0 [&_pre]:mt-5 [&_pre]:text-left">{text(question.question, locale)}</Markdown>
              <div className="grid gap-3 sm:grid-cols-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className={cn("relative flex min-h-24 cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-colors motion-reduce:transition-none hover:border-primary/50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", answers[index] === optionIndex && "border-primary bg-primary/5 ring-1 ring-primary/15", checked && "cursor-default")}>
                <input type="radio" name={`${id}-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers(current => ({ ...current, [index]: optionIndex }))} className="mt-1 size-4 shrink-0 accent-primary"/>
                <Markdown className="min-w-0 flex-1 text-sm font-medium [&_p]:my-0 [&_code]:break-words">{text(option, locale)}</Markdown>
              </label>)}</div>
            </fieldset>}
          </div>
        </div>
        <footer className="mx-auto w-full max-w-2xl shrink-0 border-t pt-4 pb-[env(safe-area-inset-bottom)]">
          {checked && !showResult && question && <div role="status" className="mb-4 max-h-[25dvh] overflow-y-auto rounded-xl bg-muted/60 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold">{correct ? <Check className="size-4"/> : <RotateCcw className="size-4"/>}{correct ? c.correct : c.incorrect}</p>
            {!correct && <div className="mt-2"><span className="font-medium">{c.correctAnswer}: </span><Markdown className="inline text-sm [&_p]:inline">{text(question.options[question.answerIndex], locale)}</Markdown></div>}
            {question.explanation && <Markdown className="mt-2 text-sm text-muted-foreground [&_p]:my-0">{text(question.explanation, locale)}</Markdown>}
          </div>}
          {error && <p role="alert" className="mb-3 text-sm text-destructive">{c.error}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="outline" size="lg" className="h-12 min-w-12" onClick={onExit} disabled={saving} aria-label={c.back}><ArrowLeft className="size-4"/><span className="hidden sm:inline">{c.back}</span></Button>
            {items.length > 0 && <Button type="button" size="lg" className="h-12 flex-1" disabled={saving || !showResult && answers[index] === undefined} onClick={() => {
              if (showResult) {
                if (result.passed) void finish();
                else { setItems(randomizeLessonQuiz(questions)); setAnswers({}); setChecked(false); setIndex(0); setShowResult(false); setError(false); }
              } else if (!checked) setChecked(true);
              else if (index === items.length - 1) setShowResult(true);
              else { setIndex(current => current + 1); setChecked(false); }
            }}>{saving ? c.saving : showResult ? result.passed ? c.finish : c.retry : checked ? index === items.length - 1 ? c.results : c.continue : c.check}<ArrowRight className="size-4"/></Button>}
          </div>
        </footer>
      </div>
    </DialogContent>
  </Dialog>;
}
