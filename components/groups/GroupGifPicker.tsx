"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GroupGifPicker({ onSelect, onUpload }: { onSelect: (url: string) => void; onUpload: () => void }) {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const [query, setQuery] = useState("");
  const [link, setLink] = useState("");
  const [results, setResults] = useState<{ id: string; url: string; preview: string; title: string }[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError(false);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session");
        const response = await fetch(`/api/groups/gifs?q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal });
        if (!response.ok) throw new Error("Search unavailable");
        const data = await response.json();
        if (!controller.signal.aborted) setResults(data.results);
      } catch { if (!controller.signal.aborted) { setResults([]); setError(true); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  return <div className="space-y-3">
    <Input aria-label={ro ? "Caută GIF-uri" : "Search GIFs"} placeholder={ro ? "Caută pe KLIPY…" : "Search KLIPY…"} value={query} onChange={e => setQuery(e.target.value)} />
    <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
      {loading ? <p role="status" className="col-span-2 py-4 text-sm">{ro ? "Se încarcă…" : "Loading…"}</p> : error ? <p role="status" className="col-span-2 text-sm text-muted-foreground">{ro ? "Căutarea nu este disponibilă. Poți încărca un GIF sau adăuga un link." : "Search is unavailable. Upload a GIF or paste a link."}</p> : results.length ? results.map(gif => <button key={gif.id} type="button" onClick={() => onSelect(gif.url)} className="overflow-hidden rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><img src={gif.preview} alt={gif.title} className="h-28 w-full object-cover" /></button>) : <p className="col-span-2 text-sm">{ro ? "Niciun GIF găsit." : "No GIFs found."}</p>}
    </div>
    <p className="text-xs text-muted-foreground">Powered by KLIPY</p>
    <div className="flex gap-2"><Input aria-label="GIF URL" placeholder="https://…/image.gif" value={link} onChange={e => setLink(e.target.value)} /><Button variant="outline" disabled={!/^https:\/\/\S+$/i.test(link.trim())} onClick={() => onSelect(link.trim())}>{ro ? "Adaugă" : "Add"}</Button></div>
    <Button variant="outline" className="w-full" onClick={onUpload}>{ro ? "Încarcă un GIF" : "Upload a GIF"}</Button>
  </div>;
}
