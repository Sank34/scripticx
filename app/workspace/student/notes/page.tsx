import RouteGuard from "@/components/RouteGuard";
import { NotesLibrary } from "@/components/workspaces/NotesLibrary";

export default function StudentNotesPage() {
  return (
    <RouteGuard requireAuth>
      <div className="h-full min-h-0 w-full overflow-y-auto bg-background [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <NotesLibrary />
      </div>
    </RouteGuard>
  );
}
