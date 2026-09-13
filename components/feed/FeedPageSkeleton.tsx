import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FeedPostSkeleton() {
  return (
    <Card
      className="gap-0 overflow-hidden rounded-2xl py-0 shadow-none ring-border/80"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 px-5 pt-5">
        <Skeleton className="size-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
      <div className="space-y-2 px-5 py-5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      <div className="grid grid-cols-3 border-t border-border/70 px-3 py-2">
        <Skeleton className="mx-auto h-8 w-14 rounded-lg" />
        <Skeleton className="mx-auto h-8 w-14 rounded-lg" />
        <Skeleton className="mx-auto h-8 w-20 rounded-lg" />
      </div>
    </Card>
  );
}

export function FeedPageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-6"
      aria-busy="true"
      aria-label="Loading feed"
    >
      <header className="flex items-end justify-between gap-4 border-b border-border/70 pb-5">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-4 w-[min(70vw,34rem)]" />
        </div>
        <Skeleton className="hidden h-8 w-20 rounded-full sm:block" />
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 space-y-5">
          <Card className="gap-0 rounded-2xl py-0 shadow-none ring-border/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="h-11 flex-1 rounded-full" />
                <Skeleton className="hidden h-10 w-32 rounded-full sm:block" />
              </div>
              <div className="mt-4 flex gap-3 border-t border-border/70 pt-3 sm:pl-12">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2 px-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-52" />
          </div>

          <FeedPostSkeleton />
          <FeedPostSkeleton />
        </section>

        <aside className="hidden space-y-4 xl:block">
          <Card className="rounded-2xl shadow-none ring-border/80">
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Skeleton className="size-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-2 p-2">
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-7 w-16 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Skeleton className="h-36 w-full rounded-2xl" />
        </aside>
      </div>
    </div>
  );
}
