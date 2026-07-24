import { Skeleton } from '@/components/ui';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 6, columns = 7 }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton
              key={j}
              className={`h-5 rounded ${j === 0 ? 'w-24' : j === columns - 1 ? 'w-20' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
