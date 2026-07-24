import { Skeleton } from '@/components/ui';
import { Card, CardHeader, CardContent } from '@/components/ui';

export default function MerchantLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Revenue Chart Card */}
        <Card className="lg:col-span-4 border border-border bg-card shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-36 bg-muted" />
                <Skeleton className="h-3 w-56 bg-muted" />
              </div>
              <Skeleton className="h-7 w-28 bg-muted" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Chart Area Placeholder */}
            <Skeleton className="h-[260px] w-full bg-muted/70" />
            <div className="flex items-center gap-6 pt-4 border-t border-border">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16 bg-muted" />
                <Skeleton className="h-4 w-28 bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16 bg-muted" />
                <Skeleton className="h-4 w-20 bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions Card */}
        <Card className="lg:col-span-3 border border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 bg-muted" />
              <Skeleton className="h-6 w-16 bg-muted" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-xl bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-full max-w-[140px] bg-muted" />
                    <Skeleton className="h-3 w-full max-w-[100px] bg-muted" />
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <Skeleton className="h-3.5 w-12 bg-muted" />
                    <Skeleton className="h-4 w-16 rounded-full bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Payment Link Performance Skeleton */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Quick Actions Card */}
        <Card className="lg:col-span-3 border border-border bg-card shadow-sm">
          <CardHeader>
            <Skeleton className="h-4 w-24 bg-muted" />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/50">
                <Skeleton className="w-5 h-5 rounded-md bg-muted" />
                <Skeleton className="h-3 w-20 bg-muted" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Payment Link Performance Card */}
        <Card className="lg:col-span-4 border border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-44 bg-muted" />
              <Skeleton className="h-6 w-16 bg-muted" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-border">
                  <Skeleton className="w-10 h-10 rounded-xl bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-28 bg-muted" />
                    <Skeleton className="h-3 w-36 bg-muted" />
                    <div className="flex items-center gap-2 mt-1">
                      <Skeleton className="flex-1 h-1.5 rounded-full bg-muted" />
                      <Skeleton className="h-3 w-6 bg-muted" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <Skeleton className="h-3.5 w-8 bg-muted" />
                    <Skeleton className="h-3 w-14 bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Skeleton className="lg:col-span-4 h-[340px] rounded-xl" />
        <Skeleton className="lg:col-span-3 h-[340px] rounded-xl" />
      </div>
    </div>
  );
}
