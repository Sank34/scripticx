"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  Clock,
  Copy,
  Link2,
  MessageSquare,
  Plus,
  Presentation,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import RouteGuard from "@/components/RouteGuard";
import { AdminStatTile } from "@/components/admin/AdminStatTile";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useTrainerPortal } from "@/hooks/useTrainerPortal";
import { formatDuration, summarizeWorkshop, type Workshop } from "@/lib/trainer-portal";
import { trainerPortalCopy } from "@/lib/trainer-portal-copy";

function defaultStart() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(10, 0, 0, 0);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function byStartDate(a: Workshop, b: Workshop) {
  return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
}

function AdminWorkshopsContent() {
  const { locale } = useLanguage();
  const language = locale === "ro" ? "ro" : "en";
  const copy = trainerPortalCopy(language);
  const portal = useTrainerPortal();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(() => ({
    title: "",
    summary: "",
    startsAt: defaultStart(),
    location: "",
    audience: "",
    trainers: "",
  }));

  const workshops = [...portal.workshops].sort(byStartDate);
  const upcoming = workshops.find(
    (workshop) => new Date(workshop.startsAt).getTime() >= Date.now()
  );
  const plannedMinutes = workshops.reduce(
    (total, workshop) => total + summarizeWorkshop(workshop).totalMinutes,
    0
  );

  function create() {
    const startsAt = new Date(form.startsAt);
    portal.addWorkshop(
      {
        ...form,
        startsAt: Number.isNaN(startsAt.getTime())
          ? new Date().toISOString()
          : startsAt.toISOString(),
      },
      copy.created
    );
    setCreateOpen(false);
    setForm({
      title: "",
      summary: "",
      startsAt: defaultStart(),
      location: "",
      audience: "",
      trainers: "",
    });
  }

  function duplicate(workshop: Workshop) {
    portal.duplicate(
      workshop.id,
      `${workshop.title} ${copy.duplicateSuffix}`,
      copy.duplicated
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" asChild className="-ml-2.5">
            <Link href="/admin">
              <ArrowLeft />
              {copy.backToAdmin}
            </Link>
          </Button>
          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Presentation className="size-4" />
            {copy.eyebrow}
          </p>
          <h1 className="mt-1 text-3xl font-semibold">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>

        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          {copy.newWorkshop}
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatTile
          pending={portal.loading}
          icon={<Presentation className="h-4 w-4 text-muted-foreground" />}
          label={copy.statTotal}
          value={String(workshops.length)}
          footer={copy.sharedNote}
        />
        <AdminStatTile
          pending={portal.loading}
          icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
          label={copy.statNext}
          value={
            upcoming
              ? new Date(upcoming.startsAt).toLocaleDateString(
                  language === "ro" ? "ro-RO" : "en-US",
                  { day: "numeric", month: "short" }
                )
              : "—"
          }
          footer={upcoming?.title ?? copy.statNextNone}
        />
        <AdminStatTile
          pending={portal.loading}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          label={copy.statPlanned}
          value={formatDuration(plannedMinutes)}
          footer={copy.agendaTitle}
        />
      </div>

      {portal.loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-[var(--sx-radius-card)]" />
          <Skeleton className="h-32 w-full rounded-[var(--sx-radius-card)]" />
        </div>
      ) : portal.isError ? (
        <Card>
          <CardContent className="p-4">
            <EmptyState
              icon={<Presentation className="h-8 w-8" />}
              title={copy.errorTitle}
              description={copy.errorDescription}
              action={
                <Button size="sm" variant="outline" onClick={() => void portal.refetch()}>
                  <RefreshCw />
                  {copy.retry}
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : !workshops.length ? (
        <Card>
          <CardContent className="p-4">
            <EmptyState
              icon={<Presentation className="h-8 w-8" />}
              title={copy.emptyTitle}
              description={copy.emptyDescription}
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus />
                  {copy.newWorkshop}
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workshops.map((workshop) => {
            const summary = summarizeWorkshop(workshop);

            return (
              <Card key={workshop.id}>
                <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold">{workshop.title}</h2>
                      <Badge
                        variant={
                          workshop.status === "scheduled" ? "default" : "secondary"
                        }
                      >
                        {copy.statuses[workshop.status]}
                      </Badge>
                    </div>

                    {workshop.summary && (
                      <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                        {workshop.summary}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="size-3.5" />
                        {new Date(workshop.startsAt).toLocaleString(
                          language === "ro" ? "ro-RO" : "en-US",
                          { dateStyle: "medium", timeStyle: "short" }
                        )}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        {formatDuration(summary.totalMinutes)} ·{" "}
                        {summary.totalSections} {copy.sectionsLabel}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Link2 className="size-3.5" />
                        {summary.resourceCount}
                      </span>
                      {summary.openComments > 0 && (
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="size-3.5" />
                          {copy.openNotes.replace(
                            "{count}",
                            String(summary.openComments)
                          )}
                        </span>
                      )}
                      {workshop.location && <span>{workshop.location}</span>}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicate(workshop)}
                    >
                      <Copy />
                      {copy.duplicate}
                    </Button>
                    <Button size="sm" asChild>
                      <Link href={`/admin/workshops/${workshop.id}`}>
                        {copy.open}
                        <ChevronRight />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{copy.sharedHint}</p>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{copy.createTitle}</DialogTitle>
            <DialogDescription>{copy.createDescription}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="new-workshop-title">
                {copy.fieldTitle}
              </label>
              <Input
                id="new-workshop-title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="new-workshop-summary">
                {copy.fieldSummary}
              </label>
              <Textarea
                id="new-workshop-summary"
                rows={3}
                value={form.summary}
                onChange={(event) =>
                  setForm((current) => ({ ...current, summary: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{copy.fieldStartsAt}</label>
              <DateTimePicker
                locale={language}
                placeholder={copy.fieldStartsAt}
                value={form.startsAt}
                onChange={(startsAt) => setForm((current) => ({ ...current, startsAt }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="new-workshop-location">
                  {copy.fieldLocation}
                </label>
                <Input
                  id="new-workshop-location"
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, location: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="new-workshop-audience">
                  {copy.fieldAudience}
                </label>
                <Input
                  id="new-workshop-audience"
                  value={form.audience}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, audience: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="new-workshop-trainers">
                {copy.fieldTrainers}
              </label>
              <Input
                id="new-workshop-trainers"
                aria-describedby="new-workshop-trainers-hint"
                value={form.trainers}
                onChange={(event) =>
                  setForm((current) => ({ ...current, trainers: event.target.value }))
                }
              />
              <p
                id="new-workshop-trainers-hint"
                className="text-xs text-muted-foreground"
              >
                {copy.fieldTrainersHint}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {copy.cancel}
            </Button>
            <Button disabled={!form.title.trim()} onClick={create}>
              {copy.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminWorkshopsPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminWorkshopsContent />
    </RouteGuard>
  );
}
