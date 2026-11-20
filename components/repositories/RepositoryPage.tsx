"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, CalendarDays, ChevronRight, CopyPlus, Download, ExternalLink, FileCode2, Files, Folder, Scale, Settings2, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { HighlightedCodeBlock } from "@/components/code/HighlightedCodeBlock";
import { EmptyState } from "@/components/common/EmptyState";
import { RepositoryFileFinder } from "@/components/repositories/RepositoryFileFinder";
import { RepositoryStarButton } from "@/components/repositories/RepositoryStarButton";
import { useLanguage } from "@/components/LanguageProvider";
import { Markdown } from "@/components/Markdown";
import { useAuth } from "@/hooks/useAuth";
import { findRepositoryLicense, findRepositoryReadme, getRepositoryLanguageBreakdown, repositoryPathHref, resolveRepositoryPath } from "@/lib/repositories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/UserAvatar";
import {
  buildProjectTree,
  getEditorLanguageDefinition,
  normalizeProjectEntries,
} from "@/lib/editor-project";
import type { EquippedRewards } from "@/lib/rewards";
import { supabase } from "@/lib/supabase";

const fileRowClass = "flex min-h-11 min-w-0 items-center gap-3 px-4 py-2 text-sm hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

type SnippetData = {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  code: string | null;
  files?: unknown;
  created_at: string;
  is_public: boolean | null;
  template_source_id: string | null;
};

type ProfileData = {
  username: string | null;
  avatar_url: string | null;
  equipped_rewards?: EquippedRewards | null;
};

