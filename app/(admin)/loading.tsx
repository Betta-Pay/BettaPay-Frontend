import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Title + subtitle skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48 bg-muted" />
        <Skeleton className="h-4 w-96 bg-muted max-w-full" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-card border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-3 w-28 bg-muted" />
              <Skeleton className="h-4 w-4 bg-muted" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-32 bg-muted" />
              <Skeleton className="h-3.5 w-24 bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + System Health Grid */}
      <div className="grid gap-4 md:grid-cols-7">
        {/* Platform Volume Chart Skeleton */}
        <Card className="col-span-4 bg-card border shadow-sm">
          <CardHeader>
            <Skeleton className="h-4 w-40 bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-[300px] w-full bg-muted/70 mt-4" />
          </CardContent>
        </Card>

        {/* System Health Status List Skeleton */}
        <Card className="col-span-3 bg-card border shadow-sm">
          <CardHeader>
            <Skeleton className="h-4 w-28 bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Status dot indicator */}
                    <Skeleton className="w-2.5 h-2.5 rounded-full bg-muted" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-28 bg-muted" />
                      <Skeleton className="h-3 w-16 bg-muted" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-12 bg-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
