import { Skeleton } from '@/components/ui/skeleton';

interface CardGridSkeletonProps {
  cards?: number;
  className?: string;
}

export function CardGridSkeleton({ cards = 6, className }: CardGridSkeletonProps) {
  return (
    <div className={`grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${className ?? ''}`}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="space-y-3 p-4 border border-border rounded-xl">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
