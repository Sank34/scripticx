"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  Check,
  ChevronRight,
  Cloud,
  ExternalLink,
  FileDiff,
  GitBranch,
  GitPullRequest,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getChangedGitHubPaths,
  isSupportedGitHubTextPath,
  isValidGitBranchName,
  type GitHubProjectLink,
  type GitHubRemoteFile,
  type GitHubRepository,
} from "@/lib/github-integration";
import type { ProjectFile } from "@/lib/editor-project";
import { githubClientRequest } from "@/lib/github-client";
import { cn } from "@/lib/utils";

type BranchSummary = {
  name: string;
  protected: boolean;
  sha: string;
};

type RepositoryPayload = {
  configured: boolean;
  installations: Array<{
    accountLogin: string;
    accountType: string;
    id: number;
    repositorySelection: string;
    suspended: boolean;
  }>;
  link: GitHubProjectLink | null;
  repositories: GitHubRepository[];
};

type GitHubSourceControlPanelProps = {
  dirty: boolean;
  files: ProjectFile[];
  locale: "en" | "ro";
  onApplyRemote: (files: GitHubRemoteFile[]) => Promise<void> | void;
  onCommitted: () => void;
  onEnsureProjectSaved: () => Promise<string | null | undefined>;
  onOpenPublicImport: () => void;
  projectId: string | null;
  userId: string | null;
};

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function repositoryKey(repository: GitHubRepository) {
  return `${repository.installationId}:${repository.id}`;
}

