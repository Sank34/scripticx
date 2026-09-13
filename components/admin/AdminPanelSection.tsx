"use client";

import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/LanguageProvider";

type AdminPanelSectionProps = {
  action?: ReactNode;
  children: ReactNode;
  icon: ReactNode;
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  title: string;
};

function PanelSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-3">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminPanelSection({
  action,
  children,
  icon,
  isError,
  isLoading,
  onRetry,
  title,
}: AdminPanelSectionProps) {
  const { t } = useLanguage();

  return (
    <SectionCard icon={icon} title={title} action={action} contentClassName="space-y-3">
      {isLoading ? (
        <PanelSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <TriangleAlert className="h-6 w-6 text-amber-500" />
          <p className="text-sm font-medium">{t("admin.overview.errors.title")}</p>
          <p className="text-xs text-muted-foreground">
            {t("admin.overview.errors.description")}
          </p>
          <Button variant="outline" size="sm" className="mt-1" onClick={onRetry}>
            {t("admin.overview.errors.retry")}
          </Button>
        </div>
      ) : (
        children
      )}
    </SectionCard>
  );
}
