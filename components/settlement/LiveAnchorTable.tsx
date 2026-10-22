"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/axios";
import { RefreshCcw } from "lucide-react";
import type { Anchor, SepProtocol } from "@/lib/types";

interface AnchorListResponse {
  data: Anchor[];
}

type ProtocolFilter = "all" | SepProtocol;

const PROTOCOL_FILTERS: ReadonlyArray<{ value: ProtocolFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "SEP-24", label: "SEP-24" },
  { value: "SEP-31", label: "SEP-31" },
];

const PROTOCOL_FILTER_TITLES: Record<ProtocolFilter, string> = {
  all: "Show anchors supporting any protocol",
  "SEP-24": "Show anchors supporting SEP-24 interactive deposit/withdrawal",
  "SEP-31": "Show anchors supporting SEP-31 cross-border direct payments",
};

const PROTOCOL_BADGE_STYLES: Record<SepProtocol, string> = {
  "SEP-24":
    "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  "SEP-31":
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
};

function usePublicAnchors() {
  return useQuery<AnchorListResponse, Error>({
    queryKey: ["public", "anchors"],
    queryFn: async () => {
      const res = await apiClient.get<AnchorListResponse>("/api/anchors");
      return res.data ?? { data: [] };
    },
    staleTime: 60_000,
  });
}

export default function LiveAnchorTable() {
  const { data, isLoading, error, refetch } = usePublicAnchors();
  const [protocolFilter, setProtocolFilter] = useState<ProtocolFilter>("all");
  const anchors = useMemo(() => data?.data ?? [], [data]);

  const filteredAnchors = useMemo(
    () =>
      protocolFilter === "all"
        ? anchors
        : anchors.filter((anchor) => (anchor.protocols ?? []).includes(protocolFilter)),
    [anchors, protocolFilter]
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-8 flex items-center justify-center">
          <RefreshCcw className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading supported anchors...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Unable to load anchor data.{" "}
            <button
              onClick={() => void refetch()}
              className="text-primary hover:underline font-medium"
            >
              Retry
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (anchors.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No anchors are currently available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-foreground">
          Filter by protocol
        </span>
        <div
          role="tablist"
          aria-label="Filter anchors by SEP protocol"
          className="flex rounded-lg border border-border/50 bg-background/50 p-0.5"
        >
          {PROTOCOL_FILTERS.map((filter) => {
            const isActive = protocolFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                title={PROTOCOL_FILTER_TITLES[filter.value]}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setProtocolFilter(filter.value)}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-4 px-6 font-semibold">Country</th>
              <th className="py-4 px-6 font-semibold">Currency</th>
              <th className="py-4 px-6 font-semibold">Licensed Anchor</th>
              <th className="py-4 px-6 font-semibold">Protocols</th>
              <th className="py-4 px-6 font-semibold">KYC Level</th>
              <th className="py-4 px-6 font-semibold">Settlement Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredAnchors.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 px-6 text-center text-sm text-muted-foreground"
                >
                  No anchors support {protocolFilter}.
                </td>
              </tr>
            ) : (
              filteredAnchors.map((anchor) => (
                <tr
                  key={anchor.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="py-4 px-6 font-medium text-foreground flex items-center gap-3">
                    <span className="text-xl">{anchor.flag}</span>
                    {anchor.country}
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-primary">
                    {anchor.currency}
                  </td>
                  <td className="py-4 px-6 text-foreground font-medium">
                    {anchor.name}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1.5">
                      {(anchor.protocols ?? []).map((protocol) => (
                        <span
                          key={protocol}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${PROTOCOL_BADGE_STYLES[protocol]}`}
                        >
                          {protocol}
                        </span>
                      ))}
                      {(anchor.protocols ?? []).length === 0 && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
                      {anchor.kycLevels
                        .map((l) => l.charAt(0).toUpperCase() + l.slice(1))
                        .join(", ")}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-medium text-emerald-600 dark:text-emerald-400">
                    {anchor.settlementTime}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
