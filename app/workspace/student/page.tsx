import RouteGuard from "@/components/RouteGuard";
import { StudentWorkspaceHome } from "@/components/workspaces/StudentWorkspaceHome";

export default function StudentWorkspacePage() {
  return (
    <RouteGuard requireAuth>
      <div data-tour="student-overview"><StudentWorkspaceHome /></div>
    </RouteGuard>
  );
}
