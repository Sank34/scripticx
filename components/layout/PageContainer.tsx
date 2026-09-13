"use client";

import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "wide" | "full";
  className?: string;
}) {
  const variants = {
    default: "mx-auto w-full max-w-5xl",
    wide: "mx-auto w-full max-w-7xl",
    full: "w-full max-w-none",
  };

  return (
    <div className={cn(variants[variant], className)}>
      {children}
    </div>
  );
}