function ProjectPageSkeleton() {
  const { t } = useLanguage();
  return (
    <div className="sx-page pb-16" role="status">
      <span className="sr-only">{t("repositories.loading")}</span>
      <div aria-hidden="true" className="mx-auto max-w-6xl space-y-8">
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

export default function RepositoryPage() {
  const { locale, t } = useLanguage();
  const [downloading, setDownloading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const requestedFileId = searchParams.get("file");
  const requestedPath = searchParams.get("path");
  const id = typeof params?.id === "string" ? params.id : "";

  const { data: snippetResult, isPending, isError, refetch } = useQuery({
    queryKey: ["editor-snippets", "detail", id, user?.id ?? null],
    queryFn: async ({ signal }) => {
      const query = supabase
        .from("snippets")
        .select("id, user_id, title, description, code, files, created_at, is_public, template_source_id")
        .eq("id", id);
      const visible = user
        ? query.or(`is_public.eq.true,user_id.eq.${user.id}`)
        : query.eq("is_public", true);
      const { data: snippet, error: snippetError } = await visible.abortSignal(signal).maybeSingle();
      if (snippetError) throw snippetError;

      const snippetData = snippet as SnippetData | null;
      const { files, directories } = normalizeProjectEntries(
        snippetData?.files,
        snippetData?.code || "",
      );

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

      let templateSource: { id: string; title: string | null } | null = null;
      if (snippetData?.template_source_id) {
        const { data: source } = await supabase.from("snippets").select("id, title")
          .eq("id", snippetData.template_source_id).eq("is_public", true).abortSignal(signal).maybeSingle();
        templateSource = source;
      }

      return { snippet: snippetData, profile: profileData, templateSource, files, directories, tree: buildProjectTree(files, directories) };
    },
    enabled: Boolean(id) && !authLoading,
  });

  if (authLoading || isPending) return <ProjectPageSkeleton />;

  const data = snippetResult?.snippet || null;
  const profile = snippetResult?.profile || null;
  const files = snippetResult?.files || [];

  if (!data || isError) {
    return (
      <div className="sx-page grid min-h-[55vh] place-items-center">
        <EmptyState
          title={t(isError ? "repositories.detailError" : "repositories.notFound")}
          description={isError ? undefined : t("repositories.unavailable")}
          icon={<FileCode2 className="size-6" />}
          action={(
            isError ? (
              <Button variant="outline" onClick={() => void refetch()}>{t("repositories.retry")}</Button>
            ) : (
              <Button asChild variant="outline">
                <Link href={user ? "/repos" : "/editor"}>{t("repositories.title")}</Link>
              </Button>
            )
          )}
        />
      </div>
    );
  }

  const snippet = data;
  const owner = user?.id === snippet.user_id;
  const { trail, entries, file: activeFile } = resolveRepositoryPath(
    snippetResult?.tree ?? [],
    requestedPath ?? files.find((file) => file.id === requestedFileId)?.path ?? "",
  );
  const currentPath = trail.at(-1)?.path ?? "";
  const parentPath = trail.at(-2)?.path ?? "";
  const editorUrl = new URLSearchParams({ project: snippet.id });
  if (activeFile) editorUrl.set("file", activeFile.id);
  const templateUrl = new URLSearchParams({ template: snippet.id });
  if (activeFile) templateUrl.set("file", activeFile.id);
  const templateSource = snippetResult?.templateSource;
  const readme = findRepositoryReadme(files);
  const license = findRepositoryLicense(files);
  const languages = getRepositoryLanguageBreakdown(files);
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const formattedDate = new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(snippet.created_at));
  const fileCountLabel = `${files.length} ${t(files.length === 1
    ? "snippetPage.meta.file"
    : "snippetPage.meta.files")}`;
  const username = profile?.username || t("snippetPage.unknownUser");

  async function downloadRepository() {
    setDownloading(true);
    try {
      const { buildRepositoryArchive } = await import("@/lib/repository-archive");
      const { filename, bytes } = buildRepositoryArchive(snippet.title ?? "", [
        ...(snippetResult?.directories ?? []),
        ...files,
      ]);
      const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes)], { type: "application/zip" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error(t("repositories.downloadError"));
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyLink() {
    try {
      const url = window.location.origin + repositoryPathHref(snippet.id, currentPath);
      await navigator.clipboard.writeText(url);
      toast.success(t("snippetPage.toast.linkCopied"));
    } catch {
      toast.error(t("snippetPage.toast.linkError"));
    }
  }

  return (
    <div className="sx-page pb-16">
      <div className="mx-auto min-w-0 max-w-6xl">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-7 w-fit text-muted-foreground">
          <Link href={user ? "/repos" : "/editor"}>
            <ArrowLeft />
            {t("repositories.title")}
          </Link>
        </Button>

        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar
              avatarUrl={profile?.avatar_url}
              username={username}
              equippedRewards={profile?.equipped_rewards}
              className="size-8 shrink-0"
            />
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
              {profile?.username ? (
                <Link href={`/u/${encodeURIComponent(profile.username)}`} className="wrap-anywhere text-sm hover:underline">
                  {username}
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">{username}</span>
              )}
              <span aria-hidden="true" className="text-muted-foreground">/</span>
              <h1 className="min-w-0 text-xl font-semibold wrap-anywhere">
                {snippet.title || t("repositories.untitled")}
              </h1>
              <Badge variant="outline">
                {t(snippet.is_public ? "snippetPage.public" : "repositories.private")}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <RepositoryStarButton repositoryId={snippet.id} viewerId={user?.id} />
            <Button type="button" variant="outline" onClick={() => void downloadRepository()} disabled={downloading} aria-busy={downloading}>
              <Download aria-hidden="true" />
              {t("repositories.downloadZip")}
            </Button>
            {snippet.is_public && user && (
              <Button variant="outline" asChild>
                <Link href={`/editor?${templateUrl}`} target="_blank" rel="noopener noreferrer" prefetch={false}>
                  <CopyPlus aria-hidden="true" />
                  {t("repositories.useTemplate")}
                </Link>
              </Button>
            )}
            {snippet.is_public && (
              <Button variant="outline" onClick={() => void handleCopyLink()}>
                <Share2 />
                {t("snippetPage.actions.share")}
              </Button>
            )}
            {owner && (
              <Button variant="outline" asChild>
                <Link href={`/editor?${editorUrl}&view=projects`}>
                  <Settings2 />
                  {t("repositories.settings")}
                </Link>
              </Button>
            )}
            {owner && (
              <Button asChild>
                <Link href={`/editor?${editorUrl}`}>
                  <ExternalLink />
                  {t("repositories.openEditor")}
                </Link>
              </Button>
            )}
          </div>
        </header>

        <div className="grid gap-6 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)]">
          <div className="min-w-0">
            <section className="space-y-3" aria-labelledby="source-files-heading">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="source-files-heading" className="text-xl font-semibold">{t("repositories.files")}</h2>
                <RepositoryFileFinder key={snippet.id} repositoryId={snippet.id} files={files} />
              </div>
              <nav aria-label={t("repositories.filePath")}>
                <ol className="flex min-w-0 flex-wrap items-center gap-x-1 text-sm">
                  <li>
                    {trail.length ? (
                      <Link className="inline-flex min-h-8 items-center rounded px-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring" href={repositoryPathHref(snippet.id, "")} scroll={false}>
                        {t("repositories.root")}
                      </Link>
                    ) : (
                      <span aria-current="location" className="font-medium">{t("repositories.root")}</span>
                    )}
                  </li>
                  {trail.map((node, index) => (
                    <li key={node.path} className="flex min-w-0 max-w-full items-center gap-1">
                      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      {index === trail.length - 1 ? (
                        <span aria-current="location" className="font-medium wrap-anywhere">{node.name}</span>
                      ) : (
                        <Link href={repositoryPathHref(snippet.id, node.path)} scroll={false} className="inline-flex min-h-8 min-w-0 items-center rounded px-2 wrap-anywhere hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                          {node.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>

              {activeFile ? (
                <HighlightedCodeBlock
                  code={activeFile.content}
                  copiedLabel={t("snippetPage.actions.copied")}
                  copyErrorLabel={t("snippetPage.toast.copyError")}
                  copyLabel={t("snippetPage.actions.copy")}
                  emptyLabel={t("snippetPage.code.empty")}
                  fileName={activeFile.name}
                  language={activeFile.language}
                  languageLabel={getEditorLanguageDefinition(activeFile.language).label}
                />
              ) : (
                <ul className="divide-y overflow-hidden rounded-[var(--sx-radius-card)] border bg-card">
                  {trail.length > 0 && (
                    <li>
                      <Link href={repositoryPathHref(snippet.id, parentPath)} scroll={false} className={fileRowClass}>
                        <ArrowLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        {t("repositories.parentDirectory")}
                      </Link>
                    </li>
                  )}
                  {entries.map((entry) => {
                    const Icon = entry.kind === "directory" ? Folder : FileCode2;
                    return (
                      <li key={entry.id}>
                        <Link href={repositoryPathHref(snippet.id, entry.path)} scroll={false} prefetch={false} className={fileRowClass}>
                          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="min-w-0 wrap-anywhere">{entry.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                  {entries.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">{t("repositories.emptyDirectory")}</li>}
                </ul>
              )}
            </section>
            {!currentPath && (readme || owner) && (
              <section className="mt-8 min-w-0 rounded-[var(--sx-radius-card)] border bg-card" aria-labelledby="readme-heading">
                <h2 id="readme-heading" className="flex scroll-mt-24 items-center gap-2 border-b px-4 py-3 font-medium sm:px-6">
                  <BookOpen className="size-4" aria-hidden="true" />
                  README.md
                </h2>
                <div className="min-w-0 px-4 py-5 wrap-anywhere sm:px-6">
                  {readme?.content.trim() ? (
                    <Markdown highlightCode codeLocale={locale}>{readme.content}</Markdown>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("repositories.noReadme")}</p>
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className="min-w-0 border-t border-border pt-4 lg:border-t-0 lg:pt-0" aria-labelledby="repository-about-heading">
            <h2 id="repository-about-heading" className="font-semibold">{t("repositories.about")}</h2>
            <p className="mt-3 text-sm leading-6 whitespace-pre-wrap wrap-anywhere text-muted-foreground">
              {snippet.description?.trim() || t("repositories.noDescription")}
            </p>
            {templateSource && (
              <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                <CopyPlus aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 wrap-anywhere">
                  {t("repositories.generatedFrom")}{" "}
                  <Link href={repositoryPathHref(templateSource.id, "")} className="font-medium text-foreground underline-offset-4 hover:underline">
                    {templateSource.title || t("repositories.untitled")}
                  </Link>
                </span>
              </p>
            )}
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {readme && (
                <li>
                  <Link href={`${repositoryPathHref(snippet.id, "")}#readme-heading`} className="inline-flex items-center gap-2 rounded hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    <BookOpen aria-hidden="true" className="size-4 shrink-0" />
                    README
                  </Link>
                </li>
              )}
              {license && (
                <li>
                  <Link href={repositoryPathHref(snippet.id, license.path)} className="inline-flex items-center gap-2 rounded hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    <Scale aria-hidden="true" className="size-4 shrink-0" />
                    {t("repositories.license")}
                  </Link>
                </li>
              )}
              <li className="flex items-center gap-2">
                <Files className="size-4 shrink-0" aria-hidden="true" />
                {fileCountLabel}
              </li>
              <li className="flex items-center gap-2">
                <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                <time dateTime={snippet.created_at}>{formattedDate}</time>
              </li>
            </ul>
            {languages.length > 0 && (
              <section className="mt-5 space-y-3 border-t pt-4" aria-labelledby="repository-languages-heading">
                <h2 id="repository-languages-heading" className="text-sm font-semibold">{t("repositories.languages")}</h2>
                <div aria-hidden="true" className="flex h-2 overflow-hidden rounded-full bg-muted">
                  {languages.map(({ language, share }, index) => (
                    <span key={language} style={{ width: `${share * 100}%`, backgroundColor: `var(--chart-${index % 5 + 1})` }} />
                  ))}
                </div>
                <ul className="flex flex-wrap gap-x-3 gap-y-2 text-xs">
                  {languages.map(({ language, share }, index) => (
                    <li key={language} className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: `var(--chart-${index % 5 + 1})` }} />
                      <span>{getEditorLanguageDefinition(language).label}</span>
                      <span className="text-muted-foreground">{percent.format(share)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