export function GitHubSourceControlPanel({
  dirty,
  files,
  locale,
  onApplyRemote,
  onCommitted,
  onEnsureProjectSaved,
  onOpenPublicImport,
  projectId,
  userId,
}: GitHubSourceControlPanelProps) {
  const ro = locale === "ro";
  const [resolvedProjectId, setResolvedProjectId] = useState(projectId);
  const [payload, setPayload] = useState<RepositoryPayload | null>(null);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [selectedRepository, setSelectedRepository] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [fileHashes, setFileHashes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<
    "install" | "connect" | "sync" | "commit" | "branch" | "pull-request" | "disconnect" | null
  >(null);
  const [syncRequest, setSyncRequest] = useState<{ branch?: string } | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [newBranchOpen, setNewBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [pullRequestOpen, setPullRequestOpen] = useState(false);
  const [pullRequestTitle, setPullRequestTitle] = useState("");
  const [pullRequestDescription, setPullRequestDescription] = useState("");

  useEffect(() => setResolvedProjectId(projectId), [projectId]);

  const loadRepositories = useCallback(async () => {
    if (!userId) {
      setPayload(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const query = resolvedProjectId
        ? `?projectId=${encodeURIComponent(resolvedProjectId)}`
        : "";
      const nextPayload = await githubClientRequest<RepositoryPayload>(
        `/api/github/repositories${query}`
      );
      setPayload(nextPayload);
    } catch (error) {
      setPayload(null);
      toast.error(ro ? "GitHub nu a putut fi încărcat." : "GitHub could not be loaded.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [resolvedProjectId, ro, userId]);

  const loadBranches = useCallback(async () => {
    if (!resolvedProjectId || !payload?.link) {
      setBranches([]);
      return;
    }
    try {
      const result = await githubClientRequest<{ branches: BranchSummary[] }>(
        `/api/github/branches?projectId=${encodeURIComponent(resolvedProjectId)}`
      );
      setBranches(result.branches);
    } catch (error) {
      toast.error(ro ? "Branch-urile nu au putut fi încărcate." : "Branches could not be loaded.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }, [payload?.link, resolvedProjectId, ro]);

  useEffect(() => {
    void loadRepositories();
  }, [loadRepositories]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const managedFiles = useMemo(
    () => files.filter((file) => isSupportedGitHubTextPath(file.path)),
    [files]
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      managedFiles.map(async (file) => [file.path, await sha256(file.content)] as const)
    ).then((entries) => {
      if (!cancelled) setFileHashes(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [managedFiles]);

  const changes = useMemo(
    () => getChangedGitHubPaths(fileHashes, payload?.link?.fileHashes || {}),
    [fileHashes, payload?.link?.fileHashes]
  );
  const changeCount = changes.changed.length + changes.deleted.length;
  const selectedRepositoryData = payload?.repositories.find(
    (repository) => repositoryKey(repository) === selectedRepository
  );

  async function ensureSavedProject(forceSave = false) {
    if (resolvedProjectId && !forceSave) return resolvedProjectId;
    const id = await onEnsureProjectSaved();
    if (!id) throw new Error(ro ? "Salvează proiectul înainte de conectare." : "Save the project before connecting.");
    setResolvedProjectId(id);
    return id;
  }

  async function startInstallation() {
    setBusy("install");
    try {
      const result = await githubClientRequest<{ url: string }>("/api/github/install", {
        method: "POST",
      });
      window.location.assign(result.url);
    } catch (error) {
      setBusy(null);
      toast.error(ro ? "Instalarea GitHub nu a putut porni." : "GitHub installation could not start.", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function performSync(branch?: string, projectOverride?: string) {
    const id = projectOverride || (await ensureSavedProject());
    setBusy("sync");
    try {
      const result = await githubClientRequest<{ files: GitHubRemoteFile[]; link: GitHubProjectLink }>(
        "/api/github/sync",
        {
          method: "POST",
          body: JSON.stringify({ projectId: id, ...(branch ? { branch } : {}) }),
        }
      );
      await onApplyRemote(result.files);
      setPayload((current) => (current ? { ...current, link: result.link } : current));
      setCommitMessage("");
      toast.success(ro ? "Proiect sincronizat cu GitHub." : "Project synchronized with GitHub.");
      await loadBranches();
    } catch (error) {
      toast.error(ro ? "Sincronizarea a eșuat." : "Synchronization failed.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(null);
      setSyncRequest(null);
    }
  }

  function requestSync(branch?: string) {
    if (dirty || changeCount > 0) {
      setSyncRequest({ branch });
      return;
    }
    void performSync(branch);
  }

  async function connectRepository() {
    if (!selectedRepositoryData) return;
    setBusy("connect");
    try {
      const id = await ensureSavedProject();
      const result = await githubClientRequest<{ link: GitHubProjectLink }>(
        "/api/github/project-link",
        {
          method: "POST",
          body: JSON.stringify({
            projectId: id,
            installationId: selectedRepositoryData.installationId,
            repositoryId: selectedRepositoryData.id,
            owner: selectedRepositoryData.owner,
            repo: selectedRepositoryData.name,
            branch: selectedRepositoryData.defaultBranch,
          }),
        }
      );
      setPayload((current) => (current ? { ...current, link: result.link } : current));
      await performSync(result.link.branch, id);
    } catch (error) {
      toast.error(ro ? "Repository-ul nu a putut fi conectat." : "Repository could not be connected.", {
        description: error instanceof Error ? error.message : undefined,
      });
      setBusy(null);
    }
  }

  async function commitAndPush() {
    const id = await ensureSavedProject(true);
    if (!commitMessage.trim()) return;
    setBusy("commit");
    try {
      const result = await githubClientRequest<{
        commit: { sha: string; url: string | null };
        link: GitHubProjectLink;
      }>("/api/github/commit", {
        method: "POST",
        body: JSON.stringify({
          projectId: id,
          message: commitMessage.trim(),
          files: managedFiles.map((file) => ({ path: file.path, content: file.content })),
        }),
      });
      setPayload((current) => (current ? { ...current, link: result.link } : current));
      setCommitMessage("");
      onCommitted();
      toast.success(ro ? "Commit publicat pe GitHub." : "Commit pushed to GitHub.", {
        action: result.commit.url
          ? {
              label: ro ? "Deschide" : "Open",
              onClick: () => window.open(result.commit.url || "", "_blank", "noopener,noreferrer"),
            }
          : undefined,
      });
    } catch (error) {
      toast.error(ro ? "Commit-ul nu a putut fi publicat." : "Commit could not be pushed.", {
        description: error instanceof Error ? error.message : undefined,
      });
      if (error instanceof Error && error.message.includes("Pull")) {
        await loadRepositories();
      }
    } finally {
      setBusy(null);
    }
  }

  async function createBranch() {
    const branch = newBranchName.trim();
    if (!isValidGitBranchName(branch)) return;
    const id = await ensureSavedProject();
    setBusy("branch");
    try {
      const result = await githubClientRequest<{ link: GitHubProjectLink }>(
        "/api/github/branches",
        {
          method: "POST",
          body: JSON.stringify({ projectId: id, branch }),
        }
      );
      setPayload((current) => (current ? { ...current, link: result.link } : current));
      setNewBranchOpen(false);
      setNewBranchName("");
      await loadBranches();
      toast.success(ro ? `Branch-ul ${branch} a fost creat.` : `Branch ${branch} was created.`);
    } catch (error) {
      toast.error(ro ? "Branch-ul nu a putut fi creat." : "Branch could not be created.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  async function createPullRequest() {
    if (!resolvedProjectId || !pullRequestTitle.trim()) return;
    setBusy("pull-request");
    try {
      const result = await githubClientRequest<{
        pullRequest: { number: number; title: string; url: string };
      }>("/api/github/pull-request", {
        method: "POST",
        body: JSON.stringify({
          projectId: resolvedProjectId,
          title: pullRequestTitle.trim(),
          description: pullRequestDescription,
        }),
      });
      setPullRequestOpen(false);
      setPullRequestTitle("");
      setPullRequestDescription("");
      toast.success(
        ro
          ? `Pull request #${result.pullRequest.number} creat.`
          : `Pull request #${result.pullRequest.number} created.`,
        {
          action: {
            label: ro ? "Deschide" : "Open",
            onClick: () =>
              window.open(result.pullRequest.url, "_blank", "noopener,noreferrer"),
          },
        }
      );
    } catch (error) {
      toast.error(
        ro ? "Pull request-ul nu a putut fi creat." : "Pull request could not be created.",
        { description: error instanceof Error ? error.message : undefined }
      );
    } finally {
      setBusy(null);
    }
  }

  async function disconnectRepository() {
    if (!resolvedProjectId) return;
    setBusy("disconnect");
    try {
      await githubClientRequest(
        `/api/github/project-link?projectId=${encodeURIComponent(resolvedProjectId)}`,
        { method: "DELETE" }
      );
      setPayload((current) => (current ? { ...current, link: null } : current));
      setBranches([]);
      setDisconnectOpen(false);
      toast.success(ro ? "Repository deconectat." : "Repository disconnected.");
    } catch (error) {
      toast.error(ro ? "Repository-ul nu a putut fi deconectat." : "Repository could not be disconnected.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  if (!userId) {
    return (
      <div className="@container/source-control flex h-full min-h-0 flex-col">
        <PanelHeader title={ro ? "Controlul sursei" : "Source control"} />
        <div className="p-4 text-xs leading-relaxed text-muted-foreground">
          {ro ? "Autentifică-te pentru a conecta un repository GitHub." : "Sign in to connect a GitHub repository."}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="@container/source-control flex h-full min-h-0 flex-col">
        <PanelHeader title={ro ? "Controlul sursei" : "Source control"} />
        <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          {ro ? "Se încarcă GitHub..." : "Loading GitHub..."}
        </div>
      </div>
    );
  }

  const link = payload?.link;
  return (
    <div className="@container/source-control flex h-full min-h-0 flex-col bg-background">
      <PanelHeader
        title={ro ? "Controlul sursei" : "Source control"}
        action={
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => void loadRepositories()}
            aria-label={ro ? "Reîncarcă" : "Refresh"}
          >
            <RefreshCw size={13} />
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!payload?.installations.length ? (
          <div className="space-y-4 p-3">
            <div className="border-b pb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg border bg-muted/40">
                  <GitHubMark className="size-[17px]" />
                </span>
                <div>
                  <p className="text-xs font-semibold">GitHub</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ro ? "Controlul versiunilor" : "Version control"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {ro
                  ? "Conectează contul GitHub pentru a accesa repository-urile disponibile."
                  : "Connect your GitHub account to access your repositories."}
              </p>
            </div>
            <ResponsivePanelAction
              label={ro ? "Conectează contul GitHub" : "Connect GitHub account"}
              icon={
                busy === "install" ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <GitHubMark className="size-[15px]" />
                )
              }
              onClick={() => void startInstallation()}
              disabled={busy === "install"}
            />
            <ResponsivePanelAction
              variant="outline"
              label={ro ? "Importă prin URL public" : "Import by public URL"}
              icon={<ArrowDownToLine size={15} />}
              onClick={onOpenPublicImport}
            />
          </div>
        ) : !link ? (
          <div className="space-y-4 p-3">
            <div className="flex items-center justify-between gap-3 border-b pb-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">
                  {payload.installations.map((item) => item.accountLogin).join(", ")}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {payload.repositories.length} {ro ? "repository-uri disponibile" : "repositories available"}
                </p>
              </div>
              <Button size="icon-xs" variant="ghost" onClick={() => void startInstallation()} aria-label={ro ? "Configurează accesul" : "Configure access"}>
                <Settings2 size={14} />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-medium" htmlFor="github-repository-select">
                {ro ? "Repository" : "Repository"}
              </label>
              <Select value={selectedRepository} onValueChange={setSelectedRepository}>
                <SelectTrigger id="github-repository-select" className="w-full">
                  <SelectValue placeholder={ro ? "Alege un repository" : "Choose a repository"} />
                </SelectTrigger>
                <SelectContent>
                  {payload.repositories.map((repository) => (
                    <SelectItem key={repositoryKey(repository)} value={repositoryKey(repository)}>
                      <span className="flex items-center gap-2">
                        {repository.isPrivate ? <LockKeyhole size={12} /> : <Cloud size={12} />}
                        {repository.fullName}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {ro
                  ? "Conectarea va importa branch-ul implicit în proiectul curent."
                  : "Connecting imports the default branch into the current project."}
              </p>
            </div>
            <ResponsivePanelAction
              label={ro ? "Conectează și importă" : "Connect and import"}
              icon={
                busy === "connect" || busy === "sync" ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <ChevronRight size={15} />
                )
              }
              disabled={!selectedRepositoryData || busy !== null}
              onClick={() => void connectRepository()}
            />
            <ResponsivePanelAction
              variant="outline"
              label={ro ? "Import rapid prin URL" : "Quick import by URL"}
              icon={<ArrowDownToLine size={15} />}
              onClick={onOpenPublicImport}
            />
          </div>
        ) : (
          <div>
            <section className="border-b p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <GitHubMark className="size-3.5" />
                    <p className="truncate text-xs font-semibold">{link.owner}/{link.repo}</p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        link.syncStatus === "clean" ? "bg-emerald-500" : "bg-amber-500"
                      )}
                    />
                    {link.syncStatus === "clean"
                      ? ro ? "Sincronizat" : "Up to date"
                      : ro ? "Sunt disponibile schimbări remote" : "Remote changes available"}
                  </div>
                </div>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => window.open(`https://github.com/${link.owner}/${link.repo}`, "_blank", "noopener,noreferrer")}
                  aria-label={ro ? "Deschide pe GitHub" : "Open on GitHub"}
                >
                  <ExternalLink size={13} />
                </Button>
              </div>

              <div className="mt-3 flex gap-1.5">
                <Select value={link.branch} onValueChange={(branch) => requestSync(branch)}>
                  <SelectTrigger size="sm" className="min-w-0 flex-1" aria-label={ro ? "Branch activ" : "Active branch"}>
                    <GitBranch size={13} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.name} value={branch.name}>
                        {branch.name}{branch.protected ? " · protected" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon-sm" variant="outline" onClick={() => setNewBranchOpen(true)} aria-label={ro ? "Branch nou" : "New branch"}>
                  <Plus size={14} />
                </Button>
                <Button size="icon-sm" variant="outline" onClick={() => requestSync()} disabled={busy !== null} aria-label={ro ? "Pull" : "Pull"}>
                  {busy === "sync" ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowDownToLine size={14} />}
                </Button>
              </div>
            </section>

            <section className="border-b p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold">{ro ? "Schimbări" : "Changes"}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{changeCount}</span>
              </div>
              {changeCount ? (
                <div className="mt-2 space-y-0.5">
                  {changes.changed.map((path) => (
                    <ChangeRow key={path} path={path} status={payload.link?.fileHashes[path] ? "M" : "A"} />
                  ))}
                  {changes.deleted.map((path) => <ChangeRow key={path} path={path} status="D" />)}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Check size={13} />
                  {ro ? "Nu există schimbări locale." : "No local changes."}
                </div>
              )}
              {files.length !== managedFiles.length && (
                <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                  {ro
                    ? `${files.length - managedFiles.length} fișier(e) binar sau neacceptat nu vor fi trimise.`
                    : `${files.length - managedFiles.length} binary or unsupported file(s) will not be pushed.`}
                </p>
              )}
            </section>

            <section className="space-y-2 p-3">
              <Input
                value={commitMessage}
                onChange={(event) => setCommitMessage(event.target.value)}
                placeholder={ro ? "Mesajul commit-ului" : "Commit message"}
                maxLength={240}
                disabled={busy !== null}
              />
              <ResponsivePanelAction
                label={ro ? "Commit și push" : "Commit & push"}
                icon={
                  busy === "commit" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Send size={14} />
                  )
                }
                disabled={!commitMessage.trim() || changeCount === 0 || busy !== null}
                onClick={() => void commitAndPush()}
              />
              <ResponsivePanelAction
                variant="outline"
                label={ro ? "Creează pull request" : "Create pull request"}
                icon={<GitPullRequest size={14} />}
                disabled={
                  link.branch === link.defaultBranch ||
                  changeCount > 0 ||
                  busy !== null
                }
                onClick={() => {
                  setPullRequestTitle(
                    titleForPullRequest(link.branch)
                  );
                  setPullRequestOpen(true);
                }}
              />
              {link.branch === link.defaultBranch ? (
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  {ro
                    ? "Creează un branch separat pentru a deschide un pull request."
                    : "Create a separate branch before opening a pull request."}
                </p>
              ) : changeCount > 0 ? (
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  {ro
                    ? "Publică schimbările înainte de a crea pull request-ul."
                    : "Push your changes before creating the pull request."}
                </p>
              ) : null}
              <ResponsivePanelAction
                variant="ghost"
                className="text-muted-foreground"
                label={ro ? "Deconectează repository-ul" : "Disconnect repository"}
                icon={<Unlink size={14} />}
                onClick={() => setDisconnectOpen(true)}
              />
            </section>
          </div>
        )}
      </div>

      <AlertDialog open={Boolean(syncRequest)} onOpenChange={(open) => !open && setSyncRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ro ? "Înlocuiești schimbările locale?" : "Replace local changes?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ro
                ? "Pull va încărca versiunea branch-ului de pe GitHub. Salvează sau publică schimbările locale înainte dacă vrei să le păstrezi."
                : "Pull loads the branch version from GitHub. Save or push local changes first if you want to keep them."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ro ? "Anulează" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void performSync(syncRequest?.branch)}>
              {ro ? "Continuă cu pull" : "Continue pulling"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ro ? "Deconectezi repository-ul?" : "Disconnect repository?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ro
                ? "Fișierele rămân în proiect, dar sincronizarea și istoricul GitHub sunt eliminate."
                : "Files remain in the project, but GitHub synchronization and link history are removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ro ? "Anulează" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void disconnectRepository()}>
              {ro ? "Deconectează" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={newBranchOpen} onOpenChange={setNewBranchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ro ? "Creează un branch" : "Create a branch"}</DialogTitle>
            <DialogDescription>
              {ro
                ? `Noul branch pornește din ${link?.branch || "branch-ul activ"}.`
                : `The new branch starts from ${link?.branch || "the active branch"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              autoFocus
              value={newBranchName}
              onChange={(event) => setNewBranchName(event.target.value)}
              placeholder="feature/editor-improvements"
              aria-invalid={Boolean(newBranchName && !isValidGitBranchName(newBranchName.trim()))}
            />
            {newBranchName && !isValidGitBranchName(newBranchName.trim()) && (
              <p className="text-xs text-destructive">{ro ? "Introdu un nume Git valid." : "Enter a valid Git branch name."}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewBranchOpen(false)}>{ro ? "Anulează" : "Cancel"}</Button>
            <Button disabled={!isValidGitBranchName(newBranchName.trim()) || busy !== null} onClick={() => void createBranch()}>
              {busy === "branch" && <LoaderCircle className="size-4 animate-spin" />}
              {ro ? "Creează branch" : "Create branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pullRequestOpen} onOpenChange={setPullRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ro ? "Creează un pull request" : "Create a pull request"}</DialogTitle>
            <DialogDescription>
              {ro
                ? `${link?.branch || "Branch-ul activ"} va fi comparat cu ${link?.defaultBranch || "branch-ul implicit"}.`
                : `${link?.branch || "The active branch"} will be compared with ${link?.defaultBranch || "the default branch"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label htmlFor="github-pr-title" className="text-xs font-medium">
                {ro ? "Titlu" : "Title"}
              </label>
              <Input
                id="github-pr-title"
                autoFocus
                value={pullRequestTitle}
                onChange={(event) => setPullRequestTitle(event.target.value)}
                maxLength={240}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="github-pr-description" className="text-xs font-medium">
                {ro ? "Descriere (opțional)" : "Description (optional)"}
              </label>
              <textarea
                id="github-pr-description"
                value={pullRequestDescription}
                onChange={(event) => setPullRequestDescription(event.target.value)}
                rows={5}
                maxLength={8_000}
                className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPullRequestOpen(false)}>
              {ro ? "Anulează" : "Cancel"}
            </Button>
            <Button
              disabled={!pullRequestTitle.trim() || busy !== null}
              onClick={() => void createPullRequest()}
            >
              {busy === "pull-request" && <LoaderCircle className="size-4 animate-spin" />}
              {ro ? "Creează" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function titleForPullRequest(branch: string) {
  const value = branch.split("/").at(-1) || branch;
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type ResponsivePanelActionProps = Omit<ComponentProps<typeof Button>, "children"> & {
  icon: ReactNode;
  label: string;
};

function ResponsivePanelAction({
  className,
  icon,
  label,
  ...props
}: ResponsivePanelActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          {...props}
          aria-label={label}
          className={cn(
            "w-full min-w-0 justify-start gap-2 overflow-hidden",
            "@max-[280px]/source-control:justify-center @max-[280px]/source-control:px-2",
            className
          )}
        >
          {icon}
          <span className="min-w-0 truncate @max-[280px]/source-control:sr-only">
            {label}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function PanelHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b px-3">
      <span className="min-w-0 truncate text-xs font-semibold">{title}</span>
      {action}
    </div>
  );
}

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("fill-current", className)}
    >
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.74-1.56-2.57-.3-5.27-1.29-5.27-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.93 10.93 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  );
}

function ChangeRow({ path, status }: { path: string; status: "A" | "D" | "M" }) {
  const color = status === "A" ? "text-emerald-600 dark:text-emerald-400" : status === "D" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400";
  return (
    <div className="flex h-7 items-center gap-2 rounded-md px-1.5 text-[11px] hover:bg-muted/70">
      <FileDiff size={13} className="shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{path}</span>
      <span className={cn("font-mono text-[10px] font-semibold", color)}>{status}</span>
    </div>
  );
}
