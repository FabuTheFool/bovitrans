import { cn } from '@/lib/utils';

/**
 * Skeleton — placeholder animado con pulse + shimmer sutil.
 * Se usa con tamaños específicos (h-X w-Y) o como wrapper.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted/60',
        className,
      )}
      {...props}
    />
  );
}
