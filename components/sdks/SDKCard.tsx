"use client";

import { toast } from "sonner";
import { Copy, ExternalLink, Check, Code2 } from "lucide-react";
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui";
import { Button, buttonVariants } from "@/components/ui";
import { cn } from "@/lib/utils";

interface SDKCardProps {
  name: string;
  language: string;
  version: string;
  installCommand: string;
  githubUrl: string;
  docsUrl: string;
  status: "published" | "coming-soon";
  description: string;
  icon: React.ReactNode;
}

export default function SDKCard({
  name,
  language,
  version,
  installCommand,
  githubUrl,
  docsUrl,
  status,
  description,
  icon,
}: SDKCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="relative transition-shadow hover:shadow-card-hover">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            {icon || <Code2 className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2">
              {name}
              <Badge
                variant={status === "published" ? "default" : "secondary"}
                className={cn(
                  status === "published"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {status === "published" ? "Published" : "Coming Soon"}
              </Badge>
            </CardTitle>
            <CardDescription>{language}</CardDescription>
          </div>
        </div>
        <CardAction>
          <Badge variant="outline" className="font-mono text-xs">
            v{version}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>

        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <code className="flex-1 text-xs font-mono text-foreground truncate">
            {installCommand}
          </code>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleCopy}
            aria-label={`Copy ${installCommand}`}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            GitHub
            <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </a>
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Documentation
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
