"use client";

import { Heart, MessageCircle, Share2, Trash2 } from "lucide-react";

import type { FeedPost } from "@/lib/api";
import { HighlightedCodeBlock } from "@/components/code/HighlightedCodeBlock";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MentionText } from "@/components/feed/MentionText";

type FeedPostCardLabels = {
  comment: string;
  deletePost: string;
  like: string;
  share: string;
};

type FeedPostCardProps = {
  commentCount: number;
  dateLocale: "en" | "ro";
  isLiked: boolean;
  isAdmin: boolean;
  labels: FeedPostCardLabels;
  likeCount: number;
  onAuthorOpen: (username: string) => void;
  onCommentsOpen: (postId: string) => void;
  onDelete: (post: FeedPost) => void;
  onShare: (postId: string) => void;
  onToggleLike: (postId: string) => void;
  post: FeedPost;
};

export function FeedPostCard({
  commentCount,
  dateLocale,
  isLiked,
  isAdmin,
  labels,
  likeCount,
  onAuthorOpen,
  onCommentsOpen,
  onDelete,
  onShare,
  onToggleLike,
  post,
}: FeedPostCardProps) {
  const username = post.profiles?.username || "User";
  const createdAt = post.created_at ? new Date(post.created_at) : null;
  const formattedDate =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? new Intl.DateTimeFormat(dateLocale === "ro" ? "ro-RO" : "en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(createdAt)
      : "";

  return (
    <Card className="relative gap-0 overflow-hidden rounded-2xl py-0 shadow-none ring-border/80 transition-shadow hover:shadow-sm">
      {isAdmin && (
        <button
          type="button"
          title={labels.deletePost}
          aria-label={labels.deletePost}
          onClick={() => onDelete(post)}
          className="absolute right-4 top-4 z-10 inline-flex size-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
        >
          <Trash2 className="size-4" />
        </button>
      )}

      <div
        role="link"
        tabIndex={0}
        onClick={() => onCommentsOpen(post.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onCommentsOpen(post.id);
          }
        }}
        className="cursor-pointer"
      >
        <CardHeader className="flex flex-row items-center gap-3 px-5 pb-0 pt-5 pr-14">
          <UserAvatar
            avatarUrl={post.profiles?.avatar_url}
            username={username}
            equippedRewards={post.profiles?.equipped_rewards}
          />

          <div className="min-w-0">
            <p
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onAuthorOpen(username);
              }}
              className="w-fit cursor-pointer truncate font-semibold hover:underline"
            >
              {username}
            </p>
            <p className="text-xs text-muted-foreground">
              {formattedDate}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-5 py-4">
          <MentionText
            content={post.content}
            className="whitespace-pre-wrap text-[15px] leading-6"
            onMentionOpen={onAuthorOpen}
          />

          {post.image_url && (
            // Feed images are uploaded by users, so plain img avoids extra remote image config.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image_url}
              alt=""
              className="mt-2 max-h-[460px] w-full rounded-xl border border-border object-cover"
            />
          )}

          {post.code && (
            <HighlightedCodeBlock code={post.code} />
          )}
        </CardContent>
      </div>

      <div className="grid grid-cols-3 border-t border-border/70 px-3 py-2 text-sm">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggleLike(post.id);
          }}
          aria-label={`${labels.like}: ${likeCount}`}
          className={`flex h-9 items-center justify-center gap-2 rounded-lg transition-colors hover:bg-accent ${
            isLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Heart
            size={16}
            className={`transition-transform duration-150 ${
              isLiked
                ? "fill-red-500 text-red-500 scale-110"
                : "scale-100"
            } active:scale-125`}
          />
          <span className="font-medium">{likeCount}</span>
        </button>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onCommentsOpen(post.id);
          }}
          aria-label={`${labels.comment}: ${commentCount}`}
          className="flex h-9 items-center justify-center gap-2 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <MessageCircle size={16} />
          <span className="font-medium">{commentCount}</span>
        </button>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onShare(post.id);
          }}
          aria-label={labels.share}
          className="flex h-9 items-center justify-center gap-2 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Share2 size={16} />
          <span>{labels.share}</span>
        </button>
      </div>
    </Card>
  );
}
