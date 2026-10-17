export default function AdminLoading() {
  return (
    <div className="gap-4 flex flex-col" aria-busy="true" aria-live="polite">
      <div className="h-8 w-40 animate-pulse rounded-md bg-surface-sunken" />
      <div className="h-4 w-64 animate-pulse rounded-md bg-surface-sunken" />
      <div className="gap-3 sm:grid-cols-2 xl:grid-cols-4 grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-border-subtle bg-surface"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg border border-border-subtle bg-surface" />
      <span className="sr-only">Loading admin…</span>
    </div>
  );
}
