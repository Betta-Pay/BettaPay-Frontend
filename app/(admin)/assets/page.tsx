"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Coins, Pencil, Plus, RefreshCcw, Search } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Toggle,
} from "@/components/ui";
import { EmptyState } from "@/components/shared";
import { PageHeader } from "@/components/shared/PageHeader";
import { AssetDialog } from "@/components/admin/AssetDialog";
import { useNotify } from "@/lib/hooks/useNotify";
import { useAdminAssets, useUpdateAsset } from "@/lib/assets/hooks";
import { getErrorMessage } from "@/lib/utils/apiError";
import type { SupportedAsset } from "@/lib/assets/types";

// ─── Page ─────────────────────────────────────────────────────────────────────

function shortIssuer(issuer: string): string {
  return issuer.length > 18 ? `${issuer.slice(0, 8)}…${issuer.slice(-6)}` : issuer || "—";
}

export default function AdminAssetsPage() {
  const notify = useNotify();
  const { data, isLoading, isFetching, error, refetch } = useAdminAssets();
  const update = useUpdateAsset();
  const [search, setSearch] = useState("");
  const [dialogAsset, setDialogAsset] = useState<SupportedAsset | null | undefined>(undefined);

  const assets = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
  }, [assets, search]);

  const handleToggle = (asset: SupportedAsset) => {
    const next = !asset.enabled;
    update.mutate(
      { code: asset.code, patch: { enabled: next } },
      {
        onSuccess: () => notify.success(`${asset.code} ${next ? "enabled" : "disabled"}`),
        // The hook has already rolled the row back; tell the admin why.
        onError: (err) => notify.error(`Couldn't ${next ? "enable" : "disable"} ${asset.code}: ${getErrorMessage(err)}`),
      },
    );
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        preTitle="Platform"
        title="Supported assets"
        description="Control which assets merchants can accept and settle in. Changes reach merchant pickers without a redeploy."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCcw className={`mr-1.5 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setDialogAsset(null)}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Add asset
            </Button>
          </div>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          aria-label="Search assets"
          className="pl-9"
          placeholder="Search by code or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Couldn&apos;t load assets</AlertTitle>
          <AlertDescription>
            <p>{getErrorMessage(error)}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-2" role="status" aria-busy="true" aria-label="Loading assets">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : !error && filtered.length === 0 ? (
        <EmptyState
          icon={Coins}
          title={search ? "No assets match your search" : "No supported assets yet"}
          description={search ? "Try a different code or name." : "Add the first asset merchants can accept."}
          action={search ? undefined : { label: "Add asset", onClick: () => setDialogAsset(null) }}
        />
      ) : (
        !error && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Issuer</TableHead>
                  <TableHead>Decimals</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((asset) => (
                  <TableRow key={asset.code}>
                    <TableCell>
                      <div className="font-semibold">{asset.code}</div>
                      <div className="text-xs text-muted-foreground">{asset.name}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs" title={asset.issuer}>
                      {shortIssuer(asset.issuer)}
                    </TableCell>
                    <TableCell>{asset.decimals}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Toggle
                          checked={asset.enabled}
                          label={`${asset.enabled ? "Disable" : "Enable"} ${asset.code}`}
                          onClick={() => handleToggle(asset)}
                        />
                        <Badge variant={asset.enabled ? "default" : "secondary"}>
                          {asset.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDialogAsset(asset)}
                        aria-label={`Edit ${asset.code}`}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      )}

      {dialogAsset !== undefined && (
        <AssetDialog
          key={dialogAsset?.code ?? "new"}
          asset={dialogAsset}
          open
          onOpenChange={(open) => {
            if (!open) setDialogAsset(undefined);
          }}
        />
      )}
    </div>
  );
}
