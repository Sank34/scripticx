import type { Metadata } from "next";

import { createServerSupabase } from "@/lib/supabaseServer";
import ClientPost from "@/app/post/[id]/ClientPost";
import {
  createNotFoundMetadata,
  createPageMetadata,
  metadataExcerpt,
} from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const supabase = createServerSupabase();

  const resolvedParams = await params;
  const { id } = resolvedParams;

  const { data: post } = await supabase
    .from("posts")
    .select("content, image_url, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!post) return createNotFoundMetadata("Postarea");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", post.user_id)
    .maybeSingle();

  const username = profile?.username || "Membru ScripticX";
  const title = `Postare de ${username}`;

  return createPageMetadata({
    title,
    description: metadataExcerpt(
      post.content,
      `Descoperă o postare publicată de ${username} în comunitatea ScripticX.`
    ),
    path: `/post/${id}`,
    image: post.image_url || null,
    type: "article",
    keywords: ["comunitate programare", "postare ScripticX", username],
  });
}

export default function PostPage(props: { params: Promise<{ id: string }> }) {
  return <ClientPost {...props} />;
}
