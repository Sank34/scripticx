import { GroupWorkspace } from "@/components/groups/GroupWorkspace";
import { getStudyGroupMetadata } from "@/lib/server/groupMetadata";

export const dynamic = "force-dynamic";

type GroupPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ channel?: string | string[] }>;
};

export async function generateMetadata({ params, searchParams }: GroupPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  return getStudyGroupMetadata(slug, typeof query.channel === "string" ? query.channel : undefined);
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { slug } = await params;

  return <GroupWorkspace slug={slug} />;
}
