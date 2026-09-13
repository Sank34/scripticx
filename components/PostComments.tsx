"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { api, type ProfileSummary } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { MentionText } from "@/components/feed/MentionText";
import { UserAvatar } from "@/components/user/UserAvatar";
import {
  BackgroundQueryStatus,
  QuerySectionError,
} from "@/components/query/QueryStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type CommentProfile = Pick<
  ProfileSummary,
  "id" | "username" | "avatar_url" | "equipped_rewards"
>;

type PostComment = {
  content: string;
  created_at: string | null;
  id: string;
  post_id: string;
  profiles: CommentProfile | null;
  user_id: string;
};

type PostEngagement = {
  commentsCount: number;
  liked: boolean;
  likes: number;
};

export default function PostComments({ postId }: { postId: string }) {
  const { user, profile } = useAuth();
  const { locale, t } = useLanguage();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const commentsQueryKey = ["post", postId, "comments"] as const;

  const commentsQuery = useQuery<PostComment[]>({
    queryKey: commentsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, post_id, user_id, content, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((comment) => comment.user_id))];
      const { data: profiles, error: profilesError } = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url, equipped_rewards")
            .in("id", userIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;

      const profileById = new Map(
        (profiles || []).map((commentProfile) => [commentProfile.id, commentProfile])
      );

      return (data || []).map((comment) => ({
        ...comment,
        profiles: (profileById.get(comment.user_id) as CommentProfile | undefined) || null,
      })) as PostComment[];
    },
    enabled: Boolean(postId),
    staleTime: 60 * 1000,
  });

  const comments = commentsQuery.data || [];

  async function sendCommentNotification(commentId: string, message: string) {
    if (!user) return;

    try {
      const [{ data: post }, actor] = await Promise.all([
        supabase
          .from("posts")
          .select("user_id")
          .eq("id", postId)
          .maybeSingle(),
        profile ? Promise.resolve(profile) : api.profiles.getSummary(user.id),
      ]);

      if (!post?.user_id || post.user_id === user.id) return;

      await api.notifications.create({
        userId: post.user_id,
        actorId: user.id,
        type: "post_comment",
        title: `${actor?.username || t("post.userFallback")} ${t("post.commentedNotification")}`,
        body: message.slice(0, 140),
        href: `/post/${postId}`,
        metadata: {
          postId,
          commentId,
          username: actor?.username || null,
        },
      });
    } catch (error) {
      console.warn("Could not send comment notification:", error);
    }
  }

  const addCommentMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!user) throw new Error(t("post.signInToComment"));

      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content: message,
        })
        .select("id, post_id, user_id, content, created_at")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (comment) => {
      const optimisticComment: PostComment = {
        ...comment,
        profiles: profile
          ? {
              id: profile.id,
              username: profile.username,
              avatar_url: profile.avatar_url,
              equipped_rewards: profile.equipped_rewards,
            }
          : null,
      };

      queryClient.setQueryData<PostComment[]>(commentsQueryKey, (current = []) => [
        optimisticComment,
        ...current.filter((item) => item.id !== optimisticComment.id),
      ]);
      queryClient.setQueriesData<PostEngagement>(
        { queryKey: ["post", postId, "engagement"] },
        (current) =>
          current
            ? { ...current, commentsCount: current.commentsCount + 1 }
            : current
      );

      setContent("");
      void sendCommentNotification(comment.id, comment.content);
      void queryClient.invalidateQueries({ queryKey: commentsQueryKey });
      void queryClient.invalidateQueries({
        queryKey: ["post", postId, "engagement"],
      });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("post.commentError")
      );
    },
  });

  function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = content.trim();
    if (!message || !user || addCommentMutation.isPending) return;
    addCommentMutation.mutate(message);
  }

  return (
    <Card
      id="comments"
      className="scroll-mt-6 rounded-2xl shadow-none ring-border/80"
    >
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-4" />
            <h2 className="font-semibold">{t("post.comments")}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {comments.length}
            </span>
          </div>

          {comments.length > 0 && (
            <BackgroundQueryStatus
              cachedLabel={t("post.cached")}
              isError={commentsQuery.isError}
              isFetching={commentsQuery.isFetching}
              onRetry={() => void commentsQuery.refetch()}
              refreshingLabel={t("post.refreshing")}
              retryLabel={t("post.retry")}
            />
          )}
        </div>

        <form onSubmit={submitComment} className="flex items-center gap-2">
          {user && (
            <UserAvatar
              avatarUrl={profile?.avatar_url}
              username={profile?.username}
              email={user.email}
              equippedRewards={profile?.equipped_rewards}
              className="hidden size-9 sm:flex"
            />
          )}
          <Input
            placeholder={
              user ? t("post.writeComment") : t("post.signInToComment")
            }
            value={content}
            disabled={!user || addCommentMutation.isPending}
            onChange={(event) => setContent(event.target.value)}
            className="h-10 rounded-full"
          />
          <Button
            type="submit"
            disabled={!user || !content.trim() || addCommentMutation.isPending}
            className="h-10 rounded-full px-4"
          >
            {addCommentMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span className="hidden sm:inline">{t("post.send")}</span>
          </Button>
        </form>

        {commentsQuery.isPending && comments.length === 0 && (
          <div className="space-y-4" aria-busy="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2 rounded-xl bg-muted/40 p-3">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {commentsQuery.isError && comments.length === 0 && (
          <QuerySectionError
            title={t("post.commentsError")}
            description={t("post.commentsErrorDescription")}
            retryLabel={t("post.retry")}
            onRetry={() => void commentsQuery.refetch()}
            className="py-8"
          />
        )}

        {!commentsQuery.isPending && !commentsQuery.isError && comments.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/25 px-4 py-8 text-center">
            <MessageCircle className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">{t("post.noComments")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("post.noCommentsDescription")}
            </p>
          </div>
        )}

        {comments.length > 0 && (
          <div className="space-y-4">
            {comments.map((comment) => {
              const username =
                comment.profiles?.username || t("post.userFallback");
              const createdAt = comment.created_at
                ? new Date(comment.created_at)
                : null;
              const formattedDate =
                createdAt && !Number.isNaN(createdAt.getTime())
                  ? new Intl.DateTimeFormat(
                      locale === "ro" ? "ro-RO" : "en-US",
                      { dateStyle: "medium", timeStyle: "short" }
                    ).format(createdAt)
                  : "";

              return (
                <div key={comment.id} className="flex items-start gap-3">
                  {comment.profiles?.username ? (
                    <Link href={`/u/${comment.profiles.username}`}>
                      <UserAvatar
                        avatarUrl={comment.profiles.avatar_url}
                        username={username}
                        equippedRewards={comment.profiles.equipped_rewards}
                        className="size-8 cursor-pointer"
                      />
                    </Link>
                  ) : (
                    <UserAvatar username={username} className="size-8" />
                  )}

                  <div className="min-w-0 flex-1 rounded-xl bg-muted/55 px-3.5 py-2.5 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      {comment.profiles?.username ? (
                        <Link
                          href={`/u/${comment.profiles.username}`}
                          className="font-semibold hover:underline"
                        >
                          {username}
                        </Link>
                      ) : (
                        <span className="font-semibold">{username}</span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {formattedDate}
                      </span>
                    </div>
                    <MentionText
                      content={comment.content}
                      className="mt-1 whitespace-pre-wrap leading-5 text-foreground/85"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
