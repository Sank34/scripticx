"use client";

import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { Copy, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export default function EditorSnippetPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    async function fetchData() {
      if (!id) return;

      const { data: snippet } = await supabase
        .from("snippets")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      setData(snippet);

      if (snippet?.user_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", snippet.user_id)
          .maybeSingle();

        setProfile(prof);
      }

      setLoading(false);
    }

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return <div className="p-6">{t("snippetPage.notFound")}</div>;
  }

  const initial = profile?.username?.[0]?.toUpperCase() || "U";

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(data.code);
      toast.success(t("snippetPage.toast.codeCopied"));
    } catch {
      toast.error(t("snippetPage.toast.copyError"));
    }
  }

  async function handleCopyLink() {
    try {
      const url = `${window.location.origin}/editor/${data.id}`;
      await navigator.clipboard.writeText(url);
      toast.success(t("snippetPage.toast.linkCopied"));
    } catch {
      toast.error(t("snippetPage.toast.linkError"));
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          {data.title || t("snippetPage.untitled")}
        </h1>

        <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
          <Badge variant="secondary">{t("snippetPage.public")}</Badge>
          <span>
            {new Date(data.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">

        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            {profile?.avatar_url && (
              <AvatarImage src={profile.avatar_url} />
            )}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>

          <div>
            <Link
              href={`/u/${profile?.username}`}
              className="font-semibold hover:underline"
            >
              {profile?.username || t("snippetPage.unknownUser")}
            </Link>

            <p className="text-xs text-muted-foreground">
              {t("snippetPage.shared")}
            </p>
          </div>
        </div>

        <div className="flex gap-2">

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
          >
            <Copy size={14} className="mr-2" />
            {t("snippetPage.actions.copy")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
          >
            <Share2 size={14} className="mr-2" />
            {t("snippetPage.actions.share")}
          </Button>

          <Link href="/editor">
            <Button size="sm">
              <ExternalLink size={14} className="mr-2" />
              {t("snippetPage.actions.openEditor")}
            </Button>
          </Link>

        </div>

      </div>

      {data.description && (
        <p className="text-muted-foreground">
          {data.description}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("snippetPage.code.title")}</CardTitle>
        </CardHeader>

        <CardContent>
          <pre className="bg-muted p-4 rounded text-sm overflow-auto whitespace-pre-wrap break-words">
            {data.code}
          </pre>
        </CardContent>
      </Card>

    </div>
  );
}