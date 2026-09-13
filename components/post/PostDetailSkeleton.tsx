import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PostDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5" aria-busy="true" aria-label="Loading post">
      <div className="flex items-center justify-between border-b border-border/70 pb-4">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-5">
          <Card className="gap-0 rounded-2xl py-0 shadow-none ring-border/80">
            <CardHeader className="flex flex-row items-center gap-3 px-5 pb-0 pt-5">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </CardHeader>

            <CardContent className="space-y-4 px-5 py-5">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/5" />
              </div>
              <Skeleton className="h-56 w-full rounded-xl" />
            </CardContent>

            <div className="grid grid-cols-3 border-t border-border/70 px-3 py-2">
              <Skeleton className="mx-auto h-8 w-16 rounded-lg" />
              <Skeleton className="mx-auto h-8 w-16 rounded-lg" />
              <Skeleton className="mx-auto h-8 w-16 rounded-lg" />
            </div>
          </Card>

          <Card className="rounded-2xl shadow-none ring-border/80">
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1 rounded-full" />
                <Skeleton className="h-9 w-20 rounded-lg" />
              </div>
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-2 rounded-xl bg-muted/40 p-3">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="hidden space-y-4 xl:block">
          <Card className="rounded-2xl shadow-none ring-border/80">
            <CardContent className="space-y-4 text-center">
              <Skeleton className="mx-auto size-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="mx-auto h-4 w-28" />
                <Skeleton className="mx-auto h-3 w-36" />
              </div>
              <Skeleton className="h-8 w-full rounded-lg" />
            </CardContent>
          </Card>
          <Skeleton className="h-28 w-full rounded-2xl" />
        </aside>
      </div>
    </div>
  );
}
