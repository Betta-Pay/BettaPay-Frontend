import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div className="space-y-6">
      {/* Form Header Skeleton */}
      <div className="space-y-2 text-center">
        <Skeleton className="h-7 w-48 bg-muted mx-auto" />
        <Skeleton className="h-4 w-72 bg-muted mx-auto max-w-full" />
      </div>

      {/* Input Fields Skeleton */}
      <div className="space-y-4">
        {/* Field 1 */}
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-12 bg-muted" />
          <Skeleton className="h-10 w-full bg-muted rounded-xl" />
        </div>

        {/* Field 2 */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-16 bg-muted" />
            <Skeleton className="h-3.5 w-24 bg-muted" />
          </div>
          <Skeleton className="h-10 w-full bg-muted rounded-xl" />
        </div>

        {/* Action Button */}
        <Skeleton className="h-10 w-full bg-muted rounded-xl mt-2" />
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <span className="relative bg-card px-2">
          <Skeleton className="h-3 w-8 bg-muted" />
        </span>
      </div>

      {/* Secondary Button (Wallet Connect) */}
      <Skeleton className="h-10 w-full bg-muted rounded-xl" />

      {/* Footer Text Link */}
      <Skeleton className="h-4 w-44 bg-muted mx-auto" />
    </div>
  );
}
