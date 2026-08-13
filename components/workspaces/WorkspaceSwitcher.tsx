"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  ChevronsUpDown,
  GraduationCap,
  Presentation,
} from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { isStudentWorkspaceContext } from "@/components/workspaces/WorkspaceNavigation";
import {
  getWorkspaceKindFromMetadata,
  getWorkspacePersonaFromMetadata,
  workspaceMetadataKeys,
  workspaceDefinitions,
  type WorkspaceKind,
} from "@/lib/workspaces";

export type { WorkspaceKind } from "@/lib/workspaces";

type WorkspaceSwitcherProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
};

type WorkspaceOption = {
  description: string;
  href: string;
  kind: WorkspaceKind;
  label: string;
};

export function getActiveWorkspace(
  pathname: string,
  metadata?: Record<string, unknown>
): WorkspaceKind {
  if (pathname.startsWith(workspaceDefinitions.student.route)) return "student";
  if (pathname.startsWith(workspaceDefinitions.teacher.route)) return "teacher";
  if (isStudentWorkspaceContext(pathname, metadata)) return "student";
  return "personal";
}

function getRecommendedWorkspace(
  metadata: Record<string, unknown> | undefined
): WorkspaceKind | null {
  if (!metadata) return null;

  const persona = getWorkspacePersonaFromMetadata(metadata);
  if (persona) return persona === "learner" ? "personal" : persona;

  const value = [
    metadata.scripticx_persona,
    metadata.scripticx_account_type,
    metadata.persona,
  ].find((item): item is string => typeof item === "string")?.toLowerCase();

  if (!value) return null;
  if (["student", "elev", "school"].includes(value)) return "student";
  if (["teacher", "professor", "profesor"].includes(value)) return "teacher";
  if (["learner", "learning", "personal", "programming"].includes(value)) {
    return "personal";
  }

  return null;
}

function WorkspaceMark({ kind }: { kind: WorkspaceKind }) {
  if (kind === "student") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-300">
        <GraduationCap className="size-4.5" />
      </span>
    );
  }

  if (kind === "teacher") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-700 ring-1 ring-violet-500/20 dark:text-violet-300">
        <Presentation className="size-4.5" />
      </span>
    );
  }

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background ring-1 ring-border shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logoSCX.svg"
        alt=""
        className="size-6 object-contain dark:invert"
      />
    </span>
  );
}

export function WorkspaceSwitcher({
  collapsed = false,
  onNavigate,
  variant = "desktop",
}: WorkspaceSwitcherProps) {
  const pathname = usePathname() || "/";
  const { locale } = useLanguage();
  const { user } = useAuth();
  const ro = locale === "ro";
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const activeKind = getActiveWorkspace(pathname, metadata);
  const recommendedKind = getRecommendedWorkspace(
    metadata
  );
  const storedActiveKind = getWorkspaceKindFromMetadata(metadata);
  const workspaces: WorkspaceOption[] = [
    {
      kind: "personal",
      href: workspaceDefinitions.personal.route,
      label: ro ? "Spațiu personal" : "Personal space",
      description: ro ? "Învață și exersează programare" : "Learn and practise programming",
    },
    {
      kind: "student",
      href: workspaceDefinitions.student.route,
      label: ro ? "Workspace elev" : "Student workspace",
      description: ro ? "Notițe, whiteboard și grafuri" : "Notes, whiteboard and graphs",
    },
    {
      kind: "teacher",
      href: workspaceDefinitions.teacher.route,
      label: ro ? "Workspace profesor" : "Teacher workspace",
      description: ro ? "Instrumente pentru predare" : "Tools for teaching",
    },
  ];
  const activeWorkspace =
    workspaces.find((workspace) => workspace.kind === activeKind) ?? workspaces[0];
  const compact = collapsed && variant === "desktop";

  function rememberWorkspace(kind: WorkspaceKind) {
    onNavigate?.();
    if (!user || kind === storedActiveKind) return;

    void api.auth
      .updateUserMetadata({
        [workspaceMetadataKeys.activeWorkspaceKind]: kind,
      })
      .then(({ error }) => {
        if (!error) return;
        toast.error(
          ro
            ? "Workspace-ul implicit nu a putut fi actualizat."
            : "Could not update your default workspace.",
          { description: error.message }
        );
      });
  }

  if (!user) {
    return (
      <Link
        href="/dashboard"
        onClick={onNavigate}
        title={compact ? "ScripticX" : undefined}
        aria-label="ScripticX"
        className={cn(
          "flex min-w-0 items-center rounded-xl text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          compact
            ? "size-10 justify-center p-0"
            : variant === "mobile"
              ? "w-full gap-3 p-2.5"
              : "h-12 flex-1 gap-2 px-2"
        )}
      >
        <WorkspaceMark kind="personal" />
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              ScripticX
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {ro ? "Învață programare vizual" : "Learn programming visually"}
            </span>
          </span>
        )}
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={compact ? activeWorkspace.label : undefined}
          aria-label={`${ro ? "Schimbă workspace-ul" : "Switch workspace"}: ${activeWorkspace.label}`}
          className={cn(
            "flex min-w-0 items-center rounded-xl text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            compact
              ? "size-10 justify-center p-0"
              : variant === "mobile"
                ? "w-full gap-3 p-2.5"
                : "h-12 flex-1 gap-2 px-2"
          )}
        >
          <WorkspaceMark kind={activeWorkspace.kind} />
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {activeWorkspace.label}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {activeWorkspace.description}
                </span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side={compact ? "right" : "bottom"}
        sideOffset={compact ? 10 : 6}
        className="z-[80] w-72 rounded-2xl p-1.5"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {ro ? "Workspace-uri" : "Workspaces"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {workspaces.map((workspace) => {
          const active = workspace.kind === activeKind;
          const recommended = workspace.kind === recommendedKind;
          const teacher = workspace.kind === "teacher";

          return (
            <DropdownMenuItem
              key={workspace.kind}
              asChild
              className="rounded-xl p-0 focus:bg-accent"
            >
              <Link
                href={workspace.href}
                onClick={() => rememberWorkspace(workspace.kind)}
                className="flex w-full items-center gap-3 px-2.5 py-2.5"
              >
                <WorkspaceMark kind={workspace.kind} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">
                      {workspace.label}
                    </span>
                    {teacher && (
                      <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                        {ro ? "în curând" : "preview"}
                      </span>
                    )}
                    {recommended && !active && (
                      <span className="rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-medium text-sky-700 dark:text-sky-300">
                        {ro ? "recomandat" : "recommended"}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {workspace.description}
                  </span>
                </span>
                {active && <Check className="size-4 shrink-0" />}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
