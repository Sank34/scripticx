"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/UserAvatar";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

export default function PostComments({ postId }: { postId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [content, setContent] = useState("");

  const { locale } = useLanguage();

  const t = (key: string) => {
    const keys = key.split(".");
    let value: any = translations[locale];
    for (const k of keys) value = value?.[k];

    if (value) return value;

    let fallback: any = translations["en"];
    for (const k of keys) fallback = fallback?.[k];

    return fallback || key;
  };

  const commentsQueryKey = ["post", postId, "comments"] as const;
  const { data: comments = [] } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
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
        (profiles || []).map((profile) => [profile.id, profile])
      );
      return (data || []).map((comment) => ({
        ...comment,
        profiles: profileById.get(comment.user_id) || null,
      }));
    },
    enabled: Boolean(postId),
    staleTime: 60 * 1000,
  });

  async function addComment() {
    if (!content.trim() || !user) return;

    const { data: comment, error } = await supabase
      .from("comments")
      .insert({
          post_id: postId,
          user_id: user.id,
          content,
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      console.error(error);
      return;
    }

    const [{ data: post }, actor] = await Promise.all([
      supabase
        .from("posts")
        .select("user_id, content")
        .eq("id", postId)
        .maybeSingle(),
      api.profiles.getSummary(user.id),
    ]);

    if (post?.user_id && post.user_id !== user.id) {
      await api.notifications.create({
        userId: post.user_id,
        actorId: user.id,
        type: "post_comment",
        title: `${actor?.username || "Someone"} commented on your post`,
        body: content.trim().slice(0, 140),
        href: `/post/${postId}`,
        metadata: {
          postId,
          commentId: comment.id,
          username: actor?.username || null,
        },
      });
    }

    setContent("");
    await queryClient.invalidateQueries({ queryKey: ["post", postId] });
  }

  return (
    <div className="space-y-4">

      <div className="flex gap-2">
        <Input
          placeholder={t("post.writeComment")}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="rounded-full"
        />

        <Button onClick={addComment}>{t("post.send")}</Button>
      </div>

      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-3">
            <Link href={`/u/${c.profiles?.username}`}>
              <UserAvatar
                avatarUrl={c.profiles?.avatar_url}
                username={c.profiles?.username}
                equippedRewards={c.profiles?.equipped_rewards}
                className="w-8 h-8 cursor-pointer"
              />
            </Link>
            <div className="bg-muted rounded-lg px-3 py-2 text-sm max-w-full">
              <Link href={`/u/${c.profiles?.username}`}>
                <div className="font-medium hover:underline cursor-pointer">
                  {c.profiles?.username || t("post.userFallback")}
                </div>
              </Link>
              <div className="whitespace-pre-wrap">
                {c.content}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
