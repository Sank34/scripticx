"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import RouteGuard from "@/components/RouteGuard";
import { AchievementIcon } from "@/components/achievements/AchievementBadgeCard";
import { BadgeEditorDialog } from "@/components/admin/BadgeEditorDialog";
import { BadgeRecipientsDialog } from "@/components/admin/BadgeRecipientsDialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RARITY_STYLES,
  type BadgeDefinition,
  type BadgeRuleMetric,
  type BadgeTrigger,
} from "@/lib/rewards";
import {
  deleteAdminBadge,
  fetchAdminBadges,
  saveAdminBadge,
} from "@/lib/rewardsData";
import { cn } from "@/lib/utils";

const EMPTY_BADGES: BadgeDefinition[] = [];

function AdminBadgesContent() {
  const { locale } = useLanguage();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [trigger, setTrigger] = useState<"all" | BadgeTrigger>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeDefinition | null>(null);
  const [deleteBadge, setDeleteBadge] = useState<BadgeDefinition | null>(null);
  const [recipientsBadge, setRecipientsBadge] = useState<BadgeDefinition | null>(null);
  const [deleting, setDeleting] = useState(false);

  const badgesQuery = useQuery({
    queryKey: ["admin", "badges"],
    queryFn: fetchAdminBadges,
  });
  const badges = badgesQuery.data || EMPTY_BADGES;

  const copy = locale === "ro"
    ? {
        back: "Înapoi la admin",
        title: "Badge-uri și realizări",
        subtitle:
          "Gestionează badge-urile automate și acordă insigne pentru evenimente sau participare.",
        create: "Badge nou",
        active: "Active",
        eventBadges: "Pentru evenimente",
        recipients: "Badge-uri acordate",
        search: "Caută după nume sau cheie...",
        allTypes: "Toate tipurile",
        types: {
          automatic: "Automat",
          event: "Eveniment",
          manual: "Manual",
        } as Record<BadgeTrigger, string>,
        ruleMetrics: {
          problems_solved: "probleme rezolvate",
          perfect_submissions: "submisii perfecte",
          submissions_sent: "submisii verificate",
          total_score: "puncte totale",
          daily_challenges: "daily challenges",
          competition_participations: "participări la competiții",
          competition_problems_solved: "probleme de concurs",
        } as Record<BadgeRuleMetric, string>,
        empty: "Nu există badge-uri care corespund filtrelor.",
        loadError: "Badge-urile nu au putut fi încărcate. Verifică dacă migrarea Supabase a fost aplicată.",
        retry: "Reîncearcă",
        inactive: "Inactiv",
        people: "elevi",
        award: "Acordă",
        edit: "Editează",
        delete: "Șterge",
        deleteTitle: "Ștergi acest badge?",
        deleteDescription:
          "Definiția și toate acordările asociate vor fi șterse definitiv.",
        cancel: "Anulează",
        confirmDelete: "Șterge badge-ul",
        created: "Badge creat.",
        updated: "Badge actualizat.",
        removed: "Badge șters.",
        deleteFailed: "Badge-ul nu a putut fi șters.",
        duplicate: "Există deja un badge cu această cheie unică.",
      }
    : {
        back: "Back to admin",
        title: "Badges and achievements",
        subtitle:
          "Manage automatic badges and award event or participation achievements.",
        create: "New badge",
        active: "Active",
        eventBadges: "Event badges",
        recipients: "Badges awarded",
        search: "Search by name or key...",
        allTypes: "All types",
        types: {
          automatic: "Automatic",
          event: "Event",
          manual: "Manual",
        } as Record<BadgeTrigger, string>,
        ruleMetrics: {
          problems_solved: "problems solved",
          perfect_submissions: "perfect submissions",
          submissions_sent: "verified submissions",
          total_score: "total points",
          daily_challenges: "daily challenges",
          competition_participations: "competition entries",
          competition_problems_solved: "competition problems",
        } as Record<BadgeRuleMetric, string>,
        empty: "No badges match these filters.",
        loadError: "Badges could not be loaded. Check that the Supabase migration was applied.",
        retry: "Try again",
        inactive: "Inactive",
        people: "students",
        award: "Award",
        edit: "Edit",
        delete: "Delete",
        deleteTitle: "Delete this badge?",
        deleteDescription:
          "The definition and all associated awards will be permanently deleted.",
        cancel: "Cancel",
        confirmDelete: "Delete badge",
        created: "Badge created.",
        updated: "Badge updated.",
        removed: "Badge deleted.",
        deleteFailed: "The badge could not be deleted.",
        duplicate: "A badge with this unique key already exists.",
      };

  const filteredBadges = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return badges.filter((badge) => {
      const matchesTrigger = trigger === "all" || badge.trigger === trigger;
      const matchesQuery = !normalized || `${badge.title} ${badge.key} ${badge.description}`
        .toLocaleLowerCase(locale)
        .includes(normalized);
      return matchesTrigger && matchesQuery;
    });
  }, [badges, locale, query, trigger]);

  const stats = [
    {
      label: copy.active,
      value: badges.filter((badge) => badge.active).length,
      Icon: CheckCircle2,
    },
    {
      label: copy.eventBadges,
      value: badges.filter((badge) => badge.trigger === "event").length,
      Icon: CalendarDays,
    },
    {
      label: copy.recipients,
      value: badges.reduce((sum, badge) => sum + badge.recipients, 0),
      Icon: Users,
    },
  ];

  function openCreate() {
    setEditingBadge(null);
    setEditorOpen(true);
  }

  function openEdit(badge: BadgeDefinition) {
    setEditingBadge(badge);
    setEditorOpen(true);
  }

  async function saveBadge(nextBadge: BadgeDefinition) {
    const duplicate = badges.some(
      (badge) => badge.key === nextBadge.key && badge.id !== nextBadge.id
    );
    if (duplicate) {
      toast.error(copy.duplicate);
      throw new Error("duplicate_badge_key");
    }

    const exists = Boolean(nextBadge.id);
    await saveAdminBadge(nextBadge);
    await queryClient.invalidateQueries({ queryKey: ["admin", "badges"] });
    setEditorOpen(false);
    toast.success(exists ? copy.updated : copy.created);
  }

  async function confirmDelete() {
    if (!deleteBadge || deleting) return;
    setDeleting(true);
    try {
      await deleteAdminBadge(deleteBadge.id);
      await queryClient.invalidateQueries({ queryKey: ["admin", "badges"] });
      setDeleteBadge(null);
      toast.success(copy.removed);
    } catch {
      toast.error(copy.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border bg-zinc-950 p-6 text-white sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-zinc-300 hover:bg-white/10 hover:text-white">
              <Link href="/admin"><ArrowLeft className="size-4" />{copy.back}</Link>
            </Button>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Award className="size-4" />
              Achievement system
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">{copy.subtitle}</p>
          </div>
          <Button onClick={openCreate} className="bg-white text-zinc-950 hover:bg-zinc-200">
            <Plus className="size-4" />
            {copy.create}
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(({ Icon, label, value }) => (
          <Card key={label} className="py-0 shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon className="size-5" />
              </span>
              <div>
                {badgesQuery.isPending ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
                )}
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search}
              className="h-9 pl-9"
            />
          </div>
          <Select value={trigger} onValueChange={(value) => setTrigger(value as "all" | BadgeTrigger)}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.allTypes}</SelectItem>
              {(Object.keys(copy.types) as BadgeTrigger[]).map((value) => (
                <SelectItem key={value} value={value}>{copy.types[value]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {badgesQuery.isPending ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        ) : badgesQuery.isError ? (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed text-center">
            <p className="max-w-md text-sm text-muted-foreground">{copy.loadError}</p>
            <Button variant="outline" className="mt-4" onClick={() => void badgesQuery.refetch()}>
              {copy.retry}
            </Button>
          </div>
        ) : filteredBadges.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredBadges.map((badge) => {
              const styles = RARITY_STYLES[badge.rarity];
              return (
                <Card key={badge.id} className={cn("gap-0 py-0 shadow-none", !badge.active && "opacity-65")}>
                  <CardContent className="flex h-full flex-col gap-4 p-4">
                    <div className="flex items-start gap-3">
                      <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", styles.glow)}>
                        <AchievementIcon iconName={badge.iconName} iconUrl={badge.iconUrl} className="size-6" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold">{badge.title}</h2>
                          <Badge variant="outline" className={cn("capitalize", styles.badge)}>{badge.rarity}</Badge>
                          {!badge.active && <Badge variant="secondary">{copy.inactive}</Badge>}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {badge.description}
                        </p>
                        <code className="mt-2 inline-block rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          {badge.key}
                        </code>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="size-3.5" />{badge.recipients} {copy.people}</span>
                        <Badge variant="secondary">{copy.types[badge.trigger]}</Badge>
                        {badge.trigger === "automatic" && badge.automaticRule && (
                          <span>
                            {badge.automaticRule.threshold} {copy.ruleMetrics[badge.automaticRule.metric]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => setRecipientsBadge(badge)}>
                          <Award className="size-3.5" />{copy.award}
                        </Button>
                        <Button variant="ghost" size="icon-sm" title={copy.edit} onClick={() => openEdit(badge)}>
                          <Edit3 className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title={copy.delete} className="text-destructive" onClick={() => setDeleteBadge(badge)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 text-center">
            <Award className="size-9 text-muted-foreground/50" />
            <p className="mt-3 font-medium">{copy.empty}</p>
          </div>
        )}
      </section>

      <BadgeEditorDialog
        open={editorOpen}
        badge={editingBadge}
        locale={locale}
        onOpenChange={setEditorOpen}
        onSave={saveBadge}
      />

      <BadgeRecipientsDialog
        badge={recipientsBadge}
        locale={locale}
        open={Boolean(recipientsBadge)}
        onOpenChange={(open) => !open && setRecipientsBadge(null)}
      />

      <AlertDialog open={Boolean(deleteBadge)} onOpenChange={(open) => !open && setDeleteBadge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? "..." : copy.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminBadgesPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminBadgesContent />
    </RouteGuard>
  );
}
