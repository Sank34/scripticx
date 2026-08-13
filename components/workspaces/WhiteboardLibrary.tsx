"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Check,
  ChevronDown,
  Clock3,
  LoaderCircle,
  PanelLeft,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
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
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import {
  createWhiteboard,
  deleteWhiteboard,
  getActiveWhiteboardId,
  listWhiteboards,
  setActiveWhiteboardId,
  subscribeWorkspaceStorage,
  updateWhiteboard,
  type WorkspaceWhiteboardDocument,
} from "@/lib/workspace-storage";
import { cn } from "@/lib/utils";

const WHITEBOARD_ROUTE = "/workspace/student/whiteboard";

const copy = {
  en: {
    active: "Open",
    cancel: "Cancel",
    count: (count: number) => `${count} ${count === 1 ? "board" : "boards"}`,
    create: "New whiteboard",
    delete: "Delete",
    deleteDescription: (title: string) =>
      `“${title}” will be permanently removed from this browser. This cannot be undone.`,
    deleteError: "The whiteboard could not be deleted.",
    deleteSuccess: "Whiteboard deleted.",
    deleteTitle: "Delete this whiteboard?",
    empty: "Create a whiteboard for sketches, diagrams and visual notes.",
    emptySearch: "No whiteboards match this search.",
    error: "The whiteboard library could not be loaded.",
    lastEdited: "Last edited",
    library: "Whiteboards",
    loading: "Opening your whiteboards…",
    rename: "Rename",
    renameError: "The whiteboard could not be renamed.",
    save: "Save name",
    search: "Search whiteboards…",
    untitled: "Untitled whiteboard",
  },
  ro: {
    active: "Deschis",
    cancel: "Renunță",
    count: (count: number) =>
      `${count} ${count === 1 ? "whiteboard" : "whiteboard-uri"}`,
    create: "Whiteboard nou",
    delete: "Șterge",
    deleteDescription: (title: string) =>
      `„${title}” va fi șters definitiv din acest browser. Acțiunea nu poate fi anulată.`,
    deleteError: "Whiteboard-ul nu a putut fi șters.",
    deleteSuccess: "Whiteboard șters.",
    deleteTitle: "Ștergi acest whiteboard?",
    empty: "Creează un whiteboard pentru schițe, diagrame și notițe vizuale.",
    emptySearch: "Niciun whiteboard nu corespunde căutării.",
    error: "Biblioteca de whiteboard-uri nu a putut fi încărcată.",
    lastEdited: "Editat",
    library: "Whiteboard-uri",
    loading: "Deschidem whiteboard-urile…",
    rename: "Redenumește",
    renameError: "Whiteboard-ul nu a putut fi redenumit.",
    save: "Salvează numele",
    search: "Caută whiteboard-uri…",
    untitled: "Whiteboard fără titlu",
  },
} as const;

export type WhiteboardLibraryProps = {
  activeWhiteboardId?: string | null;
  className?: string;
  onNavigate?: (whiteboardId: string) => void;
  variant?: "panel" | "popover";
};

export type WhiteboardLibraryTriggerProps = Omit<
  WhiteboardLibraryProps,
  "variant"
>;

function whiteboardHref(id: string) {
  return `${WHITEBOARD_ROUTE}/${encodeURIComponent(id)}`;
}

function formatLastEdited(value: string, language: "en" | "ro") {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "—";

  const elapsedSeconds = Math.round((timestamp - Date.now()) / 1_000);
  const absoluteSeconds = Math.abs(elapsedSeconds);
  const formatter = new Intl.RelativeTimeFormat(language === "ro" ? "ro-RO" : "en", {
    numeric: "auto",
  });

  if (absoluteSeconds < 60) return formatter.format(elapsedSeconds, "second");
  if (absoluteSeconds < 3_600) {
    return formatter.format(Math.round(elapsedSeconds / 60), "minute");
  }
  if (absoluteSeconds < 86_400) {
    return formatter.format(Math.round(elapsedSeconds / 3_600), "hour");
  }
  if (absoluteSeconds < 604_800) {
    return formatter.format(Math.round(elapsedSeconds / 86_400), "day");
  }

  return new Intl.DateTimeFormat(language === "ro" ? "ro-RO" : "en", {
    dateStyle: "medium",
  }).format(new Date(timestamp));
}

type LibraryBodyProps = {
  activeId: string | null;
  documents: WorkspaceWhiteboardDocument[];
  language: "en" | "ro";
  onCreate: () => void;
  onDelete: (document: WorkspaceWhiteboardDocument) => void;
  onNavigate: (id: string) => boolean;
  onRename: (document: WorkspaceWhiteboardDocument, title: string) => void;
  query: string;
  setQuery: (query: string) => void;
  variant: "panel" | "popover";
};

