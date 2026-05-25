"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

export default function PostComments({ postId }: { postId: string }) {
  const { user } = useAuth();

  const [comments, setComments] = useState<any[]>([]);
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

  async function fetchComments() {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    const withProfiles = await Promise.all(
      (data || []).map(async (c) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", c.user_id)
          .maybeSingle();

        return {
          ...c,
          profiles: profile,
        };
      })
    );

    setComments(withProfiles);
  }

  useEffect(() => {
    fetchComments();
  }, []);

  async function addComment() {
    if (!content.trim() || !user) return;

    const { error } = await supabase.from("comments").insert([
      {
        post_id: postId,
        user_id: user.id,
        content,
      },
    ]);

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
          username: actor?.username || null,
        },
      });
    }

    setContent("");
    fetchComments();
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
              <Avatar className="w-8 h-8 cursor-pointer">
                {c.profiles?.avatar_url && (
                  <AvatarImage src={c.profiles.avatar_url} />
                )}
                <AvatarFallback>
                  {(c.profiles?.username || "U")[0]}
                </AvatarFallback>
              </Avatar>
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
