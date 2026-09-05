"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Button } from "@/components/ui";
import { Skeleton } from "@/components/ui";
import { EmptyState, ErrorDisplay } from "@/components/shared";
import {
  useActivityFeed,
  type ActivityEvent,
  type ActivityEventType,
  type ActivityConnectionStatus,
} from "@/lib/hooks/useActivityFeed";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Send,
  Webhook,
  KeyRound,
  ChevronRight,
  Zap,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Event icon / colour config ───────────────────────────────────────────────

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

// ─── Connection status indicator ─────────────────────────────────────────────

function ConnectionDot({
  status,
  hasEvents,
}: {
  status: ActivityConnectionStatus;
  hasEvents: boolean;
}) {
  if (!hasEvents && status !== "connected" && status !== "polling") return null;

  if (status === "connected") {
    return (
      <span
        className="relative flex h-2 w-2"
        title="Live — receiving real-time updates"
        aria-label="Live connection"
      >
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
    );
  }

  if (status === "polling") {
    return (
      <span
        className="relative flex h-2 w-2"
        title="Polling every 30 seconds (real-time unavailable)"
        aria-label="Polling mode"
      >
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
      </span>
    );
  }

  return null;
}

function PollingBanner({ status }: { status: ActivityConnectionStatus }) {
  if (status !== "polling") return null;
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs mb-2">
      <WifiOff className="w-3 h-3 shrink-0" />
      Real-time stream unavailable — refreshing every 30 s
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function groupEventsByDay(events: ActivityEvent[]) {
  const groups: Record<string, ActivityEvent[]> = {};
  events.forEach((event) => {
    const date = new Date(event.timestamp);
    const dateStr = date.toDateString();
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(event);
  });
  return groups;
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Activity item ────────────────────────────────────────────────────────────

const ActivityItem = memo(function ActivityItem({
  event,
}: {
  event: ActivityEvent;
}) {
  const config = EVENT_CONFIG[event.type] ?? {
    icon: Clock,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  };
  const Icon = config.icon as unknown as React.ComponentType<{ className?: string; }>;

  return (
    <Link
      href={event.detailHref}
      className="flex items-center gap-3 py-2 px-2.5 rounded-xl hover:bg-muted transition-colors group"
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
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24 rounded-lg" />
          <div className="space-y-1">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 py-2 px-2">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3 w-12 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface ActivityFeedProps {
  className?: string;
}

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "payments", label: "Payments" },
  { value: "settlements", label: "Settlements" },
  { value: "webhooks", label: "Webhooks" },
];

export function ActivityFeed({ className }: ActivityFeedProps) {
  const [filter, setFilter] = useState("all");
  const {
    events,
    isLoading,
    error,
    refetch,
    connectionStatus,
    loadMore,
    hasNextPage,
    isFetchingNextPage,
  } = useActivityFeed(10, filter);

  // Group events by day
  const grouped = groupEventsByDay(events);
  const sortedDays = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  // Infinite Scroll Observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading || isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;

      if (typeof IntersectionObserver !== "undefined") {
        observerRef.current = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && hasNextPage) {
            void loadMore();
          }
        });
        observerRef.current.observe(node);
      }
    },
    [isLoading, isFetchingNextPage, hasNextPage, loadMore]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return (
    <Card
      className={cn("border border-border bg-card shadow-sm flex flex-col max-h-[600px]", className)}
    >
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Activity Feed
            </CardTitle>
            <ConnectionDot
              status={connectionStatus}
              hasEvents={events.length > 0}
            />
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

      <CardContent className="pt-0 flex-1 overflow-y-auto flex flex-col min-h-0">
        <PollingBanner status={connectionStatus} />

        {/* Filter Toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl mb-4 text-xs font-semibold shrink-0">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                "flex-1 min-h-[32px] px-2.5 rounded-lg transition-all whitespace-nowrap",
                filter === tab.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="py-8 my-auto">
            <ErrorDisplay message={error} onRetry={refetch} />
          </div>
        ) : isLoading ? (
          <FeedSkeleton />
        ) : events.length === 0 ? (
          <div className="my-auto py-8">
            <EmptyState
              icon={Clock}
              title="No activity yet"
              description="Events will appear here as payments, settlements, and webhook deliveries occur."
              compact
            />
          </div>
        ) : (
          <div className="flex-1 space-y-4 pr-1">
            {sortedDays.map((day) => (
              <div key={day} className="space-y-1">
                <h4 className="text-xs font-semibold text-muted-foreground px-2 py-1 sticky top-0 bg-card/90 backdrop-blur-sm z-10">
                  {getDayLabel(day)}
                </h4>
                <div className="space-y-0.5">
                  {grouped[day].map((event) => (
                    <ActivityItem key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ))}

            {/* Sentinel for Infinite Scroll */}
            {hasNextPage && (
              <div ref={sentinelRef} className="h-4 flex justify-center items-center py-4">
                {isFetchingNextPage && (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
