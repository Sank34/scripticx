"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatCardProps = {
  className?: string;
  icon?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
  value: ReactNode;
  valueClassName?: string;
};

export function StatCard({
  className,
  icon,
  subtitle,
  title,
  value,
  valueClassName = "text-2xl font-bold",
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={valueClassName}>{value}</div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
