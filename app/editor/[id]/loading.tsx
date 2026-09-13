import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingProjectPage() {
  return (
    <div className="sx-page pb-16">
      <div className="mx-auto max-w-6xl space-y-8">
        <Skeleton className="h-7 w-36" />
        <div className="space-y-5 border-b border-border pb-8">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-11 w-2/3 max-w-xl" />
            <Skeleton className="h-5 w-full max-w-2xl" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-[360px] w-full rounded-[var(--sx-radius-card)]" />
        </div>
      </div>
    </div>
  );
}
