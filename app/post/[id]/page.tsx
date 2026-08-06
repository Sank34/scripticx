import type { Metadata } from "next";
import { cache } from "react";

import { createServerSupabase } from "@/lib/supabaseServer";
import ClientPost from "@/app/post/[id]/ClientPost";
import type { FeedPost, ProfileSummary } from "@/lib/api";
import {
  createNotFoundMetadata,
  createPageMetadata,
  metadataExcerpt,
} from "@/lib/metadata";

type PostPreview = {
  post: FeedPost | null;
  profile: ProfileSummary | null;
};

const getPostPreview = cache(async (id: string): Promise<PostPreview> => {
  const supabase = createServerSupabase();
  const { data: post } = await supabase
    .from("posts")
    .select("id, user_id, content, code, image_url, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!post) return { post: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, equipped_rewards")
    .eq("id", post.user_id)
    .maybeSingle();

  return {
    post: post as FeedPost,
    profile: (profile as ProfileSummary | null) || null,
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const { post, profile } = await getPostPreview(id);

  if (!post) return createNotFoundMetadata("Post");

  const username = profile?.username || "ScripticX member";
  const title = `Post by ${username}`;

  return createPageMetadata({
    title,
    description: metadataExcerpt(
      post.content,
      `Discover a post published by ${username} in the ScripticX programming community.`
    ),
    path: `/post/${id}`,
    image: post.image_url || null,
    type: "article",
    keywords: ["programming community", "ScripticX post", username],
  });
}

export default function PostPage(props: { params: Promise<{ id: string }> }) {
  return <PostPageContent {...props} />;
}

async function PostPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const preview = await getPostPreview(id);

  return (
    <ClientPost
      id={id}
      initialPost={preview.post}
      initialProfile={preview.profile}
    />
  );
}
