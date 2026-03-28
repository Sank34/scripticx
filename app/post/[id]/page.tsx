import { createServerSupabase } from "@/lib/supabaseServer";
import ClientPost from "@/app/post/[id]/ClientPost";

export async function generateMetadata({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const supabase = createServerSupabase();

  const resolvedParams = await params;
  const { id } = resolvedParams;

  const { data: post } = await supabase
    .from("posts")
    .select("content, image_url, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!post) return { title: "Post not found" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", post.user_id)
    .maybeSingle();

  const title = `${profile?.username || "User"} on ScripticX`;
  const description = post.content?.slice(0, 120) || "View post";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: post.image_url
        ? [post.image_url]
        : profile?.avatar_url
        ? [profile.avatar_url]
        : [],
    },
  };
}

export default function PostPage(props: { params: { id: string } }) {
  return <ClientPost {...props} />;
}
