"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  Cloud,
  LoaderCircle,
  LockKeyhole,
  Search,
} from "lucide-react";
import { toast } from "sonner";

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
import { githubClientRequest } from "@/lib/github-client";
import type { GitHubRepository } from "@/lib/github-integration";
import { cn } from "@/lib/utils";

type RepositoryPayload = {
  configured: boolean;
  installations: Array<{ accountLogin: string; id: number; suspended: boolean }>;
  repositories: GitHubRepository[];
};

type GitHubCloneDialogProps = {
  dirty: boolean;
  locale: "en" | "ro";
  onCloned: (projectId: string) => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
  onOpenPublicImport: () => void;
  onSaveCurrent: () => Promise<unknown>;
  open: boolean;
};

function repositoryKey(repository: GitHubRepository) {
  return `${repository.installationId}:${repository.id}`;
}

export function GitHubCloneDialog({
  dirty,
  locale,
  onCloned,
  onOpenChange,
  onOpenPublicImport,
  onSaveCurrent,
  open,
}: GitHubCloneDialogProps) {
  const ro = locale === "ro";
  const [payload, setPayload] = useState<RepositoryPayload | null>(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"clone" | "install" | "save" | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void githubClientRequest<RepositoryPayload>("/api/github/repositories")
      .then((result) => {
        if (!cancelled) setPayload(result);
      })
      .catch((error) => {
        if (cancelled) return;
        setPayload(null);
        toast.error(
          ro ? "Repository-urile nu au putut fi încărcate." : "Repositories could not be loaded.",
          { description: error instanceof Error ? error.message : undefined }
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, ro]);

  const repositories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return payload?.repositories || [];
    return (payload?.repositories || []).filter((repository) =>
      `${repository.fullName} ${repository.description || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [payload?.repositories, search]);
  const selectedRepository = payload?.repositories.find(
    (repository) => repositoryKey(repository) === selectedKey
  );

  async function startInstallation() {
    setBusy("install");
    try {
      const result = await githubClientRequest<{ url: string }>("/api/github/install", {
        method: "POST",
      });
      window.location.assign(result.url);
    } catch (error) {
      setBusy(null);
      toast.error(
        ro ? "Conectarea GitHub nu a putut fi inițiată." : "GitHub connection could not be started.",
        { description: error instanceof Error ? error.message : undefined }
      );
    }
  }

  async function saveCurrentProject() {
    setBusy("save");
    try {
      await onSaveCurrent();
    } finally {
      setBusy(null);
    }
  }

  async function cloneRepository() {
    if (!selectedRepository || dirty) return;
    setBusy("clone");
    try {
      const result = await githubClientRequest<{
        importedFileCount: number;
        project: { id: string; title: string };
      }>("/api/github/clone", {
        method: "POST",
        body: JSON.stringify({
          installationId: selectedRepository.installationId,
          repositoryId: selectedRepository.id,
          owner: selectedRepository.owner,
          repo: selectedRepository.name,
          title: projectTitle.trim() || selectedRepository.name,
        }),
      });
      await onCloned(result.project.id);
      onOpenChange(false);
      toast.success(
        ro ? "Repository clonat în ScripticX." : "Repository cloned into ScripticX.",
        {
          description: ro
            ? `${result.importedFileCount} fișiere importate. Sincronizarea GitHub este activă.`
            : `${result.importedFileCount} files imported. GitHub synchronization is active.`,
        }
      );
    } catch (error) {
      toast.error(ro ? "Repository-ul nu a putut fi clonat." : "Repository could not be cloned.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(760px,calc(100vh-2rem))] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ro ? "Clonează un repository" : "Clone a repository"}</DialogTitle>
          <DialogDescription>
            {ro
              ? "Creează un proiect ScripticX conectat la GitHub, cu branch-uri, pull și push."
              : "Create a GitHub-connected ScripticX project with branches, pull and push."}
          </DialogDescription>
        </DialogHeader>

        {dirty && (
          <div className="flex items-center justify-between gap-4 border-y py-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {ro
                ? "Proiectul curent conține modificări nesalvate. Salvează-l înainte de clonare."
                : "The current project contains unsaved changes. Save it before cloning."}
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => void saveCurrentProject()}
            >
              {busy === "save" && <LoaderCircle className="size-4 animate-spin" />}
              {ro ? "Salvează" : "Save"}
            </Button>
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-3 overflow-hidden">
          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              {ro ? "Se încarcă repository-urile..." : "Loading repositories..."}
            </div>
          ) : !payload?.installations.length ? (
            <div className="flex min-h-56 flex-col items-center justify-center border-y px-6 text-center">
              <GitHubMark className="size-7" />
              <p className="mt-3 text-sm font-semibold">
                {ro ? "Cont GitHub neconectat" : "GitHub account not connected"}
              </p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                {ro
                  ? "Conectează contul GitHub pentru a accesa repository-urile disponibile."
                  : "Connect your GitHub account to access your repositories."}
              </p>
              <Button className="mt-4" disabled={busy !== null} onClick={() => void startInstallation()}>
                {busy === "install" ? <LoaderCircle className="size-4 animate-spin" /> : <GitHubMark className="size-4" />}
                {ro ? "Conectează contul GitHub" : "Connect GitHub account"}
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={ro ? "Caută repository-uri" : "Search repositories"}
                  className="pl-9"
                />
              </div>
              <div className="max-h-72 overflow-y-auto border-y py-1">
                {repositories.length ? (
                  repositories.map((repository) => {
                    const selected = repositoryKey(repository) === selectedKey;
                    return (
                      <button
                        type="button"
                        key={repositoryKey(repository)}
                        onClick={() => {
                          setSelectedKey(repositoryKey(repository));
                          setProjectTitle(repository.name);
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/70",
                          selected && "bg-muted"
                        )}
                      >
                        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground">
                          {repository.isPrivate ? <LockKeyhole size={13} /> : <Cloud size={13} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{repository.fullName}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {repository.description || (ro ? "Fără descriere" : "No description")}
                          </span>
                        </span>
                        {selected && <Check className="mt-1 size-4 shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {ro ? "Niciun repository disponibil." : "No repositories available."}
                  </p>
                )}
              </div>
              {selectedRepository && (
                <div className="space-y-1.5">
                  <label htmlFor="github-clone-title" className="text-xs font-medium">
                    {ro ? "Numele proiectului" : "Project name"}
                  </label>
                  <Input
                    id="github-clone-title"
                    value={projectTitle}
                    maxLength={120}
                    onChange={(event) => setProjectTitle(event.target.value)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <Button
            variant="ghost"
            className="justify-start gap-2 text-muted-foreground"
            onClick={() => {
              onOpenChange(false);
              onOpenPublicImport();
            }}
          >
            <ArrowDownToLine size={14} />
            {ro ? "Importă prin URL public" : "Import by public URL"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {ro ? "Anulează" : "Cancel"}
            </Button>
            <Button
              disabled={!selectedRepository || !projectTitle.trim() || dirty || busy !== null}
              onClick={() => void cloneRepository()}
            >
              {busy === "clone" && <LoaderCircle className="size-4 animate-spin" />}
              {ro ? "Clonează proiectul" : "Clone project"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("fill-current", className)}>
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.74-1.56-2.57-.3-5.27-1.29-5.27-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.93 10.93 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  );
}
