"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { useActivityFeed, type ActivityEvent, type ActivityEventType } from "@/lib/hooks/useActivityFeed";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Send,
  Webhook,
  KeyRound,
  ChevronRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const EVENT_CONFIG: Record<
  ActivityEventType,
  { icon: typeof CheckCircle2; color: string; bgColor: string }
> = {
  payment_received: {
    icon: Zap,
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
  },
  settlement_initiated: {
    icon: Send,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
  },
  settlement_completed: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
  },
  webhook_delivered: {
    icon: Webhook,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
  },
  api_key_used: {
    icon: KeyRound,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
  },
};

function formatTimestamp(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ActivityItem = memo(function ActivityItem({ event }: { event: ActivityEvent }) {
  const config = EVENT_CONFIG[event.type] ?? {
    icon: Clock,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  };
  const Icon = config.icon;

  return (
    <Link
      href={event.detailHref}
      className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-muted transition-colors group"
    >
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
          config.bgColor,
        )}
      >
        <Icon className={cn("w-4 h-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {event.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {event.description}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {formatTimestamp(event.timestamp)}
        </span>
        <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
});

function FeedSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 px-2">
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export interface ActivityFeedProps {
  className?: string;
}

export function ActivityFeed({ className }: ActivityFeedProps) {
  const { events, isLoading, error, refetch } = useActivityFeed(20);

  return (
    <Card
      className={cn(
        "border border-border bg-card shadow-sm",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Activity Feed
            </CardTitle>
            {!isLoading && events.length > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </div>
          <Link href="/transactions">
            <Button
              variant="ghost"
              className="text-xs text-primary hover:text-primary hover:bg-primary/10 min-h-[44px] px-2 rounded-lg font-semibold"
            >
              View all <ArrowRight className="w-3 h-3 ml-0.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error ? (
          <div className="py-8">
            <ErrorDisplay message={error} onRetry={refetch} />
          </div>
        ) : isLoading ? (
          <FeedSkeleton />
        ) : events.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Events will appear as they happen
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {events.map((event) => (
              <ActivityItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
