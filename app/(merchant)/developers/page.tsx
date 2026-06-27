"use client";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NetworkTooltip } from '@/components/ui/network-tooltip';
import { Code2, Copy, Eye, EyeOff, Plus, RefreshCcw, Key, Globe, BookOpen, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNotify } from '@/lib/hooks/useNotify';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOfflineStore } from '@/lib/store/offlineStore';

const mockKeys = [
  { id: 'key_01', name: 'Production Key', prefix: 'bp_live_', suffix: '...a4f9', created: '2024-01-01', lastUsed: '2 hours ago', type: 'live' },
  { id: 'key_02', name: 'Test Key', prefix: 'bp_test_', suffix: '...c2d8', created: '2024-01-05', lastUsed: '5 days ago', type: 'test' },
];

const codeExample = `// Install the BettaPay SDK
npm install @bettapay/sdk

// Initialize the client
import { BettaPay } from '@bettapay/sdk';

const client = new BettaPay({
  apiKey: 'bp_live_YOUR_API_KEY',
  network: 'mainnet', // or 'testnet'
});

// Create a payment link
const link = await client.paymentLinks.create({
  label: 'My Product',
  currency: 'USDC',
  type: 'open', // or 'fixed'
});

console.log(link.url); // https://betta.pay/pay/link_xxx`;

const EVENT_TYPES = [
  { value: 'payment.received', label: 'payment.received' },
  { value: 'settlement.completed', label: 'settlement.completed' },
  { value: 'payment.failed', label: 'payment.failed' },
];

const SAMPLE_PAYLOADS: Record<string, any> = {
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

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    notify.success('Copied to clipboard');
  };

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
        <p className="text-xs font-semibold tracking-widest text-amber-500 uppercase mb-1">Integration</p>
        <h1 className="text-3xl font-bold text-slate-900">Developers</h1>
        <p className="text-slate-400 text-sm mt-1">
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
            ${color === 'amber' ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : ''}
            ${color === 'blue' ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' : ''}
            ${color === 'emerald' ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100' : ''}
          `}>
            <Icon className={`w-5 h-5 ${color === 'amber' ? 'text-amber-600' : ''} ${color === 'blue' ? 'text-blue-600' : ''} ${color === 'emerald' ? 'text-emerald-600' : ''}`} />
            <div>
              <p className="text-sm font-semibold text-slate-800">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* API Keys */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" /> API Keys
            </CardTitle>
          </div>
          <NetworkTooltip show={!isOnline}>
            <Button
              disabled={!isOnline}
              aria-disabled={!isOnline}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-9 px-4 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Key
            </Button>
          </NetworkTooltip>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockKeys.map((key) => (
              <div key={key.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold
                  ${key.type === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {key.type === 'live' ? 'LV' : 'TS'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{key.name}</p>
                  <p className="text-xs text-slate-400 font-mono">
                    {key.prefix}{showKey === key.id ? '••••••••••••••••' : '••••••••••••••••'}{key.suffix}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-400">Last used</p>
                  <p className="text-xs font-medium text-slate-700">{key.lastUsed}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label="Toggle visibility" className="h-8 w-8 rounded-lg" onClick={() => setShowKey(showKey === key.id ? null : key.id)}>
                    {showKey === key.id ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Copy API key" className="h-8 w-8 rounded-lg" onClick={() => handleCopy(`${key.prefix}EXAMPLE${key.suffix}`, 'API key')}>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Rotate API key" className="h-8 w-8 rounded-lg" onClick={() => notify.info('Key rotation coming soon')}>
                    <RefreshCcw className="w-3.5 h-3.5 text-slate-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quickstart code */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-amber-500" /> Quickstart
          </CardTitle>
          <Button variant="outline" className="border-slate-200 rounded-xl h-8 px-3 text-xs" onClick={() => handleCopy(codeExample, 'Code')}>
            <Copy className="w-3 h-3 mr-1.5" /> Copy
          </Button>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-950 rounded-xl p-5 overflow-x-auto">
            <pre className="text-sm text-slate-300 font-mono leading-relaxed whitespace-pre-wrap break-words">
              {codeExample}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Webhook URL config */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-500" /> Webhook Endpoint
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Input
            defaultValue="https://your-app.com/webhooks/bettapay"
            className="flex-1 h-10 border-slate-200 rounded-xl text-sm font-mono bg-slate-50"
          />
          <NetworkTooltip show={!isOnline}>
            <Button
              disabled={!isOnline}
              aria-disabled={!isOnline}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-10 px-4 text-sm font-semibold shrink-0"
            >
              Save
            </Button>
          </NetworkTooltip>
        </CardContent>
      </Card>

      {/* Test Webhook Section */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> Test Webhook
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            Simulate webhook events to test your endpoint integration.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-semibold text-slate-700">Event Type</label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="w-full h-10 border-slate-200 rounded-xl bg-slate-50">
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
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 px-6 text-sm font-semibold min-w-[140px]"
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
              <label className="text-xs font-semibold text-slate-700">Simulated Payload</label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[10px] text-slate-500 hover:text-slate-900"
                onClick={() => handleCopy(JSON.stringify(SAMPLE_PAYLOADS[selectedEvent], null, 2), 'Payload')}
              >
                <Copy className="w-3 h-3 mr-1" /> Copy JSON
              </Button>
            </div>
            <div className="bg-slate-950 rounded-xl p-4 overflow-x-auto border border-slate-800">
              <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
                {JSON.stringify(SAMPLE_PAYLOADS[selectedEvent], null, 2)}
              </pre>
            </div>
          </div>

          {simulationResult && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              simulationResult.status === 200 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-red-50 border-red-100 text-red-800'
            }`}>
              {simulationResult.status === 200 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
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
