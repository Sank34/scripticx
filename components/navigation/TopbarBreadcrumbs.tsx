"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

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
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname() || "/";
  const { t } = useLanguage();
  const segments = pathname.split("/").filter(Boolean);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    assignments: "Assignments",
    solve: "Solve",
    u: t("user.profile"),
    updates: t("nav.whatsNew"),
  };

  const crumbs: Crumb[] = [
    {
      href: userHomeHref(segments),
      label: "ScripticX",
    },
  ];

  segments.forEach((segment, index) => {
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
      href: isLast ? undefined : resolveCrumbHref(segments, index),
      label,
    });
  });

  const shouldCollapse = crumbs.length > 2;
  const visibleCrumbs = shouldCollapse
    ? [crumbs[0], crumbs[crumbs.length - 1]]
    : crumbs;
  const hiddenCrumbs = shouldCollapse ? crumbs.slice(1, -1) : [];
  const breadcrumbEntries =
    hiddenCrumbs.length > 0
      ? [
          { type: "crumb" as const, crumb: visibleCrumbs[0], strong: true },
          { type: "menu" as const, crumbs: hiddenCrumbs },
          ...visibleCrumbs.slice(1).map((crumb) => ({
            type: "crumb" as const,
            crumb,
            strong: false,
          })),
        ]
      : visibleCrumbs.map((crumb, index) => ({
          type: "crumb" as const,
          crumb,
          strong: index === 0,
        }));

  if (!mounted) {
    return <div className="hidden h-7 min-w-0 md:block" />;
  }

  return (
    <Breadcrumb className="hidden w-full min-w-0 overflow-hidden md:block">
      <BreadcrumbList className="w-full min-w-0 flex-nowrap gap-1.5 overflow-hidden text-xs text-zinc-500">
        {breadcrumbEntries.map((entry, index) => {
          const isLast = index === breadcrumbEntries.length - 1;

          return (
            <Fragment
              key={
                entry.type === "crumb"
                  ? `${entry.crumb.label}-${index}`
                  : `hidden-crumbs-${index}`
              }
            >
              {index > 0 && (
                <BreadcrumbSeparator className="text-zinc-300">
                  <span>/</span>
                </BreadcrumbSeparator>
              )}

              <BreadcrumbItem className="min-w-0 shrink">
                {entry.type === "menu" ? (
                  <HiddenCrumbsMenu crumbs={entry.crumbs} />
                ) : (
                  <CrumbNode
                    crumb={entry.crumb}
                    isLast={isLast}
                    strong={entry.strong}
                  />
                )}
              </BreadcrumbItem>
            </Fragment>
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

function resolveCrumbHref(segments: string[], index: number) {
  const segment = segments[index];
  const previous = segments[index - 1];

  if (segment === "post") return "/feed";
  if (segment === "live") return "/livecode";
  if (segment === "u") return "/search";

  if (segment === "assignments" && segments[0] === "classes") {
    return segments[1] ? `/classes/${segments[1]}` : "/classes";
  }

  if (previous === "assignments" && segments[0] === "classes") {
    return segments[1]
      ? `/classes/${segments[1]}/assignments/${segment}`
      : "/classes";
  }

  if (segment === "solve" && segments[0] === "classes") {
    return segments[3]
      ? `/classes/${segments[1]}/assignments/${segments[3]}`
      : "/classes";
  }

  return `/${segments.slice(0, index + 1).join("/")}`;
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
    "block max-w-[6rem] truncate rounded-md px-1.5 py-1 transition-colors lg:max-w-[8rem] xl:max-w-[10rem]",
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
