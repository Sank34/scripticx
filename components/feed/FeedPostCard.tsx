"use client";

import Link from "next/link";
import { Code2, Heart, MessageCircle, Share2 } from "lucide-react";

import type { FeedPost } from "@/lib/api";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type FeedPostCardLabels = {
  share: string;
};

type FeedPostCardProps = {
  commentCount: number;
  isLiked: boolean;
  labels: FeedPostCardLabels;
  likeCount: number;
  onAuthorOpen: (username: string) => void;
  onCommentsOpen: (postId: string) => void;
  onShare: (postId: string) => void;
  onToggleLike: (postId: string) => void;
  post: FeedPost;
};

export function FeedPostCard({
  commentCount,
  isLiked,
  labels,
  likeCount,
  onAuthorOpen,
  onCommentsOpen,
  onShare,
  onToggleLike,
  post,
}: FeedPostCardProps) {
  const username = post.profiles?.username || "User";

  return (
    <Card className="hover:shadow-sm transition">
      <Link href={`/post/${post.id}`}>
        <CardHeader className="flex flex-row items-center gap-3 cursor-pointer">
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

        <CardContent className="space-y-3 cursor-pointer pt-4">
          <p className="whitespace-pre-wrap">{post.content}</p>

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
            <pre className="bg-muted p-3 rounded text-sm overflow-auto font-mono">
              <Code2 className="mb-2 h-4 w-4 text-muted-foreground" />
              {post.code}
            </pre>
          )}
        </CardContent>
      </Link>

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
