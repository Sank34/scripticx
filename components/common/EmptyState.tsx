import type { ReactNode } from "react";

type EmptyStateProps = {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
};

export function EmptyState({
  action,
  className = "py-12",
  description,
  icon,
  title,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center text-muted-foreground ${className}`}>
      {icon && <div className="mb-3">{icon}</div>}
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
