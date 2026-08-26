import RouteGuard from "@/components/RouteGuard";
import { StudentPlanner } from "@/components/workspaces/StudentPlanner";

export default function StudentCalendarPage() {
  return (
    <RouteGuard requireAuth>
      <div className="note-scrollbar h-full min-h-0 w-full overflow-y-auto bg-background">
        <StudentPlanner />
      </div>
    </RouteGuard>
  );
}