function LibraryBody({
  activeId,
  documents,
  language,
  onCreate,
  onDelete,
  onNavigate,
  onRename,
  query,
  setQuery,
  variant,
}: LibraryBodyProps) {
  const c = copy[language];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase(language);
  const visibleDocuments = useMemo(
    () =>
      documents.filter((document) =>
        normalizedQuery
          ? document.title.toLocaleLowerCase(language).includes(normalizedQuery)
          : true
      ),
    [documents, language, normalizedQuery]
  );

  function beginRename(document: WorkspaceWhiteboardDocument) {
    setEditingId(document.id);
    setDraftTitle(document.title);
  }

  function submitRename(
    event: FormEvent<HTMLFormElement>,
    document: WorkspaceWhiteboardDocument
  ) {
    event.preventDefault();
    const title = draftTitle.trim();
    if (title && title !== document.title) onRename(document, title);
    setEditingId(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b",
          variant === "panel" ? "px-4 py-3 sm:px-5" : "px-3 py-2.5"
        )}
      >
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{c.library}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {c.count(documents.length)}
          </p>
        </div>
        <Button type="button" size="sm" onClick={onCreate}>
          <Plus />
          {c.create}
        </Button>
      </div>

      <div className={cn("border-b", variant === "panel" ? "p-3 sm:px-5" : "p-2.5")}>
        <label className="relative block">
          <span className="sr-only">{c.search}</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={c.search}
            className="h-8 bg-muted/45 pl-8 pr-8 shadow-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={c.cancel}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </label>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]",
          variant === "popover" ? "max-h-[min(25rem,60vh)]" : "sm:p-3"
        )}
      >
        {visibleDocuments.length ? (
          <div className="space-y-1" role="list">
            {visibleDocuments.map((document) => {
              const active = document.id === activeId;
              const editing = document.id === editingId;

              return (
                <div
                  key={document.id}
                  role="listitem"
                  className={cn(
                    "group relative flex items-center gap-1 rounded-xl border border-transparent p-1 transition-colors",
                    active
                      ? "border-sky-500/20 bg-sky-500/9"
                      : "hover:bg-muted/65"
                  )}
                >
                  {editing ? (
                    <form
                      onSubmit={(event) => submitRename(event, document)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 p-1"
                    >
                      <Input
                        autoFocus
                        value={draftTitle}
                        maxLength={160}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") setEditingId(null);
                        }}
                        className="h-8 min-w-0 bg-background"
                        aria-label={c.rename}
                      />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={c.save}
                      >
                        <Check />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditingId(null)}
                        aria-label={c.cancel}
                      >
                        <X />
                      </Button>
                    </form>
                  ) : (
                    <>
                      <Link
                        href={whiteboardHref(document.id)}
                        onClick={(event) => {
                          if (!onNavigate(document.id)) event.preventDefault();
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-xs",
                            active && "border-sky-500/25 text-sky-600 dark:text-sky-400"
                          )}
                        >
                          <PanelLeft className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {document.title || c.untitled}
                            </span>
                            {active ? (
                              <span className="shrink-0 rounded-full bg-sky-500/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                                {c.active}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock3 className="size-2.5" />
                            <span>{c.lastEdited}</span>
                            <span>·</span>
                            <time dateTime={document.updatedAt}>
                              {formatLastEdited(document.updatedAt, language)}
                            </time>
                          </span>
                        </span>
                      </Link>
                      <div className="flex shrink-0 items-center opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => beginRename(document)}
                          aria-label={`${c.rename}: ${document.title}`}
                          title={c.rename}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(document)}
                          aria-label={`${c.delete}: ${document.title}`}
                          title={c.delete}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-44 flex-col items-center justify-center px-5 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <PanelLeft className="size-4.5" />
            </span>
            <p className="mt-3 max-w-64 text-xs leading-5 text-muted-foreground">
              {query ? c.emptySearch : c.empty}
            </p>
            {!query ? (
              <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onCreate}>
                <Plus />
                {c.create}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function WhiteboardLibrary({
  activeWhiteboardId,
  className,
  onNavigate,
  variant = "panel",
}: WhiteboardLibraryProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useLanguage();
  const { user } = useAuth();
  const language = locale === "ro" ? "ro" : "en";
  const c = copy[language];
  const [documents, setDocuments] = useState<WorkspaceWhiteboardDocument[]>([]);
  const [storedActiveId, setStoredActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<WorkspaceWhiteboardDocument | null>(null);

  const effectiveActiveId =
    activeWhiteboardId === undefined ? storedActiveId : activeWhiteboardId;
  const activeDocument = documents.find(
    (document) => document.id === effectiveActiveId
  );

  const refresh = useCallback(() => {
    if (!user) {
      setDocuments([]);
      setStoredActiveId(null);
      return;
    }

    try {
      setDocuments(listWhiteboards(user.id));
      setStoredActiveId(getActiveWhiteboardId(user.id));
    } catch (error) {
      toast.error(c.error, {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }, [c.error, user]);

  useEffect(() => {
    refresh();
    if (!user) return;
    return subscribeWorkspaceStorage(user.id, refresh);
  }, [refresh, user]);

  function navigateTo(id: string) {
    if (!user) return false;
    try {
      setActiveWhiteboardId(user.id, id);
      setStoredActiveId(id);
      setOpen(false);
      onNavigate?.(id);
      return true;
    } catch (error) {
      toast.error(c.error, {
        description: error instanceof Error ? error.message : undefined,
      });
      return false;
    }
  }

  function addWhiteboard() {
    if (!user) return;
    try {
      const document = createWhiteboard(user.id, { title: c.untitled });
      setActiveWhiteboardId(user.id, document.id);
      setStoredActiveId(document.id);
      setOpen(false);
      onNavigate?.(document.id);
      router.push(whiteboardHref(document.id));
    } catch (error) {
      toast.error(c.error, {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  function renameWhiteboard(
    document: WorkspaceWhiteboardDocument,
    title: string
  ) {
    if (!user) return;
    try {
      updateWhiteboard(user.id, document.id, { title });
      refresh();
    } catch (error) {
      toast.error(c.renameError, {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  function removeWhiteboard() {
    if (!user || !deleteTarget) return;

    const deletedId = deleteTarget.id;
    try {
      deleteWhiteboard(user.id, deletedId);
      const remaining = listWhiteboards(user.id);
      let nextActiveId: string | null = getActiveWhiteboardId(user.id);

      if (nextActiveId && !remaining.some((document) => document.id === nextActiveId)) {
        nextActiveId = null;
      }
      if (!nextActiveId && remaining[0]) {
        nextActiveId = remaining[0].id;
        setActiveWhiteboardId(user.id, nextActiveId);
      }

      setDeleteTarget(null);
      setDocuments(remaining);
      setStoredActiveId(nextActiveId);
      toast.success(c.deleteSuccess);

      const deletingOpenDocument = pathname === whiteboardHref(deletedId);
      if (deletingOpenDocument) {
        setOpen(false);
        if (nextActiveId) {
          onNavigate?.(nextActiveId);
          router.replace(whiteboardHref(nextActiveId));
        } else {
          router.replace(WHITEBOARD_ROUTE);
        }
      }
    } catch (error) {
      toast.error(c.deleteError, {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const body = (
    <LibraryBody
      activeId={effectiveActiveId ?? null}
      documents={documents}
      language={language}
      onCreate={addWhiteboard}
      onDelete={setDeleteTarget}
      onNavigate={navigateTo}
      onRename={renameWhiteboard}
      query={query}
      setQuery={setQuery}
      variant={variant}
    />
  );

  return (
    <>
      {variant === "popover" ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn("min-w-0 justify-start gap-2", className)}
              aria-label={c.library}
            >
              <PanelLeft className="shrink-0 text-sky-600 dark:text-sky-400" />
              <span className="max-w-44 truncate">
                {activeDocument?.title || c.library}
              </span>
              <ChevronDown className="ml-auto shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={8}
            className="z-[80] w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl p-0"
          >
            {body}
          </PopoverContent>
        </Popover>
      ) : (
        <section
          aria-label={c.library}
          className={cn(
            "flex h-full min-h-0 w-full flex-col overflow-hidden border-r bg-card/75",
            className
          )}
        >
          {body}
        </section>
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{c.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? c.deleteDescription(deleteTarget.title) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{c.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={removeWhiteboard}>
              <Trash2 />
              {c.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function WhiteboardLibraryTrigger(
  props: WhiteboardLibraryTriggerProps
) {
  return <WhiteboardLibrary {...props} variant="popover" />;
}

export function WhiteboardRouteEntry() {
  const router = useRouter();
  const { locale } = useLanguage();
  const { loading, user } = useAuth();
  const language = locale === "ro" ? "ro" : "en";
  const c = copy[language];

  useEffect(() => {
    if (loading || !user) return;

    try {
      const documents = listWhiteboards(user.id);
      const storedActiveId = getActiveWhiteboardId(user.id);
      const activeDocument = documents.find(
        (document) => document.id === storedActiveId
      );
      const document =
        activeDocument ??
        documents[0] ??
        createWhiteboard(user.id, { title: c.untitled });

      setActiveWhiteboardId(user.id, document.id);
      router.replace(whiteboardHref(document.id));
    } catch (error) {
      toast.error(c.error, {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }, [c.error, c.untitled, loading, router, user]);

  return (
    <div
      className="flex h-full min-h-64 w-full items-center justify-center bg-background"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <LoaderCircle className="size-4 animate-spin text-sky-600" />
        {c.loading}
      </div>
    </div>
  );
}
