"use client";

import { useParams } from "next/navigation";

import RouteGuard from "@/components/RouteGuard";
import { WhiteboardCanvas } from "@/components/workspaces/WhiteboardCanvas";

export default function StudentWhiteboardDocumentPage() {
  const params = useParams<{ id: string }>();

  return (
    <RouteGuard requireAuth>
      <div className="h-full min-h-0 w-full overflow-hidden bg-background">
        <WhiteboardCanvas whiteboardId={params.id} />
      </div>
    </RouteGuard>
  );
}
