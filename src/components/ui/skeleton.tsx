export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-zinc-100 ${className}`} />
  );
}

/**
 * Route-level loading placeholder. Rendered instantly by Next.js while the
 * server component streams its data, so navigation feels immediate.
 */
export function PageLoading({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-5"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-2">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
