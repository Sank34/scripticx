"use client";

import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { use } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

import { UserAvatar } from "@/components/user/UserAvatar";
import { HighlightedCodeBlock } from "@/components/code/HighlightedCodeBlock";
import { MentionText } from "@/components/feed/MentionText";
import PostComments from "@/components/PostComments";

import { Heart, MessageCircle, Share2 } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

type PostDetailData = {
  post: any;
  profile: any;
  likes: number;
  liked: boolean;
  commentsCount: number;
};

function ClientPost({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { locale } = useLanguage();
  const postQueryKey = ["post", id, user?.id || "anonymous"] as const;

  const t = (key: string) => {
    const keys = key.split(".");
    let value: any = translations[locale];
    for (const k of keys) value = value?.[k];

    if (value) return value;

    let fallback: any = translations["en"];
    for (const k of keys) fallback = fallback?.[k];

    return fallback || key;
  };

  const { data: postDetail, isPending: loading } = useQuery({
    queryKey: postQueryKey,
    queryFn: async (): Promise<PostDetailData | null> => {
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (postError) throw postError;

      if (!postData) return null;

      const [profileResult, likesResult, commentsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, avatar_url, equipped_rewards")
          .eq("id", postData.user_id)
          .maybeSingle(),
        supabase
          .from("post_likes")
          .select("user_id")
          .eq("post_id", id),
        supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("post_id", id),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (likesResult.error) throw likesResult.error;
      if (commentsResult.error) throw commentsResult.error;

      return {
        post: postData,
        profile: profileResult.data,
        likes: likesResult.data?.length || 0,
        liked: Boolean(
          user && likesResult.data?.some((like) => like.user_id === user.id)
        ),
        commentsCount: commentsResult.count || 0,
      };
    },
    enabled: Boolean(id) && !authLoading,
    staleTime: 2 * 60 * 1000,
  });
  const post = postDetail?.post || null;
  const profile = postDetail?.profile || null;
  const likes = postDetail?.likes || 0;
  const liked = postDetail?.liked || false;
  const commentsCount = postDetail?.commentsCount || 0;

  async function toggleLike() {
    if (!user || !post) return;

    try {
      await api.feed.toggleLike(post.id, user.id, liked);
      queryClient.setQueryData<PostDetailData | null>(postQueryKey, (current) =>
        current
          ? {
              ...current,
              liked: !liked,
              likes: Math.max(0, current.likes + (liked ? -1 : 1)),
            }
          : current
      );
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("post.likeError"));
    }
  }

  async function handleShare() {
    if (!post) return;
    const url = `${window.location.origin}/post/${post.id}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("post.linkCopied"));
  }

  if (loading) {
    return <PostSkeleton />;
  }

  if (!post) {
    return (
      <EmptyState
        className="p-6"
        title={t("post.notFound")}
        description={t("post.notFoundDescription")}
      />
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">

          <UserAvatar
            avatarUrl={profile?.avatar_url}
            username={profile?.username}
            equippedRewards={profile?.equipped_rewards}
          />

          <div>
            <Link href={`/u/${profile?.username}`}>
              <p className="font-medium hover:underline">
                {profile?.username || t("post.userFallback")}
              </p>
            </Link>

            <p className="text-xs text-muted-foreground">
              {new Date(post.created_at).toLocaleString()}
            </p>
          </div>

        </CardHeader>

        <CardContent className="space-y-3">
          <MentionText
            content={post.content}
            className="whitespace-pre-wrap"
          />

          {post.image_url && (
            <img
              src={post.image_url}
              alt=""
              className="rounded-lg max-h-[400px] object-cover w-full"
            />
          )}

          {post.code && (
            <HighlightedCodeBlock code={post.code} />
          )}
        </CardContent>

        <div className="px-6 pb-4 flex items-center gap-4 text-sm">
          <button
            onClick={toggleLike}
            className="flex items-center gap-1 hover:opacity-80"
          >
            <Heart
              size={16}
              className={`transition-transform duration-150 ${
                liked
                  ? "fill-red-500 text-red-500 scale-110"
                  : "scale-100"
              } active:scale-125`}
            />
            <span>{likes}</span>
          </button>

          <div className="flex items-center gap-1">
            <MessageCircle size={16} />
            <span>{commentsCount}</span>
          </div>

          <button
            onClick={handleShare}
            className="flex items-center gap-1 hover:opacity-80 active:scale-95 transition-transform duration-150"
          >
            <Share2
              size={16}
              className="transition-transform duration-150 active:scale-125"
            />
            <span>{t("post.share")}</span>
          </button>
        </div>
      </Card>

      <PostComments postId={post.id} />

    </div>
  );
}

export default function PostPage(props: any) {
  return <ClientPost {...props} />;
}

function PostSkeleton() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-36 w-full" />
        </CardContent>

        <div className="flex gap-4 px-6 pb-4">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
