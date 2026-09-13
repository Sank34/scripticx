import RouteGuard from "@/components/RouteGuard";
import { WhiteboardRouteEntry } from "@/components/workspaces/WhiteboardLibrary";

export default function StudentWhiteboardPage() {
  return (
    <RouteGuard requireAuth>
      <div className="h-full min-h-0 w-full overflow-hidden bg-background">
        <WhiteboardRouteEntry />
      </div>
    </RouteGuard>
  );
}
