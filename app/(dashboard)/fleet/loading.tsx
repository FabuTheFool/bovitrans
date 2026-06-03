import { Skeleton } from '@/components/ui/skeleton';

export default function FleetLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-11 w-36" />
      </header>

      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card/50">
        <div className="border-b border-border bg-muted/30 p-3">
          <div className="grid grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4" />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-border p-3 last:border-b-0">
            <div className="grid grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-4" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
