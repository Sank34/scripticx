"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FilePlus2,
  FileText,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  createNote,
  deleteNote,
  listNotes,
  subscribeWorkspaceStorage,
  updateNote,
  type WorkspaceNote,
} from "@/lib/workspace-storage";
import { cn } from "@/lib/utils";

type LibraryFilter = "all" | "favorites";

export function NotesLibrary() {
  const router = useRouter();
  const { locale } = useLanguage();
  const { user } = useAuth();
  const ro = locale === "ro";
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");

  const refresh = useCallback(() => {
    if (user) setNotes(listNotes(user.id));
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;
    return subscribeWorkspaceStorage(user.id, refresh);
  }, [refresh, user]);

  const visibleNotes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return notes.filter((note) => {
      if (filter === "favorites" && !note.favorite) return false;
      if (!normalized) return true;
      return `${note.title}\n${note.content}`.toLocaleLowerCase(locale).includes(normalized);
    });
  }, [filter, locale, notes, query]);

  function addNote() {
    if (!user) return;
    const note = createNote(user.id, {
      title: ro ? "Notiță fără titlu" : "Untitled note",
    });
    router.push(`/workspace/student/notes/${note.id}`);
  }

  function toggleFavorite(note: WorkspaceNote) {
    if (!user) return;
    updateNote(user.id, note.id, { favorite: !note.favorite });
  }

  function removeNote(note: WorkspaceNote) {
    if (!user) return;
    const confirmed = window.confirm(
      ro
        ? `Ștergi definitiv „${note.title}”?`
        : `Permanently delete “${note.title}”?`
    );
    if (!confirmed) return;
    deleteNote(user.id, note.id);
    toast.success(ro ? "Notița a fost ștearsă." : "Note deleted.");
  }

  return (
    <div className="flex min-h-full w-full flex-col bg-background">
      <header className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          {ro ? "Notițe" : "Notes"}
        </h1>
        <Button onClick={addNote} className="h-9">
          <FilePlus2 className="size-4" />
          {ro ? "Pagină nouă" : "New page"}
        </Button>
      </header>

      <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:px-6">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ro ? "Caută în titlu și conținut..." : "Search title and content..."}
            className="h-9 max-w-xl bg-muted/45 pl-9 shadow-none"
          />
        </div>
        <div className="flex self-start rounded-lg bg-muted/60 p-0.5 sm:self-auto">
          {([
            { id: "all", label: ro ? "Toate" : "All" },
            { id: "favorites", label: ro ? "Favorite" : "Favorites" },
          ] as const).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={cn(
                "h-8 rounded-md px-3 text-xs font-medium transition",
                filter === option.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <section className="flex min-h-0 flex-1 flex-col bg-background">
        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(9rem,0.6fr)_6rem] border-b bg-muted/25 px-6 py-2.5 text-xs font-medium text-muted-foreground sm:grid">
          <span>{ro ? "Pagină" : "Page"}</span>
          <span>{ro ? "Ultima editare" : "Last edited"}</span>
          <span className="text-right">{ro ? "Acțiuni" : "Actions"}</span>
        </div>

        {visibleNotes.length ? (
          <div className="divide-y">
            {visibleNotes.map((note) => (
              <div
                key={note.id}
                className="group grid gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(0,1.6fr)_minmax(9rem,0.6fr)_6rem] sm:items-center sm:px-6"
              >
                <Link
                  href={`/workspace/student/notes/${note.id}`}
                  className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">
                    <FileText className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{note.title}</span>
                      {note.favorite ? <Star className="size-3.5 fill-amber-400 text-amber-400" /> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground sm:hidden">
                      {new Date(note.updatedAt).toLocaleString(ro ? "ro-RO" : "en")}
                    </span>
                  </span>
                </Link>

                <span className="hidden text-xs text-muted-foreground sm:block">
                  {new Intl.DateTimeFormat(ro ? "ro-RO" : "en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(note.updatedAt))}
                </span>

                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => toggleFavorite(note)}
                    aria-label={ro ? "Adaugă la favorite" : "Toggle favorite"}
                  >
                    <Star className={cn("size-4", note.favorite && "fill-amber-400 text-amber-400")} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeNote(note)}
                    aria-label={ro ? "Șterge notița" : "Delete note"}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-72 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-muted">
              <FileText className="size-5 text-muted-foreground" />
            </span>
            <h2 className="mt-4 font-semibold">
              {query || filter === "favorites"
                ? ro
                  ? "Nicio notiță găsită"
                  : "No notes found"
                : ro
                  ? "Creează prima notiță"
                  : "Create your first note"}
            </h2>
            {!query && filter === "all" ? (
              <Button onClick={addNote} className="mt-4">
                <FilePlus2 className="size-4" />
                {ro ? "Pagină nouă" : "New page"}
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
