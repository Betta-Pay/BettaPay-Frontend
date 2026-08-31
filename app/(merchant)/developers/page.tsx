"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Skeleton } from "@/components/ui";
import { NetworkTooltip } from "@/components/ui";
import {
  Copy,
  Eye,
  EyeOff,
  Plus,
  Key,
  Globe,
  BookOpen,
  Code2,
  Terminal,
  Trash2,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";
import { useNotify } from "@/lib/hooks/useNotify";
import { apiClient } from "@/lib/api/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOfflineStore } from "@/lib/store/offlineStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";
import { Label } from "@/components/ui";
import { RateLimitDisplay } from "@/components/developers/RateLimitDisplay";
import { WebhookTester } from "@/components/developers/WebhookTester";
import { KeyUsagePanel } from "@/components/developers/KeyUsagePanel";

const CodeExample = dynamic(
  () =>
    import("@/components/developers/CodeExample").then((m) => ({
      default: m.CodeExample,
    })),
  {
    loading: () => <Skeleton className="h-64 rounded-xl" />,
  },
);

const initialKeys = [
  {
    id: "key_01",
    name: "Production Key",
    prefix: "bp_live_",
    suffix: "...a4f9",
    created: "2026-01-01",
    lastUsed: "2 hours ago",
    type: "live",
    scope: "full",
  },
  {
    id: "key_02",
    name: "Sandbox Key",
    prefix: "bp_test_",
    suffix: "...c2d8",
    created: "2026-01-05",
    lastUsed: "5 days ago",
    type: "test",
    scope: "read_write",
  },
];

export default function DevelopersPage() {
  const [keys, setKeys] = useState(initialKeys);
  const [showKey, setShowKey] = useState<string | null>(null);
  const isOnline = useOfflineStore((s) => s.isOnline);
  const notify = useNotify();

  const [webhookUrl, setWebhookUrl] = useState(
    "https://your-app.com/webhooks/bettapay",
  );

  // Create Key Dialog
  const [isCreateKeyOpen, setIsCreateKeyOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyType, setNewKeyType] = useState<"live" | "test">("test");
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  // Success Dialog for Full API Key
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [createdFullKey, setCreatedFullKey] = useState<string | null>(null);

  const handleCopy = useCallback(
    (text: string) => {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      }
      notify.success("Copied to clipboard");
    },
    [notify],
  );
  const handleCopyText = handleCopy;
  const handleCopyKey = useCallback(
    (key: { prefix: string; suffix: string }) => {
      handleCopy(`${key.prefix}${key.suffix}`);
    },
    [handleCopy],
  );

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      notify.error("Please enter a key name");
      return;
    }

    setIsCreatingKey(true);
    try {
      const response = await apiClient.post("/api/keys", {
        name: newKeyName.trim(),
        type: newKeyType,
      });

      const resData = response?.data || {};
      const prefix =
        resData.prefix || (newKeyType === "live" ? "bp_live_" : "bp_test_");
      const rawSecret =
        resData.key ||
        resData.rawKey ||
        resData.apiKey ||
        resData.secretKey ||
        `${prefix}${Math.random().toString(36).substring(2, 18)}`;
      const suffix = resData.suffix || `...${rawSecret.slice(-4)}`;

      const createdKey = {
        id: resData.id || `key_${Date.now()}`,
        name: resData.name || newKeyName,
        prefix,
        suffix,
        created: resData.created || new Date().toISOString().slice(0, 10),
        lastUsed: resData.lastUsed || "Never",
        type: resData.type || newKeyType,
        scope: resData.scope || "full",
      };

      setKeys((prev) => [createdKey, ...prev]);
      setIsCreateKeyOpen(false);
      setNewKeyName("");

      setCreatedFullKey(rawSecret);
      setIsSuccessDialogOpen(true);
      notify.success("API key generated successfully");
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to generate API key";
      notify.error(errorMsg);
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleRevokeKey = (id: string) => {
    setKeys(keys.filter((k) => k.id !== id));
    notify.info("API key revoked");
  };

  return (
    <div className="space-y-8 pb-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
          Integration
        </p>
        <h1 className="text-3xl font-bold text-foreground">Developers & API</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage API keys, inspect webhooks, access sandbox credentials, and
          integrate SDKs.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: BookOpen,
            label: "API Reference",
            desc: "Full REST API specifications",
            color: "amber",
          },
          {
            icon: Globe,
            label: "Webhooks",
            desc: "Real-time event subscriptions",
            color: "blue",
          },
          {
            icon: Code2,
            label: "SDK Libraries",
            desc: "Node.js, Python, PHP, Go",
            color: "emerald",
          },
        ].map(({ icon: Icon, label, desc, color }) => (
          <div
            key={label}
            className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all
            ${color === "amber" ? "border-primary/30 bg-primary/10 hover:bg-primary/20" : ""}
            ${color === "blue" ? "border-info/30 bg-info/10 hover:bg-info/20" : ""}
            ${color === "emerald" ? "border-success/30 bg-success/10 hover:bg-success/20" : ""}
          `}
          >
            <Icon
              className={`w-5 h-5 ${color === "amber" ? "text-primary" : ""} ${color === "blue" ? "text-info" : ""} ${color === "emerald" ? "text-success" : ""}`}
            />
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <RateLimitDisplay />

      {/* Sandbox Credentials Card */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" /> Sandbox Credentials &
            Testnet
          </CardTitle>
          <CardDescription>
            Use these keys to test payment links and SEP-24 anchor flows safely.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-1">
            <p className="text-xs text-muted-foreground uppercase font-bold">
              Sandbox Endpoint URL
            </p>
            <p className="font-mono text-xs text-foreground font-semibold">
              https://sandbox.api.bettapay.io/v1
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-1">
            <p className="text-xs text-muted-foreground uppercase font-bold">
              Stellar Testnet Horizon URL
            </p>
            <p className="font-mono text-xs text-foreground font-semibold">
              https://horizon-testnet.stellar.org
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" /> API Keys
            </CardTitle>
            <CardDescription>
              Authentication tokens for server-to-server API calls
            </CardDescription>
          </div>
          <NetworkTooltip show={!isOnline}>
            <Button
              disabled={!isOnline}
              aria-disabled={!isOnline}
              onClick={() => setIsCreateKeyOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-9 px-4 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Key
            </Button>
          </NetworkTooltip>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-border hover:bg-muted/50 transition-all"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold
                  ${key.type === "live" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}
                >
                  {key.type === "live" ? "LV" : "TS"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {key.name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {key.prefix}
                    {showKey === key.id ? "••••...••••" : "••••••••••••••••"}
                    {key.suffix}
                  </p>
                </div>
                <div className="hidden sm:flex sm:flex-col sm:items-end sm:gap-2">
                  <KeyUsagePanel keyId={key.id} />
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Last used</p>
                    <p className="text-xs font-medium text-foreground">
                      {key.lastUsed}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Toggle visibility"
                    className="min-h-[44px] min-w-[44px] rounded-lg"
                    onClick={() =>
                      setShowKey(showKey === key.id ? null : key.id)
                    }
                  >
                    {showKey === key.id ? (
                      <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copy API key"
                    className="min-h-[44px] min-w-[44px] rounded-lg"
                    onClick={() => handleCopyKey(key)}
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Revoke API key"
                    className="min-h-[44px] min-w-[44px] rounded-lg text-muted-foreground hover:text-destructive"
                    onClick={() => handleRevokeKey(key.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quickstart code */}
      <CodeExample onCopy={handleCopyText} />

      {/* Webhook Endpoint URL Config */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> Webhook Endpoint
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="flex-1 h-10 border-border rounded-xl text-sm font-mono bg-muted"
          />
          <Button
            onClick={() => notify.success("Webhook endpoint updated")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 px-4 text-sm font-semibold shrink-0"
          >
            Save
          </Button>
        </CardContent>
      </Card>

      <WebhookTester initialEndpointUrl={webhookUrl} />

      {/* New API Key Dialog */}
      <Dialog open={isCreateKeyOpen} onOpenChange={setIsCreateKeyOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for backend integrations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <Input
                placeholder="e.g. Node.js Payment Worker"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select
                value={newKeyType}
                onValueChange={(val) =>
                  val && setNewKeyType(val as "live" | "test")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Testnet (bp_test_)</SelectItem>
                  <SelectItem value="live">Mainnet Live (bp_live_)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsCreateKeyOpen(false)}
              disabled={isCreatingKey}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={isCreatingKey}>
              {isCreatingKey ? (
                <>
                  <RefreshCcw className="w-3.5 h-3.5 mr-2 animate-spin" />{" "}
                  Generating...
                </>
              ) : (
                "Generate Key"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key Created Success Dialog */}
      <Dialog
        open={isSuccessDialogOpen}
        onOpenChange={(open) => {
          setIsSuccessDialogOpen(open);
          if (!open) setCreatedFullKey(null);
        }}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Key className="w-5 h-5 text-primary" /> Save Your API Key
            </DialogTitle>
            <DialogDescription className="text-amber-600 dark:text-amber-400 font-medium pt-1 flex items-start gap-1.5 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              Please copy your full API key now. For security reasons, it will
              not be shown again after you close this dialog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Full API Key
              </Label>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted border border-border">
                <code className="flex-1 font-mono text-xs text-foreground break-all select-all">
                  {createdFullKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-8 rounded-lg text-xs"
                  onClick={() => createdFullKey && handleCopy(createdFullKey)}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy Key
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              onClick={() => {
                setIsSuccessDialogOpen(false);
                setCreatedFullKey(null);
              }}
            >
              Done / I&apos;ve Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
