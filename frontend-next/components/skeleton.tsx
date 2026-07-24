/**
 * Shimmer loading placeholders. `Skeleton` is the primitive; the composed
 * variants below mirror the footprint of the real content they stand in for
 * (card grid, list rows, a detail page) so the layout doesn't jump when data
 * arrives. Decorative + non-interactive.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} aria-hidden />;
}

/** Grid of card-shaped skeletons — matches GameCard/MatchCard's footprint. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Match/player detail skeleton — score header + analysis panel footprint. */
export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14" aria-busy>
      <Skeleton className="mb-6 h-4 w-24" />
      <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex flex-1 flex-col items-center gap-2">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <Skeleton className="h-10 w-16" />
        <div className="flex flex-1 flex-col items-center gap-2">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/** Profile skeleton — header + a row of stat tiles (player pages). */
export function ProfileSkeleton({ tiles = 3 }: { tiles?: number }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14" aria-busy>
      <div className="mb-8 flex flex-col gap-2">
        <Skeleton className="h-11 w-56" />
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: tiles }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stacked list-row skeletons — for the news/transfers feeds and tables. */
export function RowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
