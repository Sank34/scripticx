"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Crumb = {
  href?: string;
  label: string;
};

function formatSegment(segment: string) {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isProbablyId(segment: string) {
  return segment.length > 18 || /^[0-9a-f-]{12,}$/i.test(segment);
}

export function TopbarBreadcrumbs() {
  const pathname = usePathname() || "/";
  const { t } = useLanguage();
  const segments = pathname.split("/").filter(Boolean);

  const labelBySegment: Record<string, string> = {
    admin: t("nav.admin"),
    classes: t("nav.classes"),
    contact: t("nav.contact"),
    dashboard: t("nav.dashboard"),
    editor: t("nav.editor"),
    examples: t("nav.examples"),
    feed: t("nav.feed"),
    followers: "Followers",
    following: "Following",
    help: t("nav.help"),
    leaderboard: t("nav.leaderboard"),
    learn: t("nav.docs"),
    live: t("nav.livecode"),
    livecode: t("nav.livecode"),
    login: "Login",
    post: t("nav.feed"),
    problems: t("nav.problems"),
    profile: t("user.profile"),
    search: t("nav.search"),
    settings: t("user.settings"),
    u: t("user.profile"),
    updates: t("nav.whatsNew"),
  };

  const crumbs: Crumb[] = [
    {
      href: userHomeHref(segments),
      label: "ScripticX",
    },
  ];

  let href = "";
  segments.forEach((segment, index) => {
    href += `/${segment}`;
    const isLast = index === segments.length - 1;
    const previous = segments[index - 1];
    const label =
      labelBySegment[segment] ??
      (isProbablyId(segment)
        ? previous === "post"
          ? "Post"
          : previous === "live"
            ? "Session"
            : previous === "problems"
              ? "Problem"
              : "Details"
        : formatSegment(decodeURIComponent(segment)));

    crumbs.push({
      href: isLast ? undefined : href,
      label,
    });
  });

  const visibleCrumbs =
    crumbs.length > 4
      ? [crumbs[0], crumbs[crumbs.length - 2], crumbs[crumbs.length - 1]]
      : crumbs;
  const hiddenCrumbs = crumbs.length > 4 ? crumbs.slice(1, -2) : [];

  return (
    <Breadcrumb className="hidden min-w-0 md:block">
      <BreadcrumbList className="flex-nowrap gap-1.5 text-xs text-zinc-500">
        {visibleCrumbs.map((crumb, index) => {
          const isFirstVisible = index === 0;
          const isLast = index === visibleCrumbs.length - 1;

          return (
            <BreadcrumbItem key={`${crumb.label}-${index}`} className="min-w-0">
              {!isFirstVisible && (
                <BreadcrumbSeparator className="text-zinc-300">
                  <span>/</span>
                </BreadcrumbSeparator>
              )}

              {isFirstVisible && hiddenCrumbs.length > 0 && (
                <>
                  <CrumbNode crumb={crumb} isLast={false} strong />
                  <BreadcrumbSeparator className="text-zinc-300">
                    <span>/</span>
                  </BreadcrumbSeparator>
                  <HiddenCrumbsMenu crumbs={hiddenCrumbs} />
                  <BreadcrumbSeparator className="text-zinc-300">
                    <span>/</span>
                  </BreadcrumbSeparator>
                </>
              )}

              {!(isFirstVisible && hiddenCrumbs.length > 0) && (
                <CrumbNode
                  crumb={crumb}
                  isLast={isLast}
                  strong={isFirstVisible}
                />
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function userHomeHref(segments: string[]) {
  if (segments.length === 0) return undefined;
  return "/dashboard";
}

function CrumbNode({
  crumb,
  isLast,
  strong = false,
}: {
  crumb: Crumb;
  isLast: boolean;
  strong?: boolean;
}) {
  const className = cn(
    "max-w-[9rem] truncate rounded-md px-1.5 py-1 transition-colors",
    strong && "font-semibold text-zinc-800",
    isLast && "bg-zinc-100 text-zinc-950"
  );

  if (!isLast && crumb.href) {
    return (
      <BreadcrumbLink asChild className={className}>
        <Link href={crumb.href}>{crumb.label}</Link>
      </BreadcrumbLink>
    );
  }

  return <BreadcrumbPage className={className}>{crumb.label}</BreadcrumbPage>;
}

function HiddenCrumbsMenu({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-md px-1 py-0.5 hover:bg-zinc-100">
        <BreadcrumbEllipsis className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {crumbs.map((crumb, index) => (
          <DropdownMenuItem key={`${crumb.label}-${index}`} asChild>
            <Link href={crumb.href || "#"}>{crumb.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
