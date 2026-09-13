"use client";

import { useState } from "react";
import {
  ClipboardCopy,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  Plus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  isSafeResourceUrl,
  resourceHostname,
  toCanvaEmbedUrl,
  WORKSHOP_RESOURCE_KINDS,
  type Workshop,
  type WorkshopResource,
  type WorkshopResourceKind,
} from "@/lib/trainer-portal";
import type { TrainerPortalCopy } from "@/lib/trainer-portal-copy";

type ResourceDraft = {
  title: string;
  kind: WorkshopResourceKind;
  url: string;
  note: string;
};

const EMPTY_DRAFT: ResourceDraft = {
  title: "",
  kind: "canva",
  url: "",
  note: "",
};

export function WorkshopResources({
  copy,
  onAddResource,
  onCopyLink,
  onRemoveResource,
  onUpdateResource,
  workshop,
}: {
  copy: TrainerPortalCopy;
  onAddResource: (draft: Partial<WorkshopResource>) => void;
  onCopyLink: (url: string) => void;
  onRemoveResource: (resourceId: string) => void;
  onUpdateResource: (resourceId: string, patch: Partial<WorkshopResource>) => void;
  workshop: Workshop;
}) {
  const [filter, setFilter] = useState<WorkshopResourceKind | "all">("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<WorkshopResource | null>(null);
  const [draft, setDraft] = useState<ResourceDraft>(EMPTY_DRAFT);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const usedKinds = WORKSHOP_RESOURCE_KINDS.filter((kind) =>
    workshop.resources.some((resource) => resource.kind === kind)
  );
  const resources =
    filter === "all"
      ? workshop.resources
      : workshop.resources.filter((resource) => resource.kind === filter);

  const urlValid = isSafeResourceUrl(draft.url);

  function openCreate() {
    setDraft(EMPTY_DRAFT);
    setCreating(true);
  }

  function openEdit(resource: WorkshopResource) {
    setDraft({
      title: resource.title,
      kind: resource.kind,
      url: resource.url,
      note: resource.note,
    });
    setEditing(resource);
  }

  function submit() {
    const patch = {
      title: draft.title.trim(),
      kind: draft.kind,
      url: draft.url.trim(),
      note: draft.note.trim(),
    };

    if (editing) onUpdateResource(editing.id, patch);
    else onAddResource(patch);

    setCreating(false);
    setEditing(null);
  }

  function sectionUsageLabel(resourceId: string) {
    const count = workshop.sections.filter((section) =>
      section.resourceIds.includes(resourceId)
    ).length;

    if (!count) return copy.usedNowhere;
    if (count === 1) return copy.usedInOneSection;
    return copy.usedInSections.replace("{count}", String(count));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          <Button
            variant={filter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            {copy.filterAll}
          </Button>
          {usedKinds.map((kind) => (
            <Button
              key={kind}
              variant={filter === kind ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter(kind)}
            >
              {copy.resourceKinds[kind]}
            </Button>
          ))}
        </div>

        <Button size="sm" onClick={openCreate}>
          <Plus />
          {copy.addResource}
        </Button>
      </div>

      {!resources.length ? (
        <Card>
          <CardContent className="p-4">
            <EmptyState
              title={copy.resourcesEmptyTitle}
              description={copy.resourcesEmptyDescription}
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus />
                  {copy.addResource}
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {resources.map((resource) => {
            const embedUrl = toCanvaEmbedUrl(resource.url);
            const showingPreview = previewId === resource.id;

            return (
              <Card key={resource.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{resource.title}</h3>
                        <Badge variant="secondary">
                          {copy.resourceKinds[resource.kind]}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {resourceHostname(resource.url)} · {sectionUsageLabel(resource.id)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {embedUrl && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={showingPreview ? copy.hidePreview : copy.preview}
                          title={showingPreview ? copy.hidePreview : copy.preview}
                          onClick={() =>
                            setPreviewId(showingPreview ? null : resource.id)
                          }
                        >
                          {showingPreview ? <EyeOff /> : <Eye />}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={copy.copyLink}
                        title={copy.copyLink}
                        onClick={() => onCopyLink(resource.url)}
                      >
                        <ClipboardCopy />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={copy.editResource}
                        title={copy.editResource}
                        onClick={() => openEdit(resource)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={copy.removeResource}
                        title={copy.removeResource}
                        onClick={() => onRemoveResource(resource.id)}
                      >
                        <Trash2 />
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {copy.openLink}
                          <ExternalLink />
                        </a>
                      </Button>
                    </div>
                  </div>

                  {resource.note && (
                    <p className="text-sm leading-6 text-muted-foreground">
                      {resource.note}
                    </p>
                  )}

                  {showingPreview && embedUrl && (
                    <div className="overflow-hidden rounded-[var(--sx-radius-card)] border border-border">
                      <iframe
                        src={embedUrl}
                        title={resource.title}
                        loading="lazy"
                        allowFullScreen
                        className="aspect-video w-full"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
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
            <DialogTitle>{editing ? copy.editResource : copy.newResource}</DialogTitle>
            <DialogDescription>{copy.resourcesDescription}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="resource-title">
                {copy.fieldTitle}
              </label>
              <Input
                id="resource-title"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="resource-kind">
                {copy.fieldKind}
              </label>
              <Select
                value={draft.kind}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    kind: value as WorkshopResourceKind,
                  }))
                }
              >
                <SelectTrigger id="resource-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKSHOP_RESOURCE_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {copy.resourceKinds[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="resource-url">
                {copy.fieldUrl}
              </label>
              <Input
                id="resource-url"
                inputMode="url"
                placeholder="https://www.canva.com/design/…/view"
                aria-invalid={draft.url.length > 0 && !urlValid}
                aria-describedby="resource-url-hint"
                value={draft.url}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, url: event.target.value }))
                }
              />
              <p
                id="resource-url-hint"
                className={
                  draft.url.length > 0 && !urlValid
                    ? "text-xs text-destructive"
                    : "text-xs text-muted-foreground"
                }
              >
                {draft.url.length > 0 && !urlValid ? copy.invalidUrl : copy.fieldUrlHint}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="resource-note">
                {copy.fieldResourceNote}
              </label>
              <Textarea
                id="resource-note"
                rows={3}
                value={draft.note}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, note: event.target.value }))
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
            <Button disabled={!draft.title.trim() || !urlValid} onClick={submit}>
              {editing ? copy.save : copy.addResource}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
