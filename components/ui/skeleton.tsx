"use client";

import type * as React from "react";
import {
  configureBoneyard,
  Skeleton as BoneyardSkeleton,
} from "boneyard-js/react";
import type { ResponsiveBones } from "boneyard-js";

import { cn } from "@/lib/utils";

configureBoneyard({
  animate: "pulse",
  color: "#e7e7e9",
  darkColor: "#27272a",
  select: "container",
  speed: "1.8s",
});

const primitiveBones: ResponsiveBones = {
  breakpoints: {
    1: {
      name: "ui-skeleton",
      viewportWidth: 1,
      width: 100,
      height: 100,
      bones: [[0, 0, 100, 100, 6]],
    },
  },
};

export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("relative overflow-hidden rounded-md", className)}
      {...props}
    >
      <BoneyardSkeleton
        name="ui-skeleton"
        loading
        initialBones={primitiveBones}
        fallback={
          <div
            aria-hidden="true"
            className="h-full w-full animate-pulse bg-muted"
          />
        }
        boneClass="!rounded-[inherit]"
        className="h-full w-full rounded-[inherit]"
      >
        <div aria-hidden="true" className="h-full w-full" />
      </BoneyardSkeleton>
    </div>
  );
}
