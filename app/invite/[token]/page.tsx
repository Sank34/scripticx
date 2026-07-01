import { GroupInviteLanding } from "@/components/groups/GroupInviteLanding";

export const dynamic = "force-dynamic";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  return <GroupInviteLanding token={token} />;
}
