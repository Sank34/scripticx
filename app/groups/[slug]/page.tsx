import { GroupWorkspace } from "@/components/groups/GroupWorkspace";

export const dynamic = "force-dynamic";

type GroupPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function GroupPage({ params }: GroupPageProps) {
  const { slug } = await params;

  return <GroupWorkspace slug={slug} />;
}
