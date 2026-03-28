"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import PostComments from "@/components/PostComments";

import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function ClientPost({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [post, setPost] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);

  useEffect(() => {
    async function load() {
      const { id } = await params;

      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!postData) return;

      setPost(postData);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", postData.user_id)
        .maybeSingle();

      setProfile(profileData);

      const { data: likesData } = await supabase
        .from("post_likes")
        .select("user_id")
        .eq("post_id", id);

      setLikes(likesData?.length || 0);

      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        setLiked(
          likesData?.some((l: any) => l.user_id === user.id) || false
        );
      }

      const { data: commentsData } = await supabase
        .from("comments")
        .select("id")
        .eq("post_id", id);

      setCommentsCount(commentsData?.length || 0);
    }

    load();
  }, []);

  async function toggleLike() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user || !post) return;

    if (liked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);

      setLikes((l) => l - 1);
      setLiked(false);
    } else {
      await supabase.from("post_likes").insert({
        post_id: post.id,
        user_id: user.id,
      });

      setLikes((l) => l + 1);
      setLiked(true);
    }
  }

  async function handleShare() {
    if (!post) return;
    const url = `${window.location.origin}/post/${post.id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  }

  if (!post) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">

          <Avatar>
            {profile?.avatar_url && (
              <AvatarImage src={profile.avatar_url} />
            )}
            <AvatarFallback>
              {(profile?.username || "U")[0]}
            </AvatarFallback>
          </Avatar>

          <div>
            <Link href={`/u/${profile?.username}`}>
              <p className="font-medium hover:underline">
                {profile?.username || "User"}
              </p>
            </Link>

            <p className="text-xs text-muted-foreground">
              {new Date(post.created_at).toLocaleString()}
            </p>
          </div>

        </CardHeader>

        <CardContent className="space-y-3">
          <p className="whitespace-pre-wrap">{post.content}</p>

          {post.image_url && (
            <img
              src={post.image_url}
              className="rounded-lg max-h-[400px] object-cover w-full"
            />
          )}

          {post.code && (
            <pre className="bg-muted p-3 rounded text-sm overflow-auto font-mono">
              {post.code}
            </pre>
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
            <span>Share</span>
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