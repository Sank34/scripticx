"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  ChevronsUpDown,
  GraduationCap,
  Info,
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
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  isStudentWorkspaceContext,
  isTeacherWorkspaceContext,
} from "@/components/workspaces/WorkspaceNavigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getAvailableWorkspaceKinds,
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
  if (isTeacherWorkspaceContext(pathname, metadata)) return "teacher";
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
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground ring-1 ring-border">
        <GraduationCap className="size-4.5" />
      </span>
    );
  }

  if (kind === "teacher") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground ring-1 ring-border">
        <Presentation className="size-4.5" />
      </span>
    );
  }

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-border">
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
  const { isAdmin, profile, user } = useAuth();
  const ro = locale === "ro";
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const metadataUsername = [metadata?.username, metadata?.user_name].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );
  const workspaceOwner =
    profile?.username?.trim() ||
    metadataUsername?.trim() ||
    user?.email?.split("@")[0] ||
    (ro ? "utilizator" : "User");
  const activeKind = getActiveWorkspace(pathname, metadata);
  const recommendedKind = getRecommendedWorkspace(
    metadata
  );
  const persona = getWorkspacePersonaFromMetadata(metadata) || "learner";
  const availableKinds = getAvailableWorkspaceKinds(persona, isAdmin);
  const storedActiveKind = getWorkspaceKindFromMetadata(metadata);
  const workspaces: WorkspaceOption[] = ([
    {
      kind: "personal",
      href: workspaceDefinitions.personal.route,
      label: ro
        ? `Workspace-ul lui ${workspaceOwner}`
        : `${workspaceOwner}’s Workspace`,
      description: ro
        ? "Învățare, practică și comunitate"
        : "Learning, practice and community",
    },
    {
      kind: "student",
      href: workspaceDefinitions.student.route,
      label: ro ? "Workspace elev" : "Student workspace",
      description: ro
        ? "Planner, notițe, whiteboard și parcurs"
        : "Planner, notes, whiteboard and learning path",
    },
    {
      kind: "teacher",
      href: workspaceDefinitions.teacher.route,
      label: ro ? "Workspace profesor" : "Teacher workspace",
      description: ro
        ? "Clase, elevi, teme și progres"
        : "Classes, students, assignments and progress",
    },
  ] satisfies WorkspaceOption[]).filter((workspace) =>
    availableKinds.includes(workspace.kind)
  );
  const activeWorkspace =
    workspaces.find((workspace) => workspace.kind === activeKind) ?? workspaces[0];
  const compact = collapsed && variant === "desktop";

  function rememberWorkspace(kind: WorkspaceKind) {
    onNavigate?.();
    if (!user || kind === storedActiveKind) return;

    void supabase.auth
      .updateUser({ data: {
        [workspaceMetadataKeys.activeWorkspaceKind]: kind,
      } })
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
          data-tour="workspace-switcher"
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
        className="z-[80] w-72 rounded-[var(--sx-radius-card)] p-1.5"
      >
        <DropdownMenuLabel className="flex items-center justify-between gap-3 px-2 py-1.5 text-xs font-medium tracking-normal text-muted-foreground">
          <span>{ro ? "Workspace-uri" : "Workspaces"}</span>
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex size-6 items-center justify-center rounded-md outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={ro ? "Despre workspace-uri" : "About workspaces"}
                >
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                align="end"
                sideOffset={8}
                collisionPadding={12}
                className="z-[100] max-w-[220px] whitespace-normal px-2.5 py-2 text-left text-[11px] leading-4 normal-case tracking-normal shadow-lg"
              >
                {isAdmin
                  ? ro
                    ? "Administratorii pot deschide toate workspace-urile pentru configurare, suport și verificare."
                    : "Administrators can open every workspace for configuration, support and verification."
                  : persona === "student"
                  ? ro
                    ? "Ca elev ai spațiul personal pentru practică și workspace-ul de elev pentru școală."
                    : "Students get a personal practice space and a school workspace."
                  : persona === "teacher"
                    ? ro
                      ? "Contul de profesor este concentrat pe administrarea claselor, elevilor și temelor."
                      : "Teacher accounts focus on managing classes, students and assignments."
                    : ro
                      ? "Modul personal păstrează platforma concentrată pe învățarea programării."
                      : "Personal mode keeps ScripticX focused on learning programming."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {workspaces.map((workspace) => {
          const active = workspace.kind === activeKind;
          const recommended = workspace.kind === recommendedKind;

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
                    {recommended && !active && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
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
