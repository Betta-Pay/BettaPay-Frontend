"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Badge, buttonVariants } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SDK_TYPE_LABELS, type SDKDefinition } from "@/lib/sdks";
import type { SdkRelease } from "@/lib/sdks/registry";
import { SDK_ICONS } from "./icons";
import { CopyableCode } from "./CopyableCode";

export const PACKAGE_MANAGERS = ["npm", "yarn", "pnpm", "bun"] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];
export const PACKAGE_MANAGER_STORAGE_KEY = "bettapay:sdk:package-manager";

/**
 * Format an npm install command (`npm install @bettapay/sdk`) for the selected
 * JavaScript package manager (`npm`, `yarn`, `pnpm`, or `bun`). Non-npm commands
 * (e.g. `pip install`, `cargo add`) are returned unchanged.
 */
export function formatPackageManagerInstall(
  installCommand: string,
  manager: PackageManager,
): string {
  const npmMatch = installCommand.trim().match(/^npm\s+(?:install|i)\s+(.+)$/);
  if (!npmMatch) {
    return installCommand;
  }
  const pkg = npmMatch[1].trim();
  switch (manager) {
    case "yarn":
      return `yarn add ${pkg}`;
    case "pnpm":
      return `pnpm add ${pkg}`;
    case "bun":
      return `bun add ${pkg}`;
    case "npm":
    default:
      return `npm install ${pkg}`;
  }
}

export function isNpmInstallCommand(installCommand: string): boolean {
  return /^npm\s+(?:install|i)\s+/.test(installCommand.trim());
}

export interface SDKCardProps {
  sdk: SDKDefinition;
  release?: SdkRelease;
  packageManager?: PackageManager;
  onPackageManagerChange?: (manager: PackageManager) => void;
}

export function SDKCard({
  sdk,
  release,
  packageManager: controlledManager,
  onPackageManagerChange,
}: SDKCardProps) {
  const [internalManager, setInternalManager] = useState<PackageManager>("npm");
  const activeManager = controlledManager ?? internalManager;

  useEffect(() => {
    if (controlledManager !== undefined || typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(PACKAGE_MANAGER_STORAGE_KEY);
      if (saved && (PACKAGE_MANAGERS as readonly string[]).includes(saved)) {
        setInternalManager(saved as PackageManager);
      }
    } catch {
      // ignore storage errors
    }
  }, [controlledManager]);

  const selectManager = (next: PackageManager) => {
    setInternalManager(next);
    onPackageManagerChange?.(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(PACKAGE_MANAGER_STORAGE_KEY, next);
      } catch {
        // ignore storage errors
      }
    }
  };

  const published = release?.status === "published" || sdk.status === "published";
  const version = release?.version ?? sdk.version;
  const supportsPackageSwitcher =
    sdk.id === "typescript" || isNpmInstallCommand(sdk.installCommand);
  const formattedInstall = supportsPackageSwitcher
    ? formatPackageManagerInstall(sdk.installCommand, activeManager)
    : sdk.installCommand;

  return (
    <article
      data-testid={`sdk-card-${sdk.id}`}
      className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-xs"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden="true">{SDK_ICONS[sdk.id]}</span>
        <h3 className="text-lg font-semibold text-foreground">{sdk.name}</h3>
        <Badge
          variant="outline"
          className={cn(
            published
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {published ? "Published" : "Unreleased"}
        </Badge>
        <Badge variant="outline" className="font-mono text-xs">
          v{version}
        </Badge>
        {sdk.types.map((type) => (
          <Badge key={type} variant="secondary">
            {SDK_TYPE_LABELS[type]}
          </Badge>
        ))}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{sdk.description}</p>

      <div className="space-y-2">
        {supportsPackageSwitcher && (
          <div
            role="tablist"
            aria-label="Package manager"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1"
          >
            {PACKAGE_MANAGERS.map((pm) => {
              const selected = pm === activeManager;
              return (
                <button
                  key={pm}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => selectManager(pm)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-mono font-medium transition-colors",
                    selected
                      ? "bg-card text-primary shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {pm}
                </button>
              );
            })}
          </div>
        )}

        <CopyableCode
          code={formattedInstall}
          label={`${sdk.language} install command`}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <a
          href={sdk.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            typeof buttonVariants === "function"
              ? buttonVariants({ variant: "outline", size: "sm" })
              : "inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium",
          )}
        >
          GitHub
          <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
        </a>
        <a
          href={sdk.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            typeof buttonVariants === "function"
              ? buttonVariants({ variant: "ghost", size: "sm" })
              : "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium",
          )}
        >
          Documentation
        </a>
      </div>
    </article>
  );
}
