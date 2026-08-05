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

import { UserAvatar } from "@/components/user/UserAvatar";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { HighlightedCodeBlock } from "@/components/code/HighlightedCodeBlock";

import { Copy, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/components/LanguageProvider";
import type { EquippedRewards } from "@/lib/rewards";

type ProjectFile = {
  id: string;
  name: string;
  language: "msp" | "text";
  content: string;
};

type SnippetData = {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  code: string | null;
  files?: unknown;
  created_at: string;
};

type ProfileData = {
  username: string | null;
  avatar_url: string | null;
  equipped_rewards?: EquippedRewards | null;
};

function createFileId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createMainProjectFile(content: string): ProjectFile {
  return {
    id: createFileId(),
    name: "main.msp",
    language: "msp",
    content,
  };
}

function normalizeProjectFiles(
  files: unknown,
  fallbackCode: string
): ProjectFile[] {
  if (!Array.isArray(files)) {
    return [createMainProjectFile(fallbackCode)];
  }

  const normalized = files
    .map((file): ProjectFile | null => {
      if (!file || typeof file !== "object") return null;

      const candidate = file as {
        id?: unknown;
        name?: unknown;
        content?: unknown;
      };

      return {
        id: typeof candidate.id === "string" ? candidate.id : createFileId(),
        name:
          typeof candidate.name === "string" && candidate.name.trim()
            ? candidate.name.trim()
            : "main.msp",
        language: "msp",
        content:
          typeof candidate.content === "string" ? candidate.content : "",
      } satisfies ProjectFile;
    })
    .filter((file): file is ProjectFile => Boolean(file));

  return normalized.length
    ? normalized
    : [createMainProjectFile(fallbackCode)];
}

export default function EditorSnippetPage() {
  const { t } = useLanguage();
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { data: snippetResult, isPending: loading } = useQuery({
    queryKey: ["editor-snippets", "detail", id],
    queryFn: async () => {
      const { data: snippet, error: snippetError } = await supabase
        .from("snippets")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (snippetError) throw snippetError;

      const snippetData = snippet as SnippetData | null;
      const projectFiles = normalizeProjectFiles(
        snippetData?.files,
        snippetData?.code || ""
      );

      let profileData: ProfileData | null = null;
      if (snippetData?.user_id) {
        const { data: prof, error: profileError } = await supabase
          .from("profiles")
          .select("username, avatar_url, equipped_rewards")
          .eq("id", snippetData.user_id)
          .maybeSingle();
        if (profileError) throw profileError;
        profileData = prof as ProfileData | null;
      }

      return { snippet: snippetData, profile: profileData, files: projectFiles };
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
  const data = snippetResult?.snippet || null;
  const profile = snippetResult?.profile || null;
  const files = snippetResult?.files || [];

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
    return (
      <EmptyState
        className="p-6"
        title={t("snippetPage.notFound")}
      />
    );
  }

  const snippet = data;
  const initial = profile?.username?.[0]?.toUpperCase() || "U";
  const activeFile =
    files.find((file) => file.id === activeFileId) ?? files[0] ?? null;

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(
        activeFile?.content ?? snippet.code ?? ""
      );
      toast.success(t("snippetPage.toast.codeCopied"));
    } catch {
      toast.error(t("snippetPage.toast.copyError"));
    }
  }

  async function handleCopyLink() {
    try {
      const url = `${window.location.origin}/editor/${snippet.id}`;
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
          {snippet.title || t("snippetPage.untitled")}
        </h1>

        <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
          <Badge variant="secondary">{t("snippetPage.public")}</Badge>
          <span>
            {new Date(snippet.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">

        <div className="flex items-center gap-3">
          <UserAvatar
            avatarUrl={profile?.avatar_url}
            username={profile?.username || initial}
            equippedRewards={profile?.equipped_rewards}
            className="w-10 h-10"
          />

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

      {snippet.description && (
        <p className="text-muted-foreground">
          {snippet.description}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>{t("snippetPage.code.title")}</span>
            {activeFile && (
              <span className="text-sm font-normal text-muted-foreground">
                {activeFile.name}
              </span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {files.length > 1 && (
            <div className="mb-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setActiveFileId(file.id)}
                  className={`rounded-md border px-3 py-1 text-sm transition ${
                    file.id === activeFile?.id
                      ? "border-foreground bg-muted font-medium"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {file.name}
                </button>
              ))}
            </div>
          )}

          <HighlightedCodeBlock
            code={activeFile?.content ?? snippet.code ?? ""}
            copyLabel={t("snippetPage.actions.copy")}
            languageLabel={activeFile?.name ?? "MiniScript+"}
          />
        </CardContent>
      </Card>

    </div>
  );
}
