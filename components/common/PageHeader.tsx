import type { ReactNode } from "react";

type PageHeaderProps = {
  action?: ReactNode;
  className?: string;
  meta?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
};

export function PageHeader({
  action,
  className,
  meta,
  subtitle,
  title,
}: PageHeaderProps) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{subtitle}</p>
          )}
        </div>

        {(meta || action) && (
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {meta && <div className="text-sm text-muted-foreground">{meta}</div>}
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
