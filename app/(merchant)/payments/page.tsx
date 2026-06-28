"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CopyAddress } from '@/components/shared/CopyAddress';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, MoreHorizontal, QrCode, Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotify } from '@/lib/hooks/useNotify';

export default function PaymentsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [labelError, setLabelError] = useState('');
  const [labelValue, setLabelValue] = useState('');
  const notify = useNotify();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelValue.trim()) {
      setLabelError('Label is required');
      return;
    }
    setLabelError('');
    notify.success('Payment link created successfully');
    setIsCreateOpen(false);
    setLabelValue('');
  };

  const mockLinks = [
    { id: 'link_01', label: 'Consulting Retainer Q3', type: 'open', amount: null, currency: 'USDC', url: 'https://betta.pay/pay/link_01', created: '2023-10-25' },
    { id: 'link_02', label: 'E-commerce Checkout', type: 'fixed', amount: 45.50, currency: 'USDC', url: 'https://betta.pay/pay/link_02', created: '2023-10-24' },
    { id: 'link_03', label: 'Donation Campaign', type: 'open', amount: null, currency: 'USDC', url: 'https://betta.pay/pay/link_03', created: '2023-10-20' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Links</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage links to accept crypto payments.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={
            <Button className="w-full sm:w-auto" aria-expanded={isCreateOpen}>
              <Plus className="w-4 h-4 mr-2" />
              New Payment Link
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px] bg-brand-surface border-border/50">
            <DialogHeader>
              <DialogTitle>Create Payment Link</DialogTitle>
              <DialogDescription>
                Generate a reusable link or QR code to accept payments.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  placeholder="e.g. Consulting Retainer"
                  autoFocus
                  className="bg-background/50 border-border/50 focus-visible:ring-brand-accent"
                  value={labelValue}
                  onChange={(e) => setLabelValue(e.target.value)}
                  aria-invalid={labelError ? "true" : "false"}
                  aria-describedby={labelError ? "label-error" : undefined}
                />
                {labelError && <p id="label-error" className="text-xs text-red-500 mt-1">{labelError}</p>}
              </div>

              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select defaultValue="open">
                  <SelectTrigger className="bg-background/50 border-border/50 focus:ring-brand-accent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Customer decides amount</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Accepted Currencies</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 bg-brand-accent/10 border-brand-accent/50 text-brand-accent hover:bg-brand-accent/20">
                    USDC
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 bg-background/50 border-border/50 text-muted-foreground hover:bg-muted">
                    XLM
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit">Create Link</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {mockLinks.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No payment links yet"
          description="Create your first payment link to start accepting crypto payments."
          action={{ label: 'New Payment Link', onClick: () => setIsCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockLinks.map((link) => (
            <Card key={link.id} className="bg-brand-surface border-border/50 shadow-sm hover:border-brand-accent/50 transition-colors group">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-medium text-brand-text-primary line-clamp-1">{link.label}</CardTitle>
                  <CardDescription className="mt-1">
                    {link.type === 'fixed' ? `${link.amount} ${link.currency}` : 'Open amount'}
                    <span className="hidden sm:inline"> · Created {link.created}</span>
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" aria-label="More options" className="h-8 w-8 text-muted-foreground -mt-2 -mr-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 mt-4 sm:flex-row sm:items-center">
                  <div className="flex-1 overflow-hidden min-w-0">
                    <div className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-full bg-muted/50 p-2 rounded border border-border/50 font-mono">
                      {link.url}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <CopyAddress address={link.url} showIconOnly truncate={false} />
                    <Button variant="outline" size="icon" aria-label="Show QR code" className="h-8 w-8 border-border/50 bg-background/50 text-muted-foreground hover:text-brand-text-primary">
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
