"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CircleCheck,
  FileText,
  GitBranch,
  Inbox,
  Mail,
  Megaphone,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";

import RouteGuard from "@/components/RouteGuard";
import { useLanguage } from "@/components/LanguageProvider";
import { AdminNavCard } from "@/components/admin/AdminNavCard";
import { AdminPanelSection } from "@/components/admin/AdminPanelSection";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  buildActivityFeed,
  buildAttentionItems,
  type ActivityItem,
  type AttentionItem,
  type AttentionItemId,
  type CountResult,
} from "@/lib/adminOverview";
import { fetchAdminCounts, fetchAdminOverview } from "@/lib/adminOverviewData";
import { cn } from "@/lib/utils";

const ATTENTION_ICON: Record<AttentionItemId, typeof Mail> = {
  bannedUsers: Users,
  noDailyToday: CalendarDays,
  noDailyUpcoming: CalendarDays,
  noProblems: FileText,
  staleChangelog: Megaphone,
  unresolvedMessages: Mail,
};

const ACTIVITY_ICON = {
  daily: { className: "text-orange-500", Icon: CalendarDays },
  message: { className: "text-rose-500", Icon: Mail },
  update: { className: "text-amber-500", Icon: Megaphone },
} as const;

function positive(count: CountResult | undefined): number | null {
  return typeof count === "number" && count > 0 ? count : null;
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const { t } = useLanguage();
  const Icon = ATTENTION_ICON[item.id];
  const base = `admin.overview.attention.items.${item.id}`;
  const title =
    item.count === undefined
      ? t(`${base}.title`)
      : t(`${base}.title`).replace("{count}", String(item.count));

  return (
    <Link
      href={item.href}
      className="flex items-start gap-3 border-b border-border pb-3 transition last:border-b-0 last:pb-0 hover:opacity-80"
    >
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          item.severity === "warn"
            ? "bg-amber-100 text-amber-700"
            : "bg-blue-100 text-blue-700"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{t(`${base}.description`)}</p>
      </div>

      <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const { locale, t } = useLanguage();
  const { className, Icon } = ACTIVITY_ICON[item.kind];

  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 border-b border-border pb-3 transition last:border-b-0 last:pb-0 hover:opacity-80"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className={cn("h-3.5 w-3.5", className)} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          <span className="truncate">{item.primary}</span>
          {item.isNew && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {t(`admin.overview.activity.types.${item.kind}`)}
          {item.secondary ? ` · ${item.secondary}` : ""}
        </p>
      </div>

      <span className="shrink-0 text-xs text-muted-foreground">
        {new Date(item.at).toLocaleDateString(locale === "ro" ? "ro-RO" : "en-US")}
      </span>
    </Link>
  );
}

function AdminContent() {
  const { locale, t } = useLanguage();

  const countsQuery = useQuery({
    queryKey: ["admin", "counts"],
    queryFn: fetchAdminCounts,
  });

  const overviewQuery = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: fetchAdminOverview,
  });

  const counts = countsQuery.data;
  const overview = overviewQuery.data;

  const attentionItems = useMemo(
    () => buildAttentionItems(counts, overview, new Date()),
    [counts, overview]
  );

  const activityItems = useMemo(
    () => buildActivityFeed(overview, locale),
    [overview, locale]
  );

  const isFetching = countsQuery.isFetching || overviewQuery.isFetching;
  const bannedCount = positive(counts?.bannedUsers);
  const newMessageCount = positive(counts?.contactNew);

  function refreshAll() {
    void countsQuery.refetch();
    void overviewQuery.refetch();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.title")}
        subtitle={t("admin.overview.subtitle")}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            {t("admin.overview.actions.refresh")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminNavCard
          href="/admin/problems"
          icon={<FileText className="h-5 w-5 text-blue-500" />}
          ringClassName="ring-blue-500/30"
          title={t("admin.problems.title")}
          description={t("admin.problems.description")}
          count={counts?.problems}
        />

        <AdminNavCard
          href="/admin/users"
          icon={<Users className="h-5 w-5 text-emerald-500" />}
          ringClassName="ring-emerald-500/30"
          title={t("admin.users.title")}
          description={t("admin.users.description")}
          count={counts?.users}
          accentBadge={
            bannedCount
              ? {
                  className: "bg-red-100 text-red-700",
                  label: t("admin.overview.badges.banned").replace(
                    "{count}",
                    String(bannedCount)
                  ),
                }
              : null
          }
        />

        <AdminNavCard
          href="/admin/updates"
          icon={<Sparkles className="h-5 w-5 text-amber-500" />}
          ringClassName="ring-amber-500/30"
          title={t("admin.updates.title")}
          description={t("admin.updates.description")}
          count={counts?.updates}
        />

        <AdminNavCard
          href="/admin/contact"
          icon={<Mail className="h-5 w-5 text-rose-500" />}
          ringClassName="ring-rose-500/30"
          title={t("admin.contact.cardTitle")}
          description={t("admin.contact.cardDescription")}
          count={counts?.contactTotal}
          accentBadge={
            newMessageCount
              ? {
                  className: "bg-rose-500 text-white",
                  label: t("admin.overview.badges.new").replace(
                    "{count}",
                    String(newMessageCount)
                  ),
                }
              : null
          }
        />

        <AdminNavCard
          href="/admin/lessons"
          icon={<GitBranch className="h-5 w-5 text-violet-500" />}
          ringClassName="ring-violet-500/30"
          title={locale === "ro" ? "Configurator lecții" : "Lesson configurator"}
          description={
            locale === "ro"
              ? "Editează roadmap-ul, nodurile și quiz-urile lecțiilor."
              : "Edit the roadmap, lesson nodes, and quizzes."
          }
          count={null}
          accentBadge={{
            className: "bg-violet-100 text-violet-700",
            label: locale === "ro" ? "Frontend" : "Frontend",
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminPanelSection
          icon={<TriangleAlert className="h-4 w-4 text-amber-500" />}
          title={t("admin.overview.attention.title")}
          isLoading={countsQuery.isPending || overviewQuery.isPending}
          isError={countsQuery.isError && overviewQuery.isError}
          onRetry={refreshAll}
          action={
            attentionItems.length > 0 ? (
              <Badge variant="secondary">{attentionItems.length}</Badge>
            ) : null
          }
        >
          {attentionItems.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={<CircleCheck className="h-8 w-8 text-emerald-500" />}
              title={t("admin.overview.attention.empty.title")}
              description={t("admin.overview.attention.empty.description")}
            />
          ) : (
            attentionItems.map((item) => <AttentionRow key={item.id} item={item} />)
          )}
        </AdminPanelSection>

        <AdminPanelSection
          icon={<Activity className="h-4 w-4 text-orange-500" />}
          title={t("admin.overview.activity.title")}
          isLoading={overviewQuery.isPending}
          isError={overviewQuery.isError}
          onRetry={() => void overviewQuery.refetch()}
        >
          {activityItems.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={<Inbox className="h-8 w-8" />}
              title={t("admin.overview.activity.empty.title")}
              description={t("admin.overview.activity.empty.description")}
            />
          ) : (
            activityItems.map((item) => <ActivityRow key={item.id} item={item} />)
          )}
        </AdminPanelSection>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminContent />
    </RouteGuard>
  );
}
