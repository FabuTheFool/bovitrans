import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      <header className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </header>

      <div className="rounded-xl border border-border bg-card/50 p-6 space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-6 space-y-3">
        <Skeleton className="h-5 w-44" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
