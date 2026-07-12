"use client";
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { NetworkTooltip } from '@/components/ui/network-tooltip';
import { Copy, Eye, EyeOff, Plus, RefreshCcw, Key, Globe, BookOpen, Zap, CheckCircle2, AlertCircle, Code2 } from 'lucide-react';
import { useNotify } from '@/lib/hooks/useNotify';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOfflineStore } from '@/lib/store/offlineStore';

const CodeExample = dynamic(() => import('@/components/developers/CodeExample').then(m => ({ default: m.CodeExample })), {
  loading: () => <Skeleton className="h-64 rounded-xl" />,
});

const mockKeys = [
  { id: 'key_01', name: 'Production Key', prefix: 'bp_live_', suffix: '...a4f9', created: '2024-01-01', lastUsed: '2 hours ago', type: 'live' },
  { id: 'key_02', name: 'Test Key', prefix: 'bp_test_', suffix: '...c2d8', created: '2024-01-05', lastUsed: '5 days ago', type: 'test' },
];

const EVENT_TYPES = [
  { value: 'payment.received', label: 'payment.received' },
  { value: 'settlement.completed', label: 'settlement.completed' },
  { value: 'payment.failed', label: 'payment.failed' },
];

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const SAMPLE_PAYLOADS: Record<string, JsonValue> = {
  'payment.received': {
    "id": "evt_123456",
    "type": "payment.received",
    "data": {
      "payment_id": "pay_987654",
      "amount": 5000,
      "currency": "USDC",
      "status": "completed",
      "customer": {
        "email": "customer@example.com"
      }
    },
    "created_at": "2024-06-24T12:00:00Z"
  },
  'settlement.completed': {
    "id": "evt_234567",
    "type": "settlement.completed",
    "data": {
      "settlement_id": "set_112233",
      "amount": 4900,
      "currency": "USDC",
      "fee": 100,
      "status": "processed"
    },
    "created_at": "2024-06-24T13:00:00Z"
  },
  'payment.failed': {
    "id": "evt_345678",
    "type": "payment.failed",
    "data": {
      "payment_id": "pay_failed_111",
      "amount": 5000,
      "currency": "USDC",
      "status": "failed",
      "reason": "insufficient_funds"
    },
    "created_at": "2024-06-24T14:00:00Z"
  }
};

export default function DevelopersPage() {
  const [showKey, setShowKey] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>('payment.received');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{ status: number; message: string } | null>(null);
  const isOnline = useOfflineStore((s) => s.isOnline);
  const notify = useNotify();

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    notify.success('Copied to clipboard');
  }, [notify]);

  const handleSendTest = () => {
    setIsSimulating(true);
    setSimulationResult(null);
    
    // Simulate API delay
    setTimeout(() => {
      setIsSimulating(false);
      setSimulationResult({
        status: 200,
        message: 'Webhook delivered successfully'
      });
      notify.success('Test webhook sent');
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">Integration</p>
        <h1 className="text-3xl font-bold text-foreground">Developers</h1>
        <p className="text-muted-foreground text-sm mt-1">
          API keys, webhooks, and SDK quickstart for integrating BettaPay.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: BookOpen, label: 'API Reference', desc: 'Full REST API docs', color: 'amber' },
          { icon: Globe, label: 'Webhooks', desc: 'Event notifications', color: 'blue' },
          { icon: Code2, label: 'SDKs', desc: 'Node.js, Python, PHP', color: 'emerald' },
        ].map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-sm transition-all
            ${color === 'amber' ? 'border-primary/30 bg-primary/10 hover:bg-primary/20' : ''}
            ${color === 'blue' ? 'border-info/30 bg-info/10 hover:bg-info/20' : ''}
            ${color === 'emerald' ? 'border-success/30 bg-success/10 hover:bg-success/20' : ''}
          `}>
            <Icon className={`w-5 h-5 ${color === 'amber' ? 'text-primary' : ''} ${color === 'blue' ? 'text-info' : ''} ${color === 'emerald' ? 'text-success' : ''}`} />
            <div>
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* API Keys */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" /> API Keys
            </CardTitle>
          </div>
          <NetworkTooltip show={!isOnline}>
            <Button
              disabled={!isOnline}
              aria-disabled={!isOnline}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-9 px-4 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Key
            </Button>
          </NetworkTooltip>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockKeys.map((key) => (
              <div key={key.id} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-border hover:bg-muted/50 transition-all">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold
                  ${key.type === 'live' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {key.type === 'live' ? 'LV' : 'TS'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{key.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {key.prefix}{showKey === key.id ? '••••••••••••••••' : '••••••••••••••••'}{key.suffix}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-muted-foreground">Last used</p>
                  <p className="text-xs font-medium text-foreground">{key.lastUsed}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label="Toggle visibility" className="min-h-[44px] min-w-[44px] rounded-lg" onClick={() => setShowKey(showKey === key.id ? null : key.id)}>
                    {showKey === key.id ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Copy API key" className="min-h-[44px] min-w-[44px] rounded-lg" onClick={() => handleCopy(`${key.prefix}EXAMPLE${key.suffix}`)}>
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Rotate API key" className="min-h-[44px] min-w-[44px] rounded-lg" onClick={() => notify.info('Key rotation coming soon')}>
                    <RefreshCcw className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quickstart code */}
      <CodeExample onCopy={handleCopy} />

      {/* Webhook URL config */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> Webhook Endpoint
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Input
            defaultValue="https://your-app.com/webhooks/bettapay"
            className="flex-1 h-10 border-border rounded-xl text-sm font-mono bg-muted"
          />
          <NetworkTooltip show={!isOnline}>
            <Button
              disabled={!isOnline}
              aria-disabled={!isOnline}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 px-4 text-sm font-semibold shrink-0"
            >
              Save
            </Button>
          </NetworkTooltip>
        </CardContent>
      </Card>

      {/* Test Webhook Section */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Test Webhook
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Simulate webhook events to test your endpoint integration.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-semibold text-foreground">Event Type</label>
              <Select value={selectedEvent} onValueChange={(value) => value && setSelectedEvent(value)}>
                <SelectTrigger className="w-full h-10 border-border rounded-xl bg-muted">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleSendTest} 
              disabled={isSimulating}
              className="bg-foreground hover:bg-foreground/90 text-background rounded-xl h-10 px-6 text-sm font-semibold min-w-[140px]"
            >
              {isSimulating ? (
                <>
                  <RefreshCcw className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Test'
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Simulated Payload</label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="min-h-[44px] text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleCopy(JSON.stringify(SAMPLE_PAYLOADS[selectedEvent], null, 2))}
              >
                <Copy className="w-3 h-3 mr-1" /> Copy JSON
              </Button>
            </div>
            <div className="bg-foreground rounded-xl p-4 overflow-x-auto border border-border">
              <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
                {JSON.stringify(SAMPLE_PAYLOADS[selectedEvent], null, 2)}
              </pre>
            </div>
          </div>

          {simulationResult && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              simulationResult.status === 200 
                ? 'bg-success/10 border-success/20 text-success' 
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}>
              {simulationResult.status === 200 ? (
                <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-semibold">Response Status: {simulationResult.status} OK</p>
                <p className="text-xs opacity-80">{simulationResult.message}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
