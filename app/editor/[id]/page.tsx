"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, FileCode2, Files, Share2 } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { HighlightedCodeBlock } from "@/components/code/HighlightedCodeBlock";
import { EmptyState } from "@/components/common/EmptyState";
import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/UserAvatar";
import {
  getEditorLanguageDefinition,
  normalizeProjectEntries,
} from "@/lib/editor-project";
import type { EquippedRewards } from "@/lib/rewards";
import { supabase } from "@/lib/supabase";

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

function ProjectPageSkeleton() {
  return (
    <div className="sx-page pb-16">
      <div className="mx-auto max-w-6xl space-y-8">
        <Skeleton className="h-7 w-36" />
        <div className="space-y-5 border-b border-border pb-8">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-11 w-2/3 max-w-xl" />
            <Skeleton className="h-5 w-full max-w-2xl" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-[360px] w-full rounded-[var(--sx-radius-card)]" />
        </div>
      </div>
    </div>
  );
}

export default function EditorSnippetPage() {
  const { locale, t } = useLanguage();
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const params = useParams();
  const searchParams = useSearchParams();
  const requestedFileId = searchParams.get("file");
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
      const projectFiles = normalizeProjectEntries(
        snippetData?.files,
        snippetData?.code || "",
      ).files;

      let profileData: ProfileData | null = null;
      if (snippetData?.user_id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("username, avatar_url, equipped_rewards")
          .eq("id", snippetData.user_id)
          .maybeSingle();
        if (profileError) throw profileError;
        profileData = profile as ProfileData | null;
      }

      return { snippet: snippetData, profile: profileData, files: projectFiles };
    },
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });

  if (loading) return <ProjectPageSkeleton />;

  const data = snippetResult?.snippet || null;
  const profile = snippetResult?.profile || null;
  const files = snippetResult?.files || [];

  if (!data) {
    return (
      <div className="sx-page grid min-h-[55vh] place-items-center">
        <EmptyState
          title={t("snippetPage.notFound")}
          description={t("snippetPage.notFoundDescription")}
          icon={<FileCode2 className="size-6" />}
          action={(
            <Button asChild variant="outline">
              <Link href="/editor">{t("snippetPage.actions.backToProjects")}</Link>
            </Button>
          )}
        />
      </div>
    );
  }

  const snippet = data;
  const activeFile =
    files.find((file) => file.id === activeFileId) ??
    files.find((file) => file.id === requestedFileId) ??
    files[0] ??
    null;
  const activeLanguage = activeFile
    ? getEditorLanguageDefinition(activeFile.language)
    : getEditorLanguageDefinition("msp");
  const formattedDate = new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(snippet.created_at));
  const fileCountLabel = `${files.length} ${t(files.length === 1
    ? "snippetPage.meta.file"
    : "snippetPage.meta.files")}`;
  const username = profile?.username || t("snippetPage.unknownUser");

  async function handleCopyLink() {
    try {
      const url = `${window.location.origin}/editor/${snippet.id}${activeFile
        ? `?file=${encodeURIComponent(activeFile.id)}`
        : ""}`;
      await navigator.clipboard.writeText(url);
      toast.success(t("snippetPage.toast.linkCopied"));
    } catch {
      toast.error(t("snippetPage.toast.linkError"));
    }
  }

  return (
    <div className="sx-page pb-16">
      <div className="mx-auto max-w-6xl">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-7 w-fit text-muted-foreground">
          <Link href="/editor">
            <ArrowLeft />
            {t("snippetPage.actions.backToProjects")}
          </Link>
        </Button>

        <header className="border-b border-border pb-8">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="gap-1.5">
              <span className="size-1.5 rounded-full bg-[var(--sx-success)]" aria-hidden="true" />
              {t("snippetPage.public")}
            </Badge>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Files className="size-3.5" aria-hidden="true" />
              {fileCountLabel}
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={snippet.created_at}>{formattedDate}</time>
          </div>

          <h1 className="max-w-4xl text-3xl font-semibold leading-tight sm:text-4xl">
            {snippet.title || t("snippetPage.untitled")}
          </h1>
          {snippet.description && (
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              {snippet.description}
            </p>
          )}

          <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar
                avatarUrl={profile?.avatar_url}
                username={username}
                equippedRewards={profile?.equipped_rewards}
                className="size-9"
              />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t("snippetPage.meta.sharedBy")}</p>
                {profile?.username ? (
                  <Link
                    href={`/u/${profile.username}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {profile.username}
                  </Link>
                ) : (
                  <p className="truncate text-sm font-medium">{username}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void handleCopyLink()}>
                <Share2 />
                {t("snippetPage.actions.share")}
              </Button>
              <Button asChild>
                <Link href="/editor">
                  <ExternalLink />
                  {t("snippetPage.actions.openEditor")}
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <section className="pt-8" aria-labelledby="source-files-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="source-files-heading" className="text-xl font-semibold">
                {t("snippetPage.code.title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeFile?.path || t("snippetPage.code.fallbackFile")}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{activeLanguage.label}</span>
          </div>

          {files.length > 1 && (
            <div
              role="tablist"
              aria-label={t("snippetPage.code.fileNavigation")}
              className="mb-3 flex gap-1 overflow-x-auto rounded-[var(--sx-radius-control)] border border-border bg-muted/40 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {files.map((file) => {
                const selected = file.id === activeFile?.id;
                return (
                  <button
                    key={file.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="project-source-code"
                    onClick={() => setActiveFileId(file.id)}
                    className={`sx-interactive shrink-0 rounded-[calc(var(--sx-radius-control)-4px)] px-3 py-1.5 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                      selected
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    }`}
                  >
                    {file.path}
                  </button>
                );
              })}
            </div>
          )}

          <div id="project-source-code" role="tabpanel">
            <HighlightedCodeBlock
              code={activeFile?.content ?? snippet.code ?? ""}
              copiedLabel={t("snippetPage.actions.copied")}
              copyErrorLabel={t("snippetPage.toast.copyError")}
              copyLabel={t("snippetPage.actions.copy")}
              emptyLabel={t("snippetPage.code.empty")}
              fileName={activeFile?.path}
              language={activeFile?.language ?? "msp"}
              languageLabel={activeLanguage.label}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
