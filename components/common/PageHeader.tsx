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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {meta && (
          <div className="shrink-0 text-sm text-muted-foreground">{meta}</div>
        )}

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
