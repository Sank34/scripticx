"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { text, type LessonLocale, type RecommendedProblem } from "@/lib/learn-lessons";
import { supabase } from "@/lib/supabase";

export function RoadmapProblemPicker({ value, onChange, locale }: { value: RecommendedProblem[]; onChange: (problems: RecommendedProblem[]) => void; locale: LessonLocale }) {
  const id = useId();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ro = locale === "ro";

  async function add() {
    const number = Number(code);
    if (!Number.isSafeInteger(number) || number <= 0 || loading) return;
    setLoading(true); setError("");
    try {
      const { data, error } = await supabase.from("problems").select("id, code, title_i18n, difficulty").eq("visibility", "public").eq("code", number).maybeSingle();
      if (error) throw error;
      if (!data) { setError(ro ? "Nu există o problemă publică cu acest cod." : "No public problem has this code."); return; }
      if (!value.some(problem => problem.code === number)) onChange([...value, { code: number, href: `/problems/${data.id}`, title: { en: data.title_i18n?.en ?? `#${number}`, ro: data.title_i18n?.ro ?? data.title_i18n?.en ?? `#${number}` }, topic: "practice", difficulty: ["easy", "medium", "hard"].includes(data.difficulty) ? data.difficulty : undefined }]);
      setCode("");
    } catch { setError(ro ? "Problema nu a putut fi încărcată. Încearcă din nou." : "Could not load the problem. Try again."); }
    finally { setLoading(false); }
  }

  return <div className="space-y-3">
    <label htmlFor={id} className="block text-sm font-medium">{ro ? "Probleme recomandate din platformă" : "Recommended platform problems"}</label>
    <div className="flex gap-2"><Input id={id} inputMode="numeric" value={code} placeholder={ro ? "Codul problemei, de exemplu 20" : "Problem code, for example 20"} onChange={event => setCode(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void add(); } }}/><Button type="button" variant="outline" onClick={() => void add()} disabled={loading || !Number.isSafeInteger(Number(code)) || Number(code) <= 0}>{loading ? (ro ? "Se caută…" : "Searching…") : (ro ? "Adaugă" : "Add")}</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {value.map((problem, index) => <div key={problem.href} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2"><Link href={problem.href} className="min-w-0 truncate text-sm underline-offset-4 hover:underline">#{problem.code} {text(problem.title, locale)}</Link><Button type="button" variant="ghost" size="icon-sm" aria-label={`${ro ? "Elimină problema" : "Remove problem"} #${problem.code}`} onClick={() => onChange(value.filter((_, i) => i !== index))}><X className="size-4"/></Button></div>)}
  </div>;
}
