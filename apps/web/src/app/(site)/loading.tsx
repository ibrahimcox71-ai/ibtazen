import { Skeleton } from "@ibtatech/ui";

/** Route-level skeleton while a site page streams (matches the hero+section rhythm). */
export default function SiteLoading() {
  return (
    <div className="max-w-7xl px-4 py-12 sm:px-6 lg:px-8 mx-auto w-full" aria-busy="true">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-6 h-12 max-w-2xl w-full" />
      <Skeleton className="mt-4 h-5 max-w-xl w-full" />
      <div className="mt-10 gap-6 sm:grid-cols-2 lg:grid-cols-3 grid">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
      <span className="sr-only">Loading page…</span>
    </div>
  );
}
