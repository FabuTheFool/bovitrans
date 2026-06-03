import { Skeleton } from '@/components/ui/skeleton';

export default function RequestDetailLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-4 w-32" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card/50 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-24" />
          </div>
        ))}
      </section>

      <section>
        <Skeleton className="mb-3 h-5 w-16" />
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-1">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
          <Skeleton className="h-[360px] w-full rounded-xl lg:col-span-2" />
        </div>
      </section>
    </div>
  );
}
