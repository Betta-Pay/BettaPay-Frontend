"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api/axios";

export type ActivityEventType =
  | "payment_received"
  | "settlement_initiated"
  | "settlement_completed"
  | "webhook_delivered"
  | "api_key_used";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  description: string;
  timestamp: string;
  detailHref: string;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedResponse {
  data: ActivityEvent[];
}

const POLL_INTERVAL = 30_000;

function deduplicate(events: ActivityEvent[]): ActivityEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

export function useActivityFeed(limit = 20) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await apiClient.get<ActivityFeedResponse>(
        `/api/activity?limit=${limit}`,
      );
      const incoming = res.data?.data ?? res.data ?? [];
      if (mountedRef.current) {
        setEvents((prev) => deduplicate([...incoming, ...prev]).slice(0, limit));
        setError(null);
      }
    } catch {
      if (mountedRef.current) {
        setError("Failed to load activity feed");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [limit]);

  useEffect(() => {
    mountedRef.current = true;
    fetchEvents();

    const id = setInterval(fetchEvents, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchEvents]);

  return { events, isLoading, error, refetch: fetchEvents };
}
