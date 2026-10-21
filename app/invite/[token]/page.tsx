import { GroupInviteLanding } from "@/components/groups/GroupInviteLanding";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Group Invitation",
  description: "You've been invited to a ScripticX study group. Sign in to review the invitation and join your group's programming discussions.",
  path: "/groups",
  section: "Group Invitation",
  noIndex: true,
});

export const dynamic = "force-dynamic";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  return <GroupInviteLanding token={token} />;
}
