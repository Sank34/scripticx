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
    default: "max-w-5xl mx-auto p-6",
    wide: "max-w-7xl mx-auto p-6",
    full: "w-full max-w-none p-6",
  };

  return (
    <div className={cn(variants[variant], className)}>
      {children}
    </div>
  );
}