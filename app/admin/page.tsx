"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Award,
  BarChart3,
  CalendarDays,
  CircleCheck,
  FileText,
  GitBranch,
  GraduationCap,
  Inbox,
  Languages,
  Mail,
  Mails,
  Megaphone,
  Palette,
  RefreshCw,
  Send,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";

import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { ActivityChart } from "@/components/admin/ActivityChart";
import { AdminHeroBanner } from "@/components/admin/AdminHeroBanner";
import { AdminNavCard } from "@/components/admin/AdminNavCard";
import { AdminPanelSection } from "@/components/admin/AdminPanelSection";
import { AdminStatTile } from "@/components/admin/AdminStatTile";
import { ProblemPopularityChart } from "@/components/admin/ProblemPopularityChart";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  ANALYTICS_RANGES,
  buildActivitySeries,
  buildPopularityData,
  formatDay,
  hasActivity,
  summarizeActivity,
  type AnalyticsRange,
} from "@/lib/adminAnalytics";
import { fetchAdminAnalytics } from "@/lib/adminAnalyticsData";
import {
  buildActivityFeed,
  type ActivityItem,
  type CountResult,
} from "@/lib/adminOverview";
import { fetchAdminCounts, fetchAdminOverview } from "@/lib/adminOverviewData";
import { fetchOnboardingStats } from "@/lib/onboarding-stats-data";
import type { ChoiceDistribution } from "@/lib/onboarding-stats";
import { cn } from "@/lib/utils";

const ACTIVITY_ICON = {
  daily: { className: "text-orange-500", Icon: CalendarDays },
  message: { className: "text-rose-500", Icon: Mail },
  update: { className: "text-amber-500", Icon: Megaphone },
} as const;

function positive(count: CountResult | undefined): number | null {
  return typeof count === "number" && count > 0 ? count : null;
}

function UpToDateToast({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="sx-overlay pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-800/70 dark:bg-emerald-950 dark:text-emerald-50">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
        <CircleCheck className="h-4 w-4" />
      </span>

      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-emerald-800 dark:text-emerald-300">{description}</p>
      </div>
    </div>
  );
}

