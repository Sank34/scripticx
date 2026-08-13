import RouteGuard from "@/components/RouteGuard";
import { GraphVisualizer } from "@/components/workspaces/GraphVisualizer";

export default function StudentGraphPage() {
  return (
    <RouteGuard requireAuth>
      <div className="h-full min-h-0 w-full overflow-hidden bg-background">
        <GraphVisualizer />
      </div>
    </RouteGuard>
  );
}
