import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Skeleton className="lg:col-span-4 h-[340px] rounded-xl" />
        <Skeleton className="lg:col-span-3 h-[340px] rounded-xl" />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Skeleton className="lg:col-span-3 h-48 rounded-xl" />
        <Skeleton className="lg:col-span-4 h-48 rounded-xl" />
      </div>
    </div>
  );
}
