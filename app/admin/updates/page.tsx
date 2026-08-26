"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CircleCheckBig,
  ExternalLink,
  FileText,
  Languages,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { UpdateForm } from "@/components/admin/UpdateForm";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { useLanguage } from "@/components/LanguageProvider";
import RouteGuard from "@/components/RouteGuard";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocalized } from "@/lib/getLocalized";
import { supabase } from "@/lib/supabase";
import { fetchUpdates, type UpdateEntry } from "@/lib/updates";

type PublicationStatus = "all" | "published" | "scheduled";

function plainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_~\-|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPublicationDate(date: string, locale: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function AdminUpdatesContent() {
  const queryClient = useQueryClient();
  const { locale, t } = useLanguage();
  const ro = locale === "ro";
  const copy = ro
    ? {
        allStatuses: "Toate stările",
        allTags: "Toate etichetele",
        clearFilters: "Resetează filtrele",
        deleteError: "Noutatea nu a putut fi ștearsă.",
        library: "Biblioteca de noutăți",
        libraryDescription: "Caută, verifică și editează articolele publicate în changelog.",
        loadingError: "Noutățile nu au putut fi încărcate.",
        noResults: "Nicio noutate nu corespunde filtrelor selectate.",
        openPublic: "Deschide pagina publică",
        published: "Publicat",
        publishedCount: "Publicate",
        retry: "Încearcă din nou",
        scheduled: "Programat",
        scheduledCount: "Programate",
        search: "Caută după titlu, adresă sau conținut…",
        thisMonth: "Luna aceasta",
        total: "Total noutăți",
        translations: "traduceri",
      }
    : {
        allStatuses: "All statuses",
        allTags: "All tags",
        clearFilters: "Clear filters",
        deleteError: "The update could not be deleted.",
        library: "Update library",
        libraryDescription: "Search, review, and edit every article published in the changelog.",
        loadingError: "Updates could not be loaded.",
        noResults: "No updates match the selected filters.",
        openPublic: "Open public page",
        published: "Published",
        publishedCount: "Published",
        retry: "Try again",
        scheduled: "Scheduled",
        scheduledCount: "Scheduled",
        search: "Search by title, URL, or content…",
        thisMonth: "This month",
        total: "Total updates",
        translations: "translations",
      };

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UpdateEntry | null>(null);
  const [deleting, setDeleting] = useState<UpdateEntry | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<PublicationStatus>("all");
  const updatesQueryKey = ["admin", "updates"] as const;

  const updatesQuery = useQuery({
    queryKey: updatesQueryKey,
    queryFn: () => fetchUpdates({ includeScheduled: true }),
    staleTime: 2 * 60 * 1000,
  });
  const updates = useMemo(() => updatesQuery.data || [], [updatesQuery.data]);
  const today = new Date().toISOString().slice(0, 10);
  const monthKey = today.slice(0, 7);

  const searchNeedle = search.trim().toLocaleLowerCase(locale);
  const filteredUpdates = updates.filter((update) => {
    const title = getLocalized(update.title_i18n, locale);
    const content = getLocalized(update.content_i18n, locale);
    const matchesSearch = !searchNeedle
      || `${title} ${update.slug} ${content}`.toLocaleLowerCase(locale).includes(searchNeedle);
    const matchesTag = tagFilter === "all" || update.tag === tagFilter;
    const isScheduled = update.date > today;
    const matchesStatus = statusFilter === "all"
      || (statusFilter === "scheduled" ? isScheduled : !isScheduled);
    return matchesSearch && matchesTag && matchesStatus;
  });

  const stats = [
    { icon: FileText, label: copy.total, value: updates.length },
    { icon: CircleCheckBig, label: copy.publishedCount, value: updates.filter((update) => update.date <= today).length },
    { icon: CalendarClock, label: copy.scheduledCount, value: updates.filter((update) => update.date > today).length },
    { icon: Languages, label: copy.thisMonth, value: updates.filter((update) => update.date.startsWith(monthKey)).length },
  ];

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(update: UpdateEntry) {
    setEditing(update);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  async function confirmDelete() {
    if (!deleting?.id) return;
    const { error } = await supabase.from("updates").delete().eq("id", deleting.id);
    if (error) {
      toast.error(copy.deleteError);
      return;
    }
    queryClient.setQueryData<UpdateEntry[]>(updatesQueryKey, (current) =>
      current?.filter((update) => update.id !== deleting.id) || []
    );
    void queryClient.invalidateQueries({ queryKey: ["updates"] });
    setDeleting(null);
    toast.success(t("admin.updates.toast.deleted"));
  }

  const filtersActive = Boolean(search || tagFilter !== "all" || statusFilter !== "all");

  return (
    <main className="sx-page space-y-8 pb-16">
      <PageHeader
        title={t("admin.updates.page.title")}
        subtitle={t("admin.updates.page.subtitle")}
        meta={<Badge variant="secondary">{updates.length}</Badge>}
        action={(
          <Button onClick={openCreate}>
            <Plus />
            {t("admin.updates.actions.new")}
          </Button>
        )}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="sx-surface flex items-center gap-4 p-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-[var(--sx-radius-control)] bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              <p className="truncate text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="sx-surface overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">{copy.library}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.libraryDescription}</p>
        </div>
        <div className="grid gap-3 border-b bg-muted/20 p-4 md:grid-cols-[minmax(240px,1fr)_180px_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} className="pl-9" />
          </label>
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.allTags}</SelectItem>
              <SelectItem value="new">{t("admin.updates.form.tags.new")}</SelectItem>
              <SelectItem value="fix">{t("admin.updates.form.tags.fix")}</SelectItem>
              <SelectItem value="improved">{t("admin.updates.form.tags.improved")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PublicationStatus)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.allStatuses}</SelectItem>
              <SelectItem value="published">{copy.published}</SelectItem>
              <SelectItem value="scheduled">{copy.scheduled}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {updatesQuery.isPending ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full" />)}
          </div>
        ) : updatesQuery.isError ? (
          <EmptyState
            className="px-5 py-16"
            icon={<FileText className="size-6" />}
            title={copy.loadingError}
            action={<Button variant="outline" onClick={() => void updatesQuery.refetch()}>{copy.retry}</Button>}
          />
        ) : filteredUpdates.length === 0 ? (
          <EmptyState
            className="px-5 py-16"
            icon={<FileText className="size-6" />}
            title={updates.length ? copy.noResults : t("admin.updates.empty.title")}
            description={updates.length ? copy.search : t("admin.updates.empty.subtitle")}
            action={filtersActive
              ? <Button variant="outline" onClick={() => { setSearch(""); setTagFilter("all"); setStatusFilter("all"); }}>{copy.clearFilters}</Button>
              : <Button onClick={openCreate}><Plus />{t("admin.updates.actions.new")}</Button>}
          />
        ) : (
          <div className="divide-y">
            {filteredUpdates.map((update) => {
              const title = getLocalized(update.title_i18n, locale);
              const content = getLocalized(update.content_i18n, locale);
              const excerpt = plainText(content);
              const translations = new Set([
                ...Object.keys(update.title_i18n || {}),
                ...Object.keys(update.content_i18n || {}),
              ]).size;
              const scheduled = update.date > today;
              return (
                <article key={update.id || update.slug} className="grid gap-4 px-5 py-4 transition-colors hover:bg-muted/25 lg:grid-cols-[minmax(0,1fr)_170px_150px_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {update.tag && <Badge variant="outline">{t(`admin.updates.form.tags.${update.tag}`)}</Badge>}
                      <h3 className="truncate font-semibold">{title || update.slug}</h3>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{excerpt || `updates/${update.slug}`}</p>
                    <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">/updates/{update.slug}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground lg:block">
                    <span>{formatPublicationDate(update.date, locale)}</span>
                    <Badge variant={scheduled ? "secondary" : "outline"} className="lg:mt-1 lg:flex">
                      {scheduled ? copy.scheduled : copy.published}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Languages className="size-4" />
                    <span>{translations} {copy.translations}</span>
                  </div>
                  <div className="flex items-center gap-1 lg:justify-end">
                    <Button asChild variant="ghost" size="icon-sm" aria-label={copy.openPublic}>
                      <Link href={`/updates/${update.slug}`} target="_blank" rel="noreferrer"><ExternalLink /></Link>
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(update)} aria-label={t("admin.updates.dialog.editTitle")}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(update)} aria-label={t("admin.updates.deleteDialog.confirm")}>
                      <Trash2 />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}>
        <DialogContent className="note-scrollbar flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-none flex-col gap-0 overflow-y-auto p-0 sm:max-w-[1400px]">
          <DialogHeader className="sr-only">
            <DialogTitle>{editing ? t("admin.updates.dialog.editTitle") : t("admin.updates.dialog.createTitle")}</DialogTitle>
            <DialogDescription>{t("admin.updates.page.subtitle")}</DialogDescription>
          </DialogHeader>
          <UpdateForm
            key={editing?.id || "new-update"}
            initialData={editing}
            onCancel={closeForm}
            onSaved={() => {
              closeForm();
              void queryClient.invalidateQueries({ queryKey: updatesQueryKey });
              void queryClient.invalidateQueries({ queryKey: ["updates"] });
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.updates.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.updates.deleteDialog.description").replace(
                "{title}",
                deleting ? getLocalized(deleting.title_i18n, locale) : ""
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.updates.deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("admin.updates.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

export default function AdminUpdatesPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminUpdatesContent />
    </RouteGuard>
  );
}
