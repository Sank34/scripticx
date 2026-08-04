"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/LanguageProvider";
import type { CountResult } from "@/lib/adminOverview";
import { cn } from "@/lib/utils";

type AdminNavCardProps = {
  accentBadge?: { className: string; label: string } | null;
  count: CountResult | undefined;
  description: string;
  href: string;
  icon: ReactNode;
  ringClassName: string;
  title: string;
};

export function AdminNavCard({
  accentBadge,
  count,
  description,
  href,
  icon,
  ringClassName,
  title,
}: AdminNavCardProps) {
  const { t } = useLanguage();

  return (
    <Link
      href={href}
      className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card
        className={cn(
          "h-full gap-0 py-0 shadow-sm transition hover:shadow-md",
          ringClassName
        )}
      >
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            {icon}

            <div className="flex items-center gap-1.5">
              {accentBadge && (
                <Badge className={accentBadge.className}>{accentBadge.label}</Badge>
              )}

              {count === undefined ? (
                <Skeleton className="h-5 w-10 rounded-4xl" />
              ) : count === null ? (
                <Badge
                  variant="secondary"
                  title={t("admin.overview.unavailable")}
                >
                  —
                </Badge>
              ) : (
                <Badge variant="secondary">{String(count)}</Badge>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <span className="mt-auto flex items-center gap-1 text-sm font-medium text-muted-foreground transition group-hover:text-foreground">
            {t("admin.overview.actions.open")}
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
