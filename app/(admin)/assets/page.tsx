"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Coins, Pencil, Plus, RefreshCcw, Search } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useNotify } from "@/lib/hooks/useNotify";
import {
  useAdminAssets,
  useCreateAsset,
  useDeleteAsset,
  useUpdateAsset,
} from "@/lib/assets/hooks";
import { getErrorMessage } from "@/lib/utils/apiError";
import type { SupportedAsset } from "@/lib/assets/types";
import { assetFormSchema, type AssetFormValues } from "@/lib/assets/validation";

// ─── Create / edit dialog ─────────────────────────────────────────────────────

const EMPTY_FORM: AssetFormValues = {
  code: "",
  name: "",
  issuer: "",
  decimals: 7,
  enabled: true,
};

function AssetDialog({
  asset,
  open,
  onOpenChange,
}: {
  /** `null` creates a new asset; an asset edits it. */
  asset: SupportedAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const notify = useNotify();
  const create = useCreateAsset();
  const update = useUpdateAsset();
  const remove = useDeleteAsset();
  const editing = asset !== null;

  const [form, setForm] = useState<AssetFormValues>(
    asset
      ? {
          code: asset.code,
          name: asset.name,
          issuer: asset.issuer,
          decimals: asset.decimals,
          enabled: asset.enabled,
        }
      : EMPTY_FORM,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof AssetFormValues, string>>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const busy = create.isPending || update.isPending || remove.isPending;

  const close = () => onOpenChange(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = assetFormSchema.safeParse(form);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof AssetFormValues;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    const values = parsed.data;

    if (editing) {
      const { code, ...patch } = values;
      update.mutate(
        { code, patch },
        {
          onSuccess: () => {
            notify.success(`${code} updated`);
            close();
          },
          onError: (err) => notify.error(getErrorMessage(err)),
        },
      );
    } else {
      create.mutate(values, {
        onSuccess: () => {
          notify.success(`${values.code} added. Merchants can select it now.`);
          close();
        },
        onError: (err) => notify.error(getErrorMessage(err)),
      });
    }
  };

  const handleDelete = () => {
    if (!asset) return;
    remove.mutate(asset.code, {
      onSuccess: () => {
        notify.success(`${asset.code} removed`);
        close();
      },
      onError: (err) => notify.error(getErrorMessage(err)),
    });
  };

  const field = (key: keyof AssetFormValues) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `asset-${key}-error` : undefined,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${asset.code}` : "Add supported asset"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Changes apply to merchant currency pickers without a redeploy."
              : "Once enabled, the asset appears in merchant and onboarding currency pickers."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="asset-code" className="text-xs font-medium text-muted-foreground">
                Code *
              </label>
              <Input
                id="asset-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="USDC"
                disabled={editing}
                autoComplete="off"
                {...field("code")}
              />
              {errors.code && (
                <p id="asset-code-error" className="mt-1 text-xs text-destructive">
                  {errors.code}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="asset-name" className="text-xs font-medium text-muted-foreground">
                Name *
              </label>
              <Input
                id="asset-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="USD Coin"
                autoComplete="off"
                {...field("name")}
              />
              {errors.name && (
                <p id="asset-name-error" className="mt-1 text-xs text-destructive">
                  {errors.name}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="asset-issuer" className="text-xs font-medium text-muted-foreground">
              Issuer / contract ID *
            </label>
            <Input
              id="asset-issuer"
              className="font-mono text-xs"
              value={form.issuer}
              onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
              placeholder="CBGBGKJSUY7XYB6H…"
              autoComplete="off"
              spellCheck={false}
              {...field("issuer")}
            />
            {errors.issuer && (
              <p id="asset-issuer-error" className="mt-1 text-xs text-destructive">
                {errors.issuer}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="asset-decimals" className="text-xs font-medium text-muted-foreground">
                Decimals *
              </label>
              <Input
                id="asset-decimals"
                type="number"
                inputMode="numeric"
                min={0}
                max={18}
                value={Number.isNaN(form.decimals) ? "" : form.decimals}
                onChange={(e) =>
                  setForm((f) => ({ ...f, decimals: e.target.value === "" ? NaN : Number(e.target.value) }))
                }
                {...field("decimals")}
              />
              {errors.decimals && (
                <p id="asset-decimals-error" className="mt-1 text-xs text-destructive">
                  {errors.decimals}
                </p>
              )}
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Enabled</span>
              <div className="mt-2">
                <Toggle
                  checked={form.enabled}
                  label="Enabled"
                  onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
                />
              </div>
            </div>
          </div>

          {editing && confirmDelete && (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Delete {asset.code}?</AlertTitle>
              <AlertDescription>
                <p>
                  Merchants who selected it will see an &ldquo;unsupported&rdquo; state. To hide it
                  without losing history, disable it instead.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>
                    {remove.isPending ? "Deleting…" : "Yes, delete"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            {editing && !confirmDelete && (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function shortIssuer(issuer: string): string {
  return issuer.length > 18 ? `${issuer.slice(0, 8)}…${issuer.slice(-6)}` : issuer || "—";
}

export default function AdminAssetsPage() {
  const notify = useNotify();
  const { data, isLoading, isFetching, error, refetch } = useAdminAssets();
  const update = useUpdateAsset();
  const [search, setSearch] = useState("");
  // `undefined` = closed, `null` = creating, asset = editing. The key remounts
  // the dialog so its form always starts from the row that was opened.
  const [dialogAsset, setDialogAsset] = useState<SupportedAsset | null | undefined>(undefined);

  const assets = data ?? [];
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
