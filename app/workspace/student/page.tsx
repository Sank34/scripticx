import RouteGuard from "@/components/RouteGuard";
import { StudentWorkspaceHome } from "@/components/workspaces/StudentWorkspaceHome";

export default function StudentWorkspacePage() {
  return (
    <RouteGuard requireAuth>
      <StudentWorkspaceHome />
    </RouteGuard>
  );
}
