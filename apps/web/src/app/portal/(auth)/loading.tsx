import { Skeleton } from "@ibtatech/ui";

/** Route-level skeleton for portal pages (all are force-dynamic). */
export default function PortalLoading() {
  return (
    <div className="gap-4 flex flex-col" aria-busy="true" aria-live="polite">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="gap-4 sm:grid-cols-2 grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <span className="sr-only">Loading portal…</span>
    </div>
  );
}
