"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import RouteGuard from "@/components/RouteGuard";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { getLocalized } from "@/lib/getLocalized";
import { supabase } from "@/lib/supabase";
import { fetchProblemChapters, validateProblemChapters, type ProblemChapter, type ChapterText } from "@/lib/problem-chapters";

function ChaptersEditor() {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const queryClient = useQueryClient();
  const catalog = useQuery({ queryKey: ["problem-catalog"], queryFn: fetchProblemChapters });
  const problems = useQuery({ queryKey: ["admin", "catalog-problems"], queryFn: async () => {
    const { data, error } = await supabase.from("problems").select("id, code, title_i18n").order("code");
    if (error) throw error;
    return data as { id: string; code: number | null; title_i18n: Record<string, string> }[];
  } });
  const [draft, setDraft] = useState<ProblemChapter[] | null>(null);
  const [baseVersion, setBaseVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const chapters = draft ?? catalog.data?.chapters ?? [];
  const edit = (next: ProblemChapter[]) => {
    if (!draft) setBaseVersion(catalog.data?.updatedAt ?? null);
    setDraft(next);
  };
  const patch = (id: string, values: Partial<ProblemChapter>) => edit(chapters.map(c => c.id === id ? { ...c, ...values } : c));
  const move = <T,>(items: T[], index: number, direction: number): T[] => {
    const next = [...items];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    return next;
  };
  const textFields = (label: string, text: ChapterText, onChange: (next: ChapterText) => void) => <div className="grid gap-3 sm:grid-cols-2">
    {(["ro", "en"] as const).map(language => <label key={language} className="grid gap-1.5 text-sm">{label} ({language.toUpperCase()})<Input maxLength={300} value={text[language]} onChange={e => onChange({ ...text, [language]: e.target.value })} /></label>)}
  </div>;

  async function save() {
    if (!validateProblemChapters(chapters) || chapters.some(c => !c.title.ro.trim() || !c.title.en.trim() || c.topics.some(t => !t.title.ro.trim() || !t.title.en.trim()))) {
      toast.error(ro ? "Completează titlurile în română și engleză." : "Complete the Romanian and English titles."); return;
    }
    setBusy(true);
    try {
      const payload = { chapters, updated_at: new Date().toISOString() };
      const result = baseVersion
        ? await supabase.from("problem_catalog").update(payload).eq("id", 1).eq("updated_at", baseVersion).select("id").single()
        : await supabase.from("problem_catalog").insert({ id: 1, ...payload }).select("id").single();
      if (result.error) throw result.error;
      await queryClient.invalidateQueries({ queryKey: ["problem-catalog"] });
      setDraft(null);
      toast.success(ro ? "Capitolele au fost salvate." : "Chapters saved.");
    } catch {
      toast.error(ro ? "Salvarea a eșuat. Verifică migrarea Supabase sau reîncarcă pagina dacă alt admin a modificat capitolele." : "Save failed. Check the Supabase migration, or reload if another admin edited the catalog.");
    } finally { setBusy(false); }
  }

  if (catalog.isPending || problems.isPending) return <p role="status">{ro ? "Se încarcă…" : "Loading…"}</p>;
  if (catalog.isError || problems.isError) return <div className="space-y-3"><p>{ro ? "Nu am putut încărca datele." : "Could not load data."}</p><Button onClick={() => { void catalog.refetch(); void problems.refetch(); }}>{ro ? "Reîncearcă" : "Retry"}</Button></div>;
  return <div className="mx-auto max-w-5xl space-y-6 pb-8">
    <header className="space-y-2"><Link href="/admin/problems" className="text-sm text-muted-foreground underline">{ro ? "Înapoi la probleme" : "Back to problems"}</Link><h1 className="text-2xl font-semibold">{ro ? "Capitole și subcapitole" : "Chapters and topics"}</h1><p className="text-sm text-muted-foreground">{ro ? "Ordinea de aici este cea din biblioteca de probleme. Capitolele goale nu apar public." : "This order is used in the problem library. Empty chapters are not shown publicly."}</p></header>
    {!catalog.data.available && <p role="status" className="rounded-lg border border-border bg-muted p-4 text-sm">{ro ? "Pentru salvare trebuie aplicată migrarea Supabase 20260912170000_problem_catalog.sql. Biblioteca folosește momentan capitolele inițiale." : "Saving requires the Supabase migration 20260912170000_problem_catalog.sql. The library currently uses the initial chapters."}</p>}
    <fieldset disabled={busy || !catalog.data.available} className="min-w-0 space-y-4 disabled:opacity-60">
      {chapters.map((chapter, index) => <section key={chapter.id} className="sx-surface min-w-0 space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{ro ? "Capitolul" : "Chapter"} {index + 1}</h2><div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label={ro ? "Mută capitolul în sus" : "Move chapter up"} disabled={index === 0} onClick={() => edit(move(chapters, index, -1))}><ArrowUp /></Button>
          <Button variant="ghost" size="icon" aria-label={ro ? "Mută capitolul în jos" : "Move chapter down"} disabled={index === chapters.length - 1} onClick={() => edit(move(chapters, index, 1))}><ArrowDown /></Button>
          {!chapter.topics.some(t => t.problemIds.length) && <Button variant="ghost" onClick={() => edit(chapters.filter(c => c.id !== chapter.id))}>{ro ? "Elimină" : "Remove"}</Button>}
        </div></div>
        {textFields(ro ? "Titlu" : "Title", chapter.title, title => patch(chapter.id, { title }))}
        {textFields(ro ? "Descriere" : "Description", chapter.description, description => patch(chapter.id, { description }))}
        <Accordion type="multiple" className="space-y-3">
          {chapter.topics.map((topic, topicIndex) => <AccordionItem key={topic.id} value={topic.id} className="rounded-lg border border-border">
            <AccordionTrigger className="min-h-12 items-center p-3 hover:no-underline"><span>{getLocalized(topic.title, locale) || (ro ? "Subcapitol nou" : "New topic")} <span className="text-muted-foreground">({topic.problemIds.length})</span></span></AccordionTrigger>
            <AccordionContent className="pb-0">
            <div className="space-y-4 border-t border-border p-3">
              {textFields(ro ? "Subcapitol" : "Topic", topic.title, title => patch(chapter.id, { topics: chapter.topics.map(t => t.id === topic.id ? { ...t, title } : t) }))}
              <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={topicIndex === 0} onClick={() => patch(chapter.id, { topics: move(chapter.topics, topicIndex, -1) })}>{ro ? "Mută în sus" : "Move up"}</Button><Button variant="outline" size="sm" disabled={topicIndex === chapter.topics.length - 1} onClick={() => patch(chapter.id, { topics: move(chapter.topics, topicIndex, 1) })}>{ro ? "Mută în jos" : "Move down"}</Button>{!topic.problemIds.length && <Button variant="ghost" size="sm" onClick={() => patch(chapter.id, { topics: chapter.topics.filter(t => t.id !== topic.id) })}>{ro ? "Elimină subcapitolul" : "Remove topic"}</Button>}</div>
              <Input aria-label={ro ? "Caută probleme pentru atribuire" : "Search problems to assign"} placeholder={ro ? "Caută după titlu sau număr…" : "Search by title or number…"} value={search} onChange={e => setSearch(e.target.value)} />
              <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                {problems.data.filter(p => `${p.code} ${getLocalized(p.title_i18n, locale)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(p => <label key={p.id} htmlFor={`${topic.id}-${p.id}`} className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-0 hover:bg-muted/50"><Checkbox id={`${topic.id}-${p.id}`} checked={topic.problemIds.includes(p.id)} onCheckedChange={checked => patch(chapter.id, { topics: chapter.topics.map(t => t.id === topic.id ? { ...t, problemIds: checked === true ? [...t.problemIds, p.id] : t.problemIds.filter(id => id !== p.id) } : t) })} /><span className="min-w-0 break-words">#{p.code} {getLocalized(p.title_i18n, locale)}</span></label>)}
                {!problems.data.some(p => `${p.code} ${getLocalized(p.title_i18n, locale)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())) && <p className="p-3 text-sm text-muted-foreground">{ro ? "Nicio problemă găsită." : "No problems found."}</p>}
              </div>
            </div>
            </AccordionContent>
          </AccordionItem>)}
        </Accordion>
        <Button variant="outline" onClick={() => patch(chapter.id, { topics: [...chapter.topics, { id: crypto.randomUUID(), title: { ro: "", en: "" }, problemIds: [] }] })}><Plus />{ro ? "Adaugă subcapitol" : "Add topic"}</Button>
      </section>)}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => edit([...chapters, { id: crypto.randomUUID(), title: { ro: "", en: "" }, description: { ro: "", en: "" }, topics: [] }])}><Plus />{ro ? "Adaugă capitol" : "Add chapter"}</Button>
        <Button disabled={!draft || busy} onClick={() => void save()}><Save />{busy ? (ro ? "Se salvează…" : "Saving…") : (ro ? "Salvează modificările" : "Save changes")}</Button>
      </div>
    </fieldset>
  </div>;
}

export default function ProblemChaptersAdminPage() {
  return <RouteGuard requireAuth requireAdmin><ChaptersEditor /></RouteGuard>;
}
