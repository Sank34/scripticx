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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { synchronizeStudentWorkspace } from "@/lib/workspace-cloud";
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
  const [noteToDelete, setNoteToDelete] = useState<WorkspaceNote | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const refresh = useCallback(() => {
    if (user) setNotes(listNotes(user.id));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setInitialLoading(false);
      return;
    }
    let active = true;
    const cachedNotes = listNotes(user.id);
    setNotes(cachedNotes);
    // Existing notes are useful immediately. An empty cache waits for the
    // first cloud read so we never flash a false empty/demo state.
    setInitialLoading(cachedNotes.length === 0);
    const unsubscribe = subscribeWorkspaceStorage(user.id, refresh);
    void synchronizeStudentWorkspace(user.id)
      .then(() => {
        if (!active) return;
        refresh();
        setInitialLoading(false);
      })
      .catch(() => {
        if (!active) return;
        refresh();
        setInitialLoading(false);
      });
    return () => {
      active = false;
      unsubscribe();
    };
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
    setNoteToDelete(note);
  }

  function confirmNoteDeletion() {
    const note = noteToDelete;
    if (!user) return;
    if (!note) return;
    try {
      if (!deleteNote(user.id, note.id)) {
        throw new Error(ro ? "Notița nu mai există." : "The note no longer exists.");
      }
      setNoteToDelete(null);
      toast.success(ro ? "Notița a fost ștearsă." : "Note deleted.");
    } catch (error) {
      toast.error(ro ? "Notița nu a putut fi ștearsă." : "Could not delete the note.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <div className="flex min-h-full w-full flex-col bg-background">
      <header className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h1 className="text-2xl font-semibold sm:text-3xl">
          {ro ? "Notițe" : "Notes"}
        </h1>
        <Button className="h-9" disabled={initialLoading} onClick={addNote}>
          <FilePlus2 className="size-4" />
          {ro ? "Pagină nouă" : "New page"}
        </Button>
      </header>

      <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:px-6">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            disabled={initialLoading}
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

      <section
        aria-busy={initialLoading}
        className="flex min-h-0 flex-1 flex-col bg-background"
      >
        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(9rem,0.6fr)_6rem] border-b bg-muted/25 px-6 py-2.5 text-xs font-medium text-muted-foreground sm:grid">
          <span>{ro ? "Pagină" : "Page"}</span>
          <span>{ro ? "Ultima editare" : "Last edited"}</span>
          <span className="text-right">{ro ? "Acțiuni" : "Actions"}</span>
        </div>

        {initialLoading ? (
          <div
            aria-label={ro ? "Se încarcă notițele" : "Loading notes"}
            className="divide-y"
            role="status"
          >
            {Array.from({ length: 5 }, (_, index) => (
              <div
                className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1.6fr)_minmax(9rem,0.6fr)_6rem] sm:items-center sm:px-6"
                key={index}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-[min(19rem,70%)]" />
                    <Skeleton className="h-3 w-[min(13rem,48%)] sm:hidden" />
                  </div>
                </div>
                <Skeleton className="hidden h-3 w-28 sm:block" />
                <div className="hidden justify-end gap-2 sm:flex">
                  <Skeleton className="size-8 rounded-md" />
                  <Skeleton className="size-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleNotes.length ? (
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

      <AlertDialog
        open={Boolean(noteToDelete)}
        onOpenChange={(open) => {
          if (!open) setNoteToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {ro ? "Ștergi această notiță?" : "Delete this note?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {ro
                ? `„${noteToDelete?.title || ""}” va fi ștearsă din workspace și de pe celelalte dispozitive. Acțiunea nu poate fi anulată.`
                : `“${noteToDelete?.title || ""}” will be removed from your workspace and other devices. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ro ? "Anulează" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmNoteDeletion}>
              <Trash2 />
              {ro ? "Șterge notița" : "Delete note"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
