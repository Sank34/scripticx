"use client";

import { Heart, MessageCircle, Share2, Trash2 } from "lucide-react";

import type { FeedPost } from "@/lib/api";
import { HighlightedCodeBlock } from "@/components/code/HighlightedCodeBlock";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MentionText } from "@/components/feed/MentionText";

type FeedPostCardLabels = {
  deletePost: string;
  share: string;
};

type FeedPostCardProps = {
  commentCount: number;
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

  return (
    <Card className="relative transition hover:shadow-sm">
      {isAdmin && (
        <button
          type="button"
          title={labels.deletePost}
          aria-label={labels.deletePost}
          onClick={() => onDelete(post)}
          className="absolute right-4 top-4 z-10 inline-flex size-8 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
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
        <CardHeader className="flex flex-row items-center gap-3 pr-14">
          <UserAvatar
            avatarUrl={post.profiles?.avatar_url}
            username={username}
          />

          <div>
            <p
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onAuthorOpen(username);
              }}
              className="font-medium hover:underline cursor-pointer"
            >
              {username}
            </p>
            <p className="text-xs text-muted-foreground">
              {post.created_at ? new Date(post.created_at).toLocaleString() : ""}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-4">
          <MentionText
            content={post.content}
            className="whitespace-pre-wrap"
            onMentionOpen={onAuthorOpen}
          />

          {post.image_url && (
            // Feed images are uploaded by users, so plain img avoids extra remote image config.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image_url}
              alt=""
              className="rounded-lg max-h-[400px] object-cover w-full mt-2"
            />
          )}

          {post.code && (
            <HighlightedCodeBlock code={post.code} />
          )}
        </CardContent>
      </div>

      <div className="px-6 pb-5 pt-1 flex items-center gap-4 text-sm">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggleLike(post.id);
          }}
          className="flex items-center gap-1 hover:opacity-80"
        >
          <Heart
            size={16}
            className={`transition-transform duration-150 ${
              isLiked
                ? "fill-red-500 text-red-500 scale-110"
                : "scale-100"
            } active:scale-125`}
          />
          <span>{likeCount}</span>
        </button>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onCommentsOpen(post.id);
          }}
          className="flex items-center gap-1 hover:opacity-80"
        >
          <MessageCircle size={16} />
          <span>{commentCount}</span>
        </button>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onShare(post.id);
          }}
          className="flex items-center gap-1 hover:opacity-80"
        >
          <Share2 size={16} />
          <span>{labels.share}</span>
        </button>
      </div>
    </Card>
  );
}
