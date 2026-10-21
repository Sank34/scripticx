import { GroupsDirectory } from "@/components/groups/GroupsDirectory";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Study Groups",
  description: "Find programming study groups, discuss coding problems, share resources, and collaborate with other learners in dedicated channels on ScripticX.",
  path: "/groups",
  section: "Study Groups",
  keywords: ["programming study groups", "coding community", "collaborative learning", "programming discussions"],
});

export const dynamic = "force-dynamic";

export default function GroupsPage() {
  return <GroupsDirectory />;
}
