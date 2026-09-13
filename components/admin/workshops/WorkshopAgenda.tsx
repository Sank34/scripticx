"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ClipboardCopy,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildAgenda,
  clampDuration,
  currentAgendaEntry,
  formatClock,
  formatDuration,
  summarizeWorkshop,
  WORKSHOP_SECTION_KINDS,
  type Workshop,
  type WorkshopResource,
  type WorkshopSection,
  type WorkshopSectionKind,
} from "@/lib/trainer-portal";
import type { TrainerPortalCopy } from "@/lib/trainer-portal-copy";
import { cn } from "@/lib/utils";

type SectionDraft = {
  title: string;
  kind: WorkshopSectionKind;
  durationMinutes: string;
  owner: string;
  notes: string;
};

const EMPTY_DRAFT: SectionDraft = {
  title: "",
  kind: "talk",
  durationMinutes: "15",
  owner: "",
  notes: "",
};

function toDraft(section: WorkshopSection): SectionDraft {
  return {
    title: section.title,
    kind: section.kind,
    durationMinutes: String(section.durationMinutes),
    owner: section.owner,
    notes: section.notes,
  };
}

export function WorkshopAgenda({
  copy,
  locale,
  onAddSection,
  onCopyRunSheet,
  onMoveSection,
  onRemoveSection,
  onResetProgress,
  onToggleResource,
  onUpdateSection,
  workshop,
}: {
  copy: TrainerPortalCopy;
  locale: "en" | "ro";
  onAddSection: (draft: Partial<WorkshopSection>) => void;
  onCopyRunSheet: () => void;
  onMoveSection: (sectionId: string, direction: "up" | "down") => void;
  onRemoveSection: (sectionId: string) => void;
  onResetProgress: () => void;
  onToggleResource: (sectionId: string, resourceId: string) => void;
  onUpdateSection: (sectionId: string, patch: Partial<WorkshopSection>) => void;
  workshop: Workshop;
}) {
  const [editing, setEditing] = useState<WorkshopSection | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<SectionDraft>(EMPTY_DRAFT);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const agenda = buildAgenda(workshop);
  const summary = summarizeWorkshop(workshop);
  const liveSectionId = now ? currentAgendaEntry(workshop, now)?.section.id ?? null : null;

  function openCreate() {
    setDraft(EMPTY_DRAFT);
    setCreating(true);
  }

  function openEdit(section: WorkshopSection) {
    setDraft(toDraft(section));
    setEditing(section);
  }

  function submit() {
    const patch = {
      title: draft.title.trim(),
      kind: draft.kind,
      durationMinutes: clampDuration(draft.durationMinutes),
      owner: draft.owner.trim(),
      notes: draft.notes.trim(),
    };

    if (editing) onUpdateSection(editing.id, patch);
    else onAddSection(patch);

    setEditing(null);
    setCreating(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium">
              {copy.progressLabel
                .replace("{done}", String(summary.completedSections))
                .replace("{total}", String(summary.totalSections))}
            </p>
            <Progress value={summary.progress} className="h-1.5 w-full sm:w-64" />
            <p className="text-xs text-muted-foreground">
              {formatDuration(summary.totalMinutes)} ·{" "}
              {copy.endsAt} {formatClock(summary.endsAt, locale)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onCopyRunSheet}>
              <ClipboardCopy />
              {copy.copyRunSheet}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetProgress}
              disabled={!summary.completedSections}
            >
              <RotateCcw />
              {copy.resetProgress}
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus />
              {copy.addSection}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!agenda.length ? (
        <Card>
          <CardContent className="p-4">
            <EmptyState
              title={copy.agendaEmptyTitle}
              description={copy.agendaEmptyDescription}
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus />
                  {copy.addSection}
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-3">
          {agenda.map((entry) => {
            const { section } = entry;
            const isLive = section.id === liveSectionId;
            const attached = section.resourceIds
              .map((id) => workshop.resources.find((resource) => resource.id === id))
              .filter((resource): resource is WorkshopResource => Boolean(resource));

            return (
              <li key={section.id}>
                <Card className={cn(isLive && "border-primary")}>
                  <CardContent className="grid gap-4 p-4 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:items-start">
                    <div className="flex items-center gap-2 sm:block">
                      <p className="font-mono text-sm font-medium tabular-nums">
                        {formatClock(entry.startsAt, locale)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(section.durationMinutes)}
                      </p>
                      {isLive && (
                        <Badge className="mt-1.5 sm:mt-2">{copy.now}</Badge>
                      )}
                    </div>

                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3
                            className={cn(
                              "font-medium",
                              section.done && "text-muted-foreground line-through"
                            )}
                          >
                            {section.title}
                          </h3>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span>{copy.sectionKinds[section.kind]}</span>
                            {section.owner && <span>· {section.owner}</span>}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant={section.done ? "secondary" : "ghost"}
                            size="icon-sm"
                            aria-label={section.done ? copy.markNotDone : copy.markDone}
                            title={section.done ? copy.markNotDone : copy.markDone}
                            onClick={() =>
                              onUpdateSection(section.id, { done: !section.done })
                            }
                          >
                            <Check />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={copy.moveUp}
                            title={copy.moveUp}
                            disabled={entry.index === 0}
                            onClick={() => onMoveSection(section.id, "up")}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={copy.moveDown}
                            title={copy.moveDown}
                            disabled={entry.index === agenda.length - 1}
                            onClick={() => onMoveSection(section.id, "down")}
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={copy.editSection}
                            title={copy.editSection}
                            onClick={() => openEdit(section)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={copy.removeSection}
                            title={copy.removeSection}
                            onClick={() => onRemoveSection(section.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>

                      {section.notes && (
                        <p className="text-sm leading-6 text-muted-foreground">
                          {section.notes}
                        </p>
                      )}

                      {attached.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {attached.map((resource) => (
                            <a
                              key={resource.id}
                              href={resource.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="sx-interactive inline-flex items-center gap-1.5 rounded-[var(--sx-radius-control)] border border-border bg-muted/50 px-2 py-1 text-xs hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                            >
                              {resource.title}
                              <ExternalLink className="size-3 text-muted-foreground" />
                            </a>
                          ))}
                        </div>
                      )}

                      <details>
                        <summary className="sx-interactive inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                          {copy.attachedResources}
                        </summary>

                        {workshop.resources.length ? (
                          <>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {copy.attachHint}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {workshop.resources.map((resource) => {
                                const checked = section.resourceIds.includes(resource.id);
                                return (
                                  <Button
                                    key={resource.id}
                                    variant={checked ? "secondary" : "outline"}
                                    size="xs"
                                    aria-pressed={checked}
                                    onClick={() =>
                                      onToggleResource(section.id, resource.id)
                                    }
                                  >
                                    {checked && <Check />}
                                    {resource.title}
                                  </Button>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {copy.noResourcesYet}
                          </p>
                        )}
                      </details>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      )}

      <Dialog
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (open) return;
          setCreating(false);
          setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? copy.editSection : copy.newSection}</DialogTitle>
            <DialogDescription>{copy.agendaDescription}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="section-title">
                {copy.fieldTitle}
              </label>
              <Input
                id="section-title"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="section-kind">
                  {copy.fieldKind}
                </label>
                <Select
                  value={draft.kind}
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      kind: value as WorkshopSectionKind,
                    }))
                  }
                >
                  <SelectTrigger id="section-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKSHOP_SECTION_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {copy.sectionKinds[kind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="section-duration">
                  {copy.fieldDuration}
                </label>
                <Input
                  id="section-duration"
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={draft.durationMinutes}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      durationMinutes: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="section-owner">
                {copy.fieldOwner}
              </label>
              <Input
                id="section-owner"
                value={draft.owner}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, owner: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="section-notes">
                {copy.fieldNotes}
              </label>
              <Textarea
                id="section-notes"
                rows={4}
                value={draft.notes}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              {copy.cancel}
            </Button>
            <Button disabled={!draft.title.trim()} onClick={submit}>
              {editing ? copy.save : copy.addSection}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
