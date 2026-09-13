"use client";

import { useParams } from "next/navigation";

import RouteGuard from "@/components/RouteGuard";
import { MarkdownNoteEditor } from "@/components/workspaces/MarkdownNoteEditor";

export default function StudentNotePage() {
  const params = useParams<{ id: string }>();

  return (
    <RouteGuard requireAuth>
      <div className="h-full min-h-0 w-full overflow-hidden bg-background">
        <MarkdownNoteEditor noteId={params.id} />
      </div>
    </RouteGuard>
  );
}
