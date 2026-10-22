"use client";

import { useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Badge, buttonVariants } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SDKS, SDK_TYPE_LABELS } from "@/lib/sdks";
import { SDK_SAMPLES } from "@/lib/sdks/samples";
import type { SdkRelease } from "@/lib/sdks/registry";
import { SDK_ICONS } from "./icons";
import { CopyableCode } from "./CopyableCode";
import { TryItPanel } from "./TryItPanel";

interface SDKPlaygroundProps {
  releases: SdkRelease[];
}

export function SDKPlayground({ releases }: SDKPlaygroundProps) {
  const [activeId, setActiveId] = useState(SDKS[0].id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const sdk = SDKS.find((item) => item.id === activeId) ?? SDKS[0];
  const sample = SDK_SAMPLES.find((item) => item.id === sdk.id);
  const release = releases.find((item) => item.id === sdk.id);
  const published = release?.status === "published";
  const version = release?.version ?? sdk.version;

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = SDKS[(index + step + SDKS.length) % SDKS.length];
    setActiveId(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <section aria-label="SDK playground" className="mb-16 space-y-6">
      <div role="tablist" aria-label="SDK language" className="flex flex-wrap gap-2">
        {SDKS.map((item, index) => {
          const selected = item.id === sdk.id;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              role="tab"
              id={`sdk-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`sdk-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                selected ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
              )}
            >
              <span aria-hidden="true">{SDK_ICONS[item.id]}</span>
              {item.language}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`sdk-panel-${sdk.id}`}
        aria-labelledby={`sdk-tab-${sdk.id}`}
        className="space-y-6"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{sdk.name}</h2>
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
          <span className="text-xs text-muted-foreground">
            {published
              ? `Latest on ${release?.registry}`
              : `Not on ${release?.registry ?? "the registry"} yet — planned version`}
          </span>
          {sdk.types.map((type) => (
            <Badge key={type} variant="secondary">
              {SDK_TYPE_LABELS[type]}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{sdk.description}</p>

        {sample && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">1. Install</h3>
              <CopyableCode code={sample.install} label={`${sdk.language} install command`} />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">2. Request a quote</h3>
              <CopyableCode code={sample.quickstart} label={`${sdk.language} quickstart`} />
            </div>
          </div>
        )}

        <TryItPanel />

        <div className="flex items-center gap-2">
          <a
            href={sdk.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            GitHub
            <ExternalLink className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <a
            href={sdk.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Documentation
          </a>
        </div>
      </div>
    </section>
  );
}
