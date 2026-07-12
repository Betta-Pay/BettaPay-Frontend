"use client";

import { useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CopyAddress } from '@/components/shared/CopyAddress';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
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
import { trimInput } from '@/lib/utils/sanitize';
import { useNotify } from '@/lib/hooks/useNotify';
import { usePayments, type ApiPayment } from '@/lib/api/hooks';

type PaymentLink = ApiPayment;

interface PaymentLinkCardProps {
  link: PaymentLink;
}

const PaymentLinkCard = memo(function PaymentLinkCard({ link }: PaymentLinkCardProps) {
  return (
    <Card className="bg-card border-border/50 shadow-sm hover:border-primary/50 transition-colors group">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-base font-medium text-foreground line-clamp-1">{link.source ?? 'Payment Link'}</CardTitle>
          <CardDescription className="mt-1">
            {link.amountUsdc ? `${link.amountUsdc} USDC` : 'Open amount'}
            <span className="hidden sm:inline"> · Created {new Date(link.createdAt).toLocaleDateString()}</span>
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" aria-label="More options" className="min-h-[44px] min-w-[44px] text-muted-foreground -mt-2 -mr-2">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 mt-4 sm:flex-row sm:items-center">
          <div className="flex-1 overflow-hidden min-w-0">
            <div className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-full bg-muted/50 p-2 rounded border border-border/50 font-mono">
              {`${process.env.NEXT_PUBLIC_API_URL ?? ''}/pay/${link.id}`}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <CopyAddress address={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/pay/${link.id}`} showIconOnly truncate={false} />
            <Button variant="outline" size="icon" aria-label="Show QR code" className="min-h-[44px] min-w-[44px] border-border/50 bg-background/50 text-muted-foreground hover:text-foreground">
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default function PaymentsPage() {
  const { data: links, isLoading, error: fetchError, refetch } = usePayments();
  const { success: notifySuccess } = useNotify();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [labelError, setLabelError] = useState('');
  const [labelValue, setLabelValue] = useState('');
  const [linksError, setLinksError] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedLabel = trimInput(labelValue);
    if (!sanitizedLabel) {
      setLabelError('Label is required');
      return;
    }
    setLabelError('');
    notifySuccess('Payment link created successfully');
    setIsCreateOpen(false);
    setLabelValue('');
  };

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
          <DialogContent className="sm:max-w-[425px] bg-card border-border/50 max-h-[85dvh] overflow-y-auto">
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
                  className="bg-background/50 border-border/50 focus-visible:ring-ring"
                  value={labelValue}
                  onChange={(e) => setLabelValue(e.target.value)}
                  aria-invalid={labelError ? "true" : "false"}
                  aria-describedby={labelError ? "label-error" : undefined}
                />
                {labelError && <p id="label-error" className="text-xs text-destructive mt-1">{labelError}</p>}
              </div>

              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select defaultValue="open">
                  <SelectTrigger className="bg-background/50 border-border/50 focus:ring-ring">
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
                  <Button type="button" variant="outline" className="flex-1 bg-primary/10 border-primary/50 text-primary hover:bg-primary/20">
                    USDC
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 bg-background/50 border-border/50 text-muted-foreground hover:bg-muted">
                    XLM
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" className="scroll-mb-52">Create Link</Button>
              </DialogFooter>
            </form>
          </DialogContent>
         </Dialog>
         <Button 
           variant="outline" 
           className="w-full sm:w-auto"
           onClick={() => setLinksError(!linksError)}
         >
           {linksError ? "Reset API" : "Simulate Error"}
         </Button>
       </div>

      {linksError || fetchError ? (
        <div className="py-12">
          <ErrorDisplay
            message={fetchError ?? 'Failed to load payment links'}
            onRetry={() => { setLinksError(false); refetch(); }}
          />
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : links.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No payment links yet"
          description="Create your first payment link to start accepting crypto payments."
          action={{ label: 'New Payment Link', onClick: () => setIsCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <PaymentLinkCard key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
