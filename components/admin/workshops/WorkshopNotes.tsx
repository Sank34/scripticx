"use client";

import { useState } from "react";
import { Check, RotateCcw, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Workshop, WorkshopComment } from "@/lib/trainer-portal";
import type { TrainerPortalCopy } from "@/lib/trainer-portal-copy";
import { cn } from "@/lib/utils";

export function WorkshopNotes({
  author,
  copy,
  locale,
  onAddComment,
  onRemoveComment,
  onUpdateComment,
  workshop,
}: {
  author: string;
  copy: TrainerPortalCopy;
  locale: "en" | "ro";
  onAddComment: (draft: Partial<WorkshopComment>) => void;
  onRemoveComment: (commentId: string) => void;
  onUpdateComment: (commentId: string, patch: Partial<WorkshopComment>) => void;
  workshop: Workshop;
}) {
  const [body, setBody] = useState("");

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;

    onAddComment({ author, body: trimmed });
    setBody("");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <label className="text-sm font-medium" htmlFor="workshop-note">
            {copy.notesTitle}
          </label>
          <Textarea
            id="workshop-note"
            rows={3}
            placeholder={copy.notePlaceholder}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{copy.notesDescription}</p>
            <Button size="sm" disabled={!body.trim()} onClick={submit}>
              {copy.addNote}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!workshop.comments.length ? (
        <Card>
          <CardContent className="p-4">
            <EmptyState
              title={copy.notesEmptyTitle}
              description={copy.notesEmptyDescription}
            />
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {workshop.comments.map((comment) => (
            <li key={comment.id}>
              <Card className={cn(comment.resolved && "opacity-70")}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{comment.author}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString(
                          locale === "ro" ? "ro-RO" : "en-US",
                          { dateStyle: "medium", timeStyle: "short" }
                        )}
                      </span>
                      {comment.resolved && (
                        <Badge variant="secondary">{copy.handled}</Badge>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={comment.resolved ? copy.reopen : copy.resolve}
                        title={comment.resolved ? copy.reopen : copy.resolve}
                        onClick={() =>
                          onUpdateComment(comment.id, { resolved: !comment.resolved })
                        }
                      >
                        {comment.resolved ? <RotateCcw /> : <Check />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={copy.removeNote}
                        title={copy.removeNote}
                        onClick={() => onRemoveComment(comment.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  <p
                    className={cn(
                      "text-sm leading-6 whitespace-pre-wrap",
                      comment.resolved && "text-muted-foreground"
                    )}
                  >
                    {comment.body}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
