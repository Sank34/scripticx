import { Skeleton } from "@/components/ui/skeleton";

export default function ExamplesLoading() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-10" aria-label="Loading examples">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-8 h-12 w-3/4 max-w-xl" />
      <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
      <Skeleton className="mt-12 h-8 w-48" />
      <Skeleton className="mt-4 h-64 w-full rounded-[var(--sx-radius-card)]" />
    </div>
  );
}
