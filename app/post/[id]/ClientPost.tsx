"use client";

import Link from "next/link";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Heart,
  MessageCircle,
  Share2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import {
  api,
  type FeedData,
  type FeedPost,
  type ProfileSummary,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { UserAvatar } from "@/components/user/UserAvatar";
import { HighlightedCodeBlock } from "@/components/code/HighlightedCodeBlock";
import { MentionText } from "@/components/feed/MentionText";
import PostComments from "@/components/PostComments";
import { PostDetailSkeleton } from "@/components/post/PostDetailSkeleton";
import {
  BackgroundQueryStatus,
  QuerySectionError,
} from "@/components/query/QueryStatus";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PostEngagement = {
  commentsCount: number;
  liked: boolean;
  likes: number;
};

type ClientPostProps = {
  id: string;
  initialPost: FeedPost | null;
  initialProfile: ProfileSummary | null;
};

function findCachedFeedPost(queryClient: QueryClient, postId: string) {
  const feeds = queryClient.getQueriesData<FeedData>({ queryKey: ["feed"] });

  for (const [, feed] of feeds) {
    const post = feed?.posts.find((candidate) => candidate.id === postId);
    if (post) return post;
  }

  return undefined;
}

export default function ClientPost({
  id,
  initialPost,
  initialProfile,
}: ClientPostProps) {
  const { user, loading: authLoading } = useAuth();
  const { locale, t } = useLanguage();
  const queryClient = useQueryClient();
  const cachedFeedPost = findCachedFeedPost(queryClient, id);

  const postQuery = useQuery<FeedPost | null>({
    queryKey: ["post", id, "detail"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, user_id, content, code, image_url, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as FeedPost | null) || null;
    },
    initialData: () => initialPost || cachedFeedPost,
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
    refetchOnMount: "always",
  });

  const post = postQuery.data || null;

  const authorQuery = useQuery<ProfileSummary | null>({
    queryKey: ["post", id, "author", post?.user_id],
    queryFn: async () => {
      if (!post?.user_id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, equipped_rewards")
        .eq("id", post.user_id)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileSummary | null) || null;
    },
    initialData: () => initialProfile || cachedFeedPost?.profiles || undefined,
    enabled: Boolean(post?.user_id),
    staleTime: 5 * 60 * 1000,
  });

  const engagementQueryKey = [
    "post",
    id,
    "engagement",
    user?.id || "anonymous",
  ] as const;
  const engagementQuery = useQuery<PostEngagement>({
    queryKey: engagementQueryKey,
    queryFn: async () => {
      const likedPromise = user
        ? supabase
            .from("post_likes")
            .select("user_id")
            .eq("post_id", id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null });

      const [likesResult, commentsResult, likedResult] = await Promise.all([
        supabase
          .from("post_likes")
          .select("user_id", { count: "exact", head: true })
          .eq("post_id", id),
        supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("post_id", id),
        likedPromise,
      ]);

      if (likesResult.error) throw likesResult.error;
      if (commentsResult.error) throw commentsResult.error;
      if (likedResult.error) throw likedResult.error;

      return {
        likes: likesResult.count || 0,
        commentsCount: commentsResult.count || 0,
        liked: Boolean(likedResult.data),
      };
    },
    enabled: Boolean(id) && !authLoading,
    staleTime: 60 * 1000,
  });

  const profile = authorQuery.data || null;
  const engagement = engagementQuery.data;
  const createdAt = post?.created_at ? new Date(post.created_at) : null;
  const formattedDate =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-US", {
          dateStyle: "long",
          timeStyle: "short",
        }).format(createdAt)
      : "";

  async function toggleLike() {
    if (!user || !post || !engagement) return;

    const previous = engagement;
    queryClient.setQueryData<PostEngagement>(engagementQueryKey, {
      ...engagement,
      liked: !engagement.liked,
      likes: Math.max(0, engagement.likes + (engagement.liked ? -1 : 1)),
    });

    try {
      await api.feed.toggleLike(post.id, user.id, engagement.liked);
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    } catch (error) {
      queryClient.setQueryData(engagementQueryKey, previous);
      toast.error(error instanceof Error ? error.message : t("post.likeError"));
    } finally {
      void queryClient.invalidateQueries({ queryKey: engagementQueryKey });
    }
  }

  async function handleShare() {
    if (!post) return;
    const url = `${window.location.origin}/post/${post.id}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("post.linkCopied"));
  }

  if (postQuery.isPending && !post) {
    return <PostDetailSkeleton />;
  }

  if (postQuery.isError && !post) {
    return (
      <div className="mx-auto w-full max-w-3xl py-10">
        <QuerySectionError
          title={t("post.loadError")}
          description={t("post.loadErrorDescription")}
          retryLabel={t("post.retry")}
          onRetry={() => void postQuery.refetch()}
        />
      </div>
    );
  }

  if (!post) {
    return (
      <EmptyState
        className="p-10"
        title={t("post.notFound")}
        description={t("post.notFoundDescription")}
      />
    );
  }

  const username = profile?.username || t("post.userFallback");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 rounded-full">
          <Link href="/feed">
            <ArrowLeft className="size-4" />
            {t("post.backToFeed")}
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <BackgroundQueryStatus
            cachedLabel={t("post.cached")}
            isError={postQuery.isError}
            isFetching={postQuery.isFetching}
            onRetry={() => void postQuery.refetch()}
            refreshingLabel={t("post.refreshing")}
            retryLabel={t("post.retry")}
          />
          <Button type="button" variant="outline" size="sm" onClick={handleShare} className="rounded-full">
            <Share2 className="size-4" />
            {t("post.share")}
          </Button>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-5">
          <article>
            <Card className="gap-0 overflow-hidden rounded-2xl py-0 shadow-none ring-border/80">
              <CardHeader className="flex flex-row items-center gap-3 px-5 pb-0 pt-5">
                {authorQuery.isPending && !profile ? (
                  <>
                    <Skeleton className="size-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </>
                ) : (
                  <>
                    <UserAvatar
                      avatarUrl={profile?.avatar_url}
                      username={username}
                      equippedRewards={profile?.equipped_rewards}
                      className="size-10"
                    />
                    <div className="min-w-0">
                      {profile?.username ? (
                        <Link href={`/u/${profile.username}`} className="block w-fit truncate font-semibold hover:underline">
                          {username}
                        </Link>
                      ) : (
                        <p className="font-semibold">{username}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{formattedDate}</p>
                    </div>
                  </>
                )}
              </CardHeader>

              <CardContent className="space-y-4 px-5 py-5">
                <MentionText
                  content={post.content}
                  className="whitespace-pre-wrap text-[15px] leading-6"
                />

                {post.image_url && (
                  // User uploads can come from different storage origins.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.image_url}
                    alt=""
                    className="max-h-[560px] w-full rounded-xl border border-border object-cover"
                  />
                )}

                {post.code && <HighlightedCodeBlock code={post.code} />}
              </CardContent>

              <div className="grid grid-cols-3 border-t border-border/70 px-3 py-2 text-sm">
                <button
                  type="button"
                  onClick={toggleLike}
                  disabled={!user || !engagement || engagementQuery.isPending}
                  aria-label={t("post.like")}
                  className={`flex h-9 items-center justify-center gap-2 rounded-lg transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 ${
                    engagement?.liked
                      ? "text-red-500"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart
                    className={`size-4 transition-transform ${
                      engagement?.liked ? "scale-110 fill-current" : ""
                    }`}
                  />
                  {engagementQuery.isPending ? (
                    <Skeleton className="h-4 w-5" />
                  ) : (
                    <span className="font-medium">{engagement?.likes || 0}</span>
                  )}
                </button>

                <a
                  href="#comments"
                  className="flex h-9 items-center justify-center gap-2 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <MessageCircle className="size-4" />
                  {engagementQuery.isPending ? (
                    <Skeleton className="h-4 w-5" />
                  ) : (
                    <span className="font-medium">{engagement?.commentsCount || 0}</span>
                  )}
                </a>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex h-9 items-center justify-center gap-2 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Share2 className="size-4" />
                  <span>{t("post.share")}</span>
                </button>
              </div>
            </Card>
          </article>

          <PostComments postId={post.id} />
        </div>

        <aside className="hidden space-y-4 xl:sticky xl:top-6 xl:block">
          <Card className="rounded-2xl shadow-none ring-border/80">
            <CardContent className="space-y-4 text-center">
              {authorQuery.isPending && !profile ? (
                <>
                  <Skeleton className="mx-auto size-16 rounded-full" />
                  <Skeleton className="mx-auto h-4 w-28" />
                  <Skeleton className="h-8 w-full rounded-lg" />
                </>
              ) : (
                <>
                  <UserAvatar
                    avatarUrl={profile?.avatar_url}
                    username={username}
                    equippedRewards={profile?.equipped_rewards}
                    className="mx-auto size-16"
                  />
                  <div>
                    <p className="font-semibold">{username}</p>
                    <p className="text-xs text-muted-foreground">{t("post.author")}</p>
                  </div>
                  {profile?.username && (
                    <Button asChild variant="outline" size="sm" className="w-full rounded-xl">
                      <Link href={`/u/${profile.username}`}>
                        <UserRound className="size-4" />
                        {t("post.viewProfile")}
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-muted/35 shadow-none ring-border/70">
            <CardContent className="space-y-3">
              <p className="text-sm font-semibold">{t("post.details")}</p>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <CalendarDays className="mt-0.5 size-4 shrink-0" />
                <span>{formattedDate}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border bg-background/70 p-2.5 text-center">
                  <p className="font-semibold text-foreground">{engagement?.likes || 0}</p>
                  <p className="text-[11px]">{t("post.likes")}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/70 p-2.5 text-center">
                  <p className="font-semibold text-foreground">{engagement?.commentsCount || 0}</p>
                  <p className="text-[11px]">{t("post.comments")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
