"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { getLocalized } from "@/lib/getLocalized";
import type { ProblemChapter, ProblemTopic } from "@/lib/problem-chapters";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function ProblemChapters({ chapters, problemIds, progress, onSelect }: {
  chapters: ProblemChapter[];
  problemIds: string[];
  progress: Record<string, number>;
  onSelect: (topic: ProblemTopic) => void;
}) {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const visible = new Set(problemIds);
  const assigned = new Set(chapters.flatMap(c => c.topics.flatMap(t => t.problemIds)));
  const other = problemIds.filter(id => !assigned.has(id));
  const populated = chapters.map(c => ({ ...c, topics: c.topics.map(t => ({ ...t, problemIds: [...new Set(t.problemIds)].filter(id => visible.has(id)) })).filter(t => t.problemIds.length) })).filter(c => c.topics.length);
  if (other.length) populated.push({ id: "unclassified", title: { ro: "Mai multe probleme", en: "More problems" }, description: { ro: "Probleme care nu au fost încă atribuite unui capitol.", en: "Problems not yet assigned to a chapter." }, topics: [{ id: "unclassified-topic", title: { ro: "Probleme neclasificate", en: "Unclassified problems" }, problemIds: other }] });

  return <Accordion type="multiple" value={populated.filter(c => expanded[c.id] ?? desktop).map(c => c.id)} onValueChange={ids => setExpanded(Object.fromEntries(populated.map(c => [c.id, ids.includes(c.id)])))} className="grid items-start gap-4 lg:grid-cols-2">
    {populated.map((chapter, index) => {
      const ids = [...new Set(chapter.topics.flatMap(t => t.problemIds))];
      const solved = ids.filter(id => progress[id] === 100).length;
      return <AccordionItem key={chapter.id} value={chapter.id} className="sx-surface group min-w-0 overflow-hidden">
        <AccordionTrigger className="min-h-14 gap-3 rounded-none p-4 font-normal hover:no-underline focus-visible:ring-inset sm:p-5">
          <span className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-muted-foreground">{chapter.id === "unclassified" ? (ro ? "Alte probleme" : "Other problems") : `${ro ? "Capitolul" : "Chapter"} ${index + 1}`}</span>
            <span className="block text-base font-semibold">{getLocalized(chapter.title, locale)}</span>
            <span className="mt-1 hidden text-sm leading-5 text-muted-foreground group-data-[state=open]:block sm:block">{getLocalized(chapter.description, locale)}</span>
            <span className="mt-3 block text-xs tabular-nums text-muted-foreground">{solved} / {ids.length} {ro ? "rezolvate" : "solved"}</span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-0">
        <div className="divide-y divide-border border-t border-border">
          {chapter.topics.map(topic => {
            const done = topic.problemIds.filter(id => progress[id] === 100).length;
            return <button key={topic.id} type="button" onClick={() => onSelect(topic)} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5">
              <span className="min-w-0 break-words">{getLocalized(topic.title, locale)}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs tabular-nums text-muted-foreground">
                {done === topic.problemIds.length && <CheckCircle2 className="size-4" aria-hidden="true" />}
                <span aria-label={`${done} / ${topic.problemIds.length} ${ro ? "rezolvate" : "solved"}`}>{done} / {topic.problemIds.length}</span>
              </span>
            </button>;
          })}
        </div>
        </AccordionContent>
      </AccordionItem>;
    })}
  </Accordion>;
}
