"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Clock, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import RouteGuard from "@/components/RouteGuard";
import { WorkshopAgenda } from "@/components/admin/workshops/WorkshopAgenda";
import { WorkshopDetailsForm } from "@/components/admin/workshops/WorkshopDetailsForm";
import { WorkshopNotes } from "@/components/admin/workshops/WorkshopNotes";
import { WorkshopResources } from "@/components/admin/workshops/WorkshopResources";
import { EmptyState } from "@/components/common/EmptyState";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useTrainerPortal } from "@/hooks/useTrainerPortal";
import {
  agendaToPlainText,
  formatClock,
  formatDuration,
  summarizeWorkshop,
} from "@/lib/trainer-portal";
import { trainerPortalCopy } from "@/lib/trainer-portal-copy";

function AdminWorkshopDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { locale } = useLanguage();
  const language = locale === "ro" ? "ro" : "en";
  const copy = trainerPortalCopy(language);
  const { profile } = useAuth();
  const portal = useTrainerPortal();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const workshop = portal.workshops.find((entry) => entry.id === id);

  async function copyText(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error(copy.copyFailed);
    }
  }

  if (portal.loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-[var(--sx-radius-card)]" />
        <Skeleton className="h-64 w-full rounded-[var(--sx-radius-card)]" />
      </div>
    );
  }

  if (portal.isError) {
    return (
      <div className="mx-auto max-w-6xl">
        <Card>
          <CardContent className="p-4">
            <EmptyState
              title={copy.errorTitle}
              description={copy.errorDescription}
              action={
                <Button size="sm" variant="outline" onClick={() => void portal.refetch()}>
                  {copy.retry}
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="mx-auto max-w-6xl">
        <Card>
          <CardContent className="p-4">
            <EmptyState
              title={copy.notFoundTitle}
              description={copy.notFoundDescription}
              action={
                <Button size="sm" asChild>
                  <Link href="/admin/workshops">{copy.backToWorkshops}</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = summarizeWorkshop(workshop);
  const startsAt = new Date(workshop.startsAt);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" asChild className="-ml-2.5">
            <Link href="/admin/workshops">
              <ArrowLeft />
              {copy.backToWorkshops}
            </Link>
          </Button>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold">{workshop.title}</h1>
            <Badge variant={workshop.status === "scheduled" ? "default" : "secondary"}>
              {copy.statuses[workshop.status]}
            </Badge>
          </div>

          {workshop.summary && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {workshop.summary}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="size-3.5" />
              {startsAt.toLocaleString(language === "ro" ? "ro-RO" : "en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {formatDuration(summary.totalMinutes)} · {copy.endsAt}{" "}
              {formatClock(summary.endsAt, language)}
            </span>
            {workshop.trainers.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" />
                {workshop.trainers.join(", ")}
              </span>
            )}
            {workshop.location && <span>{workshop.location}</span>}
            {workshop.audience && <span>{workshop.audience}</span>}
          </div>
        </div>

        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 />
          {copy.deleteWorkshop}
        </Button>
      </header>

      <Tabs defaultValue="agenda">
        <TabsList>
          <TabsTrigger value="agenda">{copy.tabAgenda}</TabsTrigger>
          <TabsTrigger value="resources">{copy.tabResources}</TabsTrigger>
          <TabsTrigger value="notes">
            {copy.tabNotes}
            {summary.openComments > 0 && (
              <Badge variant="secondary">{summary.openComments}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="details">{copy.tabDetails}</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda">
          <WorkshopAgenda
            copy={copy}
            locale={language}
            workshop={workshop}
            onAddSection={(draft) => portal.addSection(workshop.id, draft)}
            onUpdateSection={(sectionId, patch) =>
              portal.updateSection(workshop.id, sectionId, patch)
            }
            onRemoveSection={(sectionId) => portal.removeSection(workshop.id, sectionId)}
            onMoveSection={(sectionId, direction) =>
              portal.moveSection(workshop.id, sectionId, direction)
            }
            onToggleResource={(sectionId, resourceId) =>
              portal.toggleSectionResource(workshop.id, sectionId, resourceId)
            }
            onResetProgress={() => portal.resetProgress(workshop.id)}
            onCopyRunSheet={() =>
              void copyText(agendaToPlainText(workshop, language), copy.runSheetCopied)
            }
          />
        </TabsContent>

        <TabsContent value="resources">
          <WorkshopResources
            copy={copy}
            workshop={workshop}
            onAddResource={(draft) => portal.addResource(workshop.id, draft)}
            onUpdateResource={(resourceId, patch) =>
              portal.updateResource(workshop.id, resourceId, patch)
            }
            onRemoveResource={(resourceId) =>
              portal.removeResource(workshop.id, resourceId)
            }
            onCopyLink={(url) => void copyText(url, copy.linkCopied)}
          />
        </TabsContent>

        <TabsContent value="notes">
          <WorkshopNotes
            author={profile?.username?.trim() || "Trainer"}
            copy={copy}
            locale={language}
            workshop={workshop}
            onAddComment={(draft) =>
              portal.addComment(workshop.id, draft, copy.noteAdded)
            }
            onUpdateComment={(commentId, patch) =>
              portal.updateComment(workshop.id, commentId, patch)
            }
            onRemoveComment={(commentId) => portal.removeComment(workshop.id, commentId)}
          />
        </TabsContent>

        <TabsContent value="details">
          <WorkshopDetailsForm
            copy={copy}
            locale={language}
            workshop={workshop}
            onSave={(patch) => portal.updateWorkshop(workshop.id, patch, copy.saved)}
          />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        {portal.saveState === "saving" ? copy.saving : copy.sharedHint}
      </p>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteWorkshopTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.deleteWorkshopDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                portal.removeWorkshop(workshop.id, copy.deleted);
                router.push("/admin/workshops");
              }}
            >
              {copy.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminWorkshopDetailPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminWorkshopDetailContent />
    </RouteGuard>
  );
}
