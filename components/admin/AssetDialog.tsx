"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Toggle,
} from "@/components/ui";
import { useNotify } from "@/lib/hooks/useNotify";
import {
  useCreateAsset,
  useDeleteAsset,
  useUpdateAsset,
} from "@/lib/assets/hooks";
import { getErrorMessage } from "@/lib/utils/apiError";
import type { SupportedAsset } from "@/lib/assets/types";
import { assetFormSchema, type AssetFormValues } from "@/lib/assets/validation";

const EMPTY_FORM: AssetFormValues = {
  code: "",
  name: "",
  issuer: "",
  decimals: 7,
  enabled: true,
};

function formFromAsset(asset: SupportedAsset | null): AssetFormValues {
  if (!asset) return EMPTY_FORM;
  return {
    code: asset.code,
    name: asset.name,
    issuer: asset.issuer,
    decimals: asset.decimals,
    enabled: asset.enabled,
  };
}

interface AssetDialogProps {
  asset: SupportedAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetDialog({ asset, open, onOpenChange }: AssetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <AssetDialogForm
          key={`${asset?.code ?? "new"}:${open}`}
          asset={asset}
          onClose={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}

function AssetDialogForm({
  asset,
  onClose,
}: {
  asset: SupportedAsset | null;
  onClose: () => void;
}) {
  const notify = useNotify();
  const create = useCreateAsset();
  const update = useUpdateAsset();
  const remove = useDeleteAsset();
  const editing = asset !== null;

  const [form, setForm] = useState<AssetFormValues>(() => formFromAsset(asset));
  const [errors, setErrors] = useState<Partial<Record<keyof AssetFormValues, string>>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const busy = create.isPending || update.isPending || remove.isPending;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
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
            onClose();
          },
          onError: (err) => notify.error(getErrorMessage(err)),
        },
      );
    } else {
      create.mutate(values, {
        onSuccess: () => {
          notify.success(`${values.code} added. Merchants can select it now.`);
          onClose();
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
        onClose();
      },
      onError: (err) => notify.error(getErrorMessage(err)),
    });
  };

  const field = (key: keyof AssetFormValues) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `asset-${key}-error` : undefined,
  });

  return (
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
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Add asset"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