function DashboardSection({
  action,
  children,
  description,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function RangeToggle({
  onChange,
  value,
}: {
  onChange: (range: AnalyticsRange) => void;
  value: AnalyticsRange;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
      {ANALYTICS_RANGES.map((range) => (
        <Button
          key={range}
          variant={range === value ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onChange(range)}
        >
          {t(`admin.overview.analytics.ranges.${range}`)}
        </Button>
      ))}
    </div>
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

function ChoiceBreakdown({
  denominator,
  distribution,
  labels,
  title,
}: {
  denominator?: number;
  distribution: ChoiceDistribution;
  labels: Record<string, string>;
  title: string;
}) {
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const total = denominator ?? entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="rounded-xl border bg-card/60 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="tabular-nums">
          {total.toLocaleString()}
        </Badge>
      </div>
      <div className="space-y-3">
        {entries.length ? entries.map(([key, count]) => {
          const percentage = total ? Math.min(100, Math.round((count / total) * 100)) : 0;
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium">{labels[key] ?? key}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{count} · {percentage}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-700"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        }) : <p className="py-4 text-center text-xs text-muted-foreground">—</p>}
      </div>
    </div>
  );
}

function AdminContent() {
  const { locale, t } = useLanguage();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const countsQuery = useQuery({
    queryKey: ["admin", "counts"],
    queryFn: fetchAdminCounts,
  });

  const overviewQuery = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: fetchAdminOverview,
  });

  const onboardingQuery = useQuery({
    queryKey: ["admin", "onboarding-stats"],
    queryFn: fetchOnboardingStats,
    staleTime: 5 * 60 * 1000,
  });

  const [days, setDays] = useState<AnalyticsRange>(30);

  const analyticsQuery = useQuery({
    queryKey: ["admin", "analytics", days],
    queryFn: () => fetchAdminAnalytics(days),
  });

  const counts = countsQuery.data;
  const overview = overviewQuery.data;
  const analytics = analyticsQuery.data;
  const onboarding = onboardingQuery.data;

  const activityItems = useMemo(
    () => buildActivityFeed(overview, locale),
    [overview, locale]
  );

  const popularity = useMemo(
    () => buildPopularityData(analytics?.problems, locale),
    [analytics, locale]
  );

  const activitySeries = useMemo(
    () => buildActivitySeries(analytics?.activity, locale),
    [analytics, locale]
  );

  const summary = useMemo(
    () => summarizeActivity(analytics?.activity),
    [analytics]
  );

  const percent = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, style: "percent" }),
    []
  );

  const isFetching =
    countsQuery.isFetching || overviewQuery.isFetching || analyticsQuery.isFetching || onboardingQuery.isFetching;
  const bannedCount = positive(counts?.bannedUsers);
  const newMessageCount = positive(counts?.contactNew);

  const analyticsPending = analyticsQuery.isPending;
  const analyticsUnavailable = analytics?.available === false;
  const TrendIcon =
    summary.deltaPct !== null && summary.deltaPct < 0 ? TrendingDown : TrendingUp;

  const adminName = profile?.username?.trim();
  const bannerTitle = adminName
    ? t("admin.overview.banner.greeting").replace("{name}", adminName)
    : t("admin.title");

  function snapshot() {
    return JSON.stringify([
      queryClient.getQueryData(["admin", "counts"]) ?? null,
      queryClient.getQueryData(["admin", "overview"]) ?? null,
      queryClient.getQueryData(["admin", "analytics", days]) ?? null,
      queryClient.getQueryData(["admin", "tasks"]) ?? null,
      queryClient.getQueryData(["admin", "onboarding-stats"]) ?? null,
    ]);
  }

  async function refreshAll() {
    const before = snapshot();

    try {
      await Promise.all([
        countsQuery.refetch({ throwOnError: true }),
        overviewQuery.refetch({ throwOnError: true }),
        analyticsQuery.refetch({ throwOnError: true }),
        onboardingQuery.refetch({ throwOnError: true }),
        queryClient.invalidateQueries({ queryKey: ["admin", "tasks"] }),
      ]);
    } catch {
      toast.error(t("admin.overview.actions.refreshFailed"));
      return;
    }

    if (snapshot() === before) {
      toast.custom(
        () => (
          <UpToDateToast
            title={t("admin.overview.actions.upToDate")}
            description={t("admin.overview.actions.upToDateHint")}
          />
        ),
        {
          position: "bottom-center",
          unstyled: true,
          style: {
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: 0,
            width: "auto",
          },
        }
      );
      return;
    }

    toast.success(t("admin.overview.actions.refreshed"));
  }

  return (
    <div className="space-y-6">
      <AdminHeroBanner
        title={bannerTitle}
        subtitle={t("admin.overview.banner.subtitle")}
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refreshAll()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            {t("admin.overview.actions.refresh")}
          </Button>
        }
      />

      <DashboardSection
        title={t("admin.overview.analytics.title")}
        description={t("admin.overview.analytics.description")}
        action={<RangeToggle value={days} onChange={setDays} />}
      >
        {analyticsUnavailable ? (
          <EmptyState
            className="py-8"
            icon={<BarChart3 className="h-8 w-8" />}
            title={t("admin.overview.analytics.unavailable.title")}
            description={t("admin.overview.analytics.unavailable.description")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatTile
              pending={analyticsPending}
              icon={<Send className="h-4 w-4 text-blue-500" />}
              label={t("admin.overview.analytics.summary.submissions")}
              value={summary.submissions.toLocaleString()}
              footer={t("admin.overview.analytics.summary.avgPerDay").replace(
                "{count}",
                summary.avgPerDay.toLocaleString()
              )}
            />

            <AdminStatTile
              pending={analyticsPending}
              icon={<Users className="h-4 w-4 text-emerald-500" />}
              label={t("admin.overview.analytics.summary.peakActiveUsers")}
              value={summary.activeUsers.toLocaleString()}
              footer={
                summary.peakDay
                  ? t("admin.overview.analytics.summary.peakOn").replace(
                      "{day}",
                      formatDay(summary.peakDay, locale)
                    )
                  : t("admin.overview.analytics.summary.peakActiveUsersHint")
              }
            />

            <AdminStatTile
              pending={analyticsPending}
              icon={<CircleCheck className="h-4 w-4 text-violet-500" />}
              label={t("admin.overview.analytics.summary.solves")}
              value={summary.solves.toLocaleString()}
              footer={t("admin.overview.analytics.summary.solveShare").replace(
                "{percent}",
                percent.format(summary.solveRate)
              )}
            />

            <AdminStatTile
              pending={analyticsPending}
              icon={<TrendIcon className="h-4 w-4 text-orange-500" />}
              label={t("admin.overview.analytics.summary.trend")}
              value={
                summary.deltaPct === null
                  ? "—"
                  : `${summary.deltaPct > 0 ? "+" : ""}${summary.deltaPct}%`
              }
              valueClassName={cn(
                summary.deltaPct !== null &&
                  (summary.deltaPct < 0 ? "text-rose-500" : "text-emerald-500")
              )}
              footer={
                summary.deltaPct === null
                  ? t("admin.overview.analytics.summary.trendUnknown")
                  : t("admin.overview.analytics.summary.trendAgainst").replace(
                      "{count}",
                      summary.previousSubmissions.toLocaleString()
                    )
              }
            />
          </div>
        )}
      </DashboardSection>

      <DashboardSection
        title={locale === "ro" ? "Alegeri din onboarding" : "Onboarding choices"}
        description={locale === "ro"
          ? "Statistici agregate despre limba, workspace-ul și obiectivele alese de utilizatori."
          : "Aggregated statistics for users’ language, workspace, experience and learning choices."}
      >
        {onboardingQuery.isError ? (
          <EmptyState
            className="py-8"
            icon={<UserRoundCheck className="h-8 w-8" />}
            title={locale === "ro" ? "Statisticile nu sunt disponibile" : "Statistics are unavailable"}
            description={locale === "ro" ? "Încearcă din nou după refresh." : "Try again after refreshing."}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <AdminStatTile
                pending={onboardingQuery.isPending}
                icon={<Users className="h-4 w-4 text-sky-500" />}
                label={locale === "ro" ? "Utilizatori" : "Users"}
                value={(onboarding?.totalUsers ?? 0).toLocaleString()}
                footer={locale === "ro" ? "Conturi incluse în agregare" : "Accounts included in the aggregate"}
              />
              <AdminStatTile
                pending={onboardingQuery.isPending}
                icon={<UserRoundCheck className="h-4 w-4 text-emerald-500" />}
                label={locale === "ro" ? "Au răspuns" : "Responded"}
                value={(onboarding?.respondents ?? 0).toLocaleString()}
                footer={locale === "ro" ? "Au cel puțin o alegere salvată" : "Have at least one saved choice"}
              />
              <AdminStatTile
                pending={onboardingQuery.isPending}
                icon={<GraduationCap className="h-4 w-4 text-violet-500" />}
                label={locale === "ro" ? "Onboarding finalizat" : "Completed onboarding"}
                value={(onboarding?.completedUsers ?? 0).toLocaleString()}
                footer={onboarding?.totalUsers
                  ? `${Math.round((onboarding.completedUsers / onboarding.totalUsers) * 100)}% ${locale === "ro" ? "din utilizatori" : "of users"}`
                  : "—"}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ChoiceBreakdown
                title={locale === "ro" ? "Limbă implicită" : "Default language"}
                distribution={onboarding?.languages ?? {}}
                labels={{ en: "English", ro: "Română" }}
              />
              <ChoiceBreakdown
                title={locale === "ro" ? "Tip workspace" : "Workspace type"}
                distribution={onboarding?.personas ?? {}}
                labels={locale === "ro"
                  ? { learner: "Învățare programare", student: "Elev", teacher: "Profesor" }
                  : { learner: "Programming learner", student: "Student", teacher: "Teacher" }}
              />
              <ChoiceBreakdown
                title={locale === "ro" ? "Nivel de experiență" : "Experience level"}
                distribution={onboarding?.experiences ?? {}}
                labels={locale === "ro"
                  ? { "first-steps": "Primii pași", beginner: "Începător", intermediate: "Intermediar", advanced: "Avansat" }
                  : { "first-steps": "First steps", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" }}
              />
              <ChoiceBreakdown
                title={locale === "ro" ? "Obiectiv principal" : "Primary goal"}
                distribution={onboarding?.goals ?? {}}
                labels={locale === "ro"
                  ? { "learn-programming": "Învăț programare", "practice-algorithms": "Exersez algoritmi", "prepare-interviews": "Pregătire interviuri", "teach-with-scripticx": "Predau cu ScripticX" }
                  : { "learn-programming": "Learn programming", "practice-algorithms": "Practice algorithms", "prepare-interviews": "Prepare for interviews", "teach-with-scripticx": "Teach with ScripticX" }}
              />
              <ChoiceBreakdown
                title={locale === "ro" ? "Interese" : "Interests"}
                denominator={onboarding?.respondents}
                distribution={onboarding?.interests ?? {}}
                labels={locale === "ro"
                  ? { fundamentals: "Fundamente", algorithms: "Algoritmi", debugging: "Debugging", "visual-execution": "Execuție vizuală", complexity: "Complexitate", collaboration: "Colaborare" }
                  : { fundamentals: "Fundamentals", algorithms: "Algorithms", debugging: "Debugging", "visual-execution": "Visual execution", complexity: "Complexity", collaboration: "Collaboration" }}
              />
              <div className="flex min-h-48 flex-col justify-between rounded-xl border bg-muted/45 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background shadow-sm">
                  <Languages className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{locale === "ro" ? "Preferințe data-driven" : "Data-driven preferences"}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {locale === "ro"
                      ? "Doar valori agregate sunt afișate; răspunsurile individuale nu părăsesc endpoint-ul protejat de admin."
                      : "Only aggregates are displayed; individual answers never leave the admin-protected endpoint."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardSection>

      <DashboardSection
        title={t("admin.overview.tools.title")}
        description={t("admin.overview.tools.description")}
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] items-stretch gap-4">
          <div className="min-w-0">
            <AdminNavCard
              href="/admin/competitions"
              icon={<Trophy className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />}
              ringClassName="ring-zinc-500/50"
              title={locale === "ro" ? "Competiții" : "Competitions"}
              description={locale === "ro"
                ? "Configurează concursuri, probleme, invitații și maintenance."
                : "Configure competitions, problems, invites, and maintenance."}
              count={null}
            />
          </div>

          <div className="min-w-0">
            <AdminNavCard
              href="/admin/problems"
              icon={<FileText className="h-5 w-5 text-blue-500" />}
              ringClassName="ring-blue-500/50"
              title={t("admin.problems.title")}
              description={t("admin.problems.description")}
              count={counts?.problems}
            />
          </div>

          <div className="min-w-0">
            <AdminNavCard
              href="/admin/users"
              icon={<Users className="h-5 w-5 text-emerald-500" />}
              ringClassName="ring-emerald-500/50"
              title={t("admin.users.title")}
              description={t("admin.users.description")}
              count={counts?.users}
              accentBadge={
                bannedCount
                  ? {
                      className: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
                      label: t("admin.overview.badges.banned").replace(
                        "{count}",
                        String(bannedCount)
                      ),
                    }
                  : null
              }
            />
          </div>

          <div className="min-w-0">
            <AdminNavCard
              href="/admin/updates"
              icon={<Sparkles className="h-5 w-5 text-amber-500" />}
              ringClassName="ring-amber-500/50"
              title={t("admin.updates.title")}
              description={t("admin.updates.description")}
              count={counts?.updates}
            />
          </div>

          <div className="min-w-0">
            <AdminNavCard
              href="/admin/badges"
              icon={<Award className="h-5 w-5 text-rose-500" />}
              ringClassName="ring-rose-500/50"
              title={t("admin.badgeManager.title")}
              description={t("admin.badgeManager.description")}
              count={counts?.achievements}
            />
          </div>

          <div className="min-w-0">
            <AdminNavCard
              href="/admin/shop"
              icon={<ShoppingBag className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />}
              ringClassName="ring-zinc-500/50"
              title={t("admin.shopManager.title")}
              description={t("admin.shopManager.description")}
              count={counts?.rewardProducts}
            />
          </div>

          <div className="min-w-0">
            <AdminNavCard
              href="/admin/contact"
              icon={<Mail className="h-5 w-5 text-rose-500" />}
              ringClassName="ring-rose-500/50"
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
          </div>

          <div className="min-w-0">
            <AdminNavCard
              href="/admin/email"
              icon={<Mails className="h-5 w-5 text-blue-500" />}
              ringClassName="ring-blue-500/50"
              title={t("admin.emailCenter.cardTitle")}
              description={t("admin.emailCenter.cardDescription")}
              count={null}
            />
          </div>

          <div className="min-w-0">
            <AdminNavCard
              href="/admin/lessons"
              icon={<GitBranch className="h-5 w-5 text-violet-500" />}
              ringClassName="ring-violet-500/50"
              title={t("admin.lessons.title")}
              description={t("admin.lessons.description")}
              count={null}
            />
          </div>

          <div className="min-w-0">
            <AdminNavCard
              href="/admin/design-system"
              icon={<Palette className="h-5 w-5 text-foreground" />}
              ringClassName="ring-foreground/20"
              title={t("admin.designSystem.cardTitle")}
              description={t("admin.designSystem.cardDescription")}
              count={null}
            />
          </div>
        </div>
      </DashboardSection>

      {!analyticsUnavailable && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AdminPanelSection
            icon={<Activity className="h-4 w-4 text-blue-500" />}
            title={t("admin.overview.analytics.trendTitle")}
            isLoading={analyticsPending}
            isError={analyticsQuery.isError}
            onRetry={() => void analyticsQuery.refetch()}
          >
            {hasActivity(activitySeries) ? (
              <ActivityChart data={activitySeries} />
            ) : (
              <EmptyState
                className="py-10"
                icon={<Activity className="h-8 w-8" />}
                title={t("admin.overview.analytics.empty.title")}
                description={t("admin.overview.analytics.empty.description")}
              />
            )}
          </AdminPanelSection>

          <AdminPanelSection
            icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
            title={t("admin.overview.analytics.popularityTitle")}
            isLoading={analyticsPending}
            isError={analyticsQuery.isError}
            onRetry={() => void analyticsQuery.refetch()}
          >
            {popularity.length > 0 ? (
              <ProblemPopularityChart data={popularity} />
            ) : (
              <EmptyState
                className="py-10"
                icon={<BarChart3 className="h-8 w-8" />}
                title={t("admin.overview.analytics.empty.title")}
                description={t("admin.overview.analytics.empty.description")}
              />
            )}
          </AdminPanelSection>
        </div>
      )}

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
  );
}

export default function AdminPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminContent />
    </RouteGuard>
  );
}
