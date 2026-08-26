import { Skeleton } from "@/components/ui/skeleton";

export default function DocsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-10" aria-label="Loading documentation">
      <Skeleton className="h-4 w-44" />
      <Skeleton className="mt-8 h-12 w-3/4 max-w-xl" />
      <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
      <div className="mt-12 space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-56 w-full rounded-[var(--sx-radius-card)]" />
      </div>
    </div>
  );
}
