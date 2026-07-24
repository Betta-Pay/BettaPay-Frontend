"use client";

import { useState, memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { CopyAddress } from '@/components/shared';
import { EmptyState } from '@/components/shared';
import { ErrorDisplay } from '@/components/shared';
import { QRCodeModal } from '@/components/payments/QRCode';
import { CurrencySelector } from '@/components/payments/CurrencySelector';
import { Plus, QrCode, Link2, Search, Edit3, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { trimInput } from '@/lib/utils/sanitize';
import { useNotify } from '@/lib/hooks/useNotify';
import { usePayments, type ApiPayment } from '@/lib/api/hooks';
import Link from 'next/link';

type PaymentLink = ApiPayment;

interface PaymentLinkCardProps {
  link: PaymentLink;
  onEdit: (link: PaymentLink) => void;
  onDelete: (link: PaymentLink) => void;
  onShowQr: (link: PaymentLink) => void;
}

const PaymentLinkCard = memo(function PaymentLinkCard({ link, onEdit, onDelete, onShowQr }: PaymentLinkCardProps) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  const fullUrl = `${baseUrl}/pay/${link.id}`;

  return (
    <Card className="bg-card border-border/50 shadow-sm hover:border-primary/50 transition-colors group">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <Link href={`/payments/${link.id}`} className="hover:underline">
            <CardTitle className="text-base font-semibold text-foreground line-clamp-1">{link.source ?? 'Payment Link'}</CardTitle>
          </Link>
          <CardDescription className="mt-1 flex items-center gap-2">
            <span>{link.amountUsdc ? `${link.amountUsdc} USDC` : 'Open amount'}</span>
            <span>·</span>
            <span>Created {new Date(link.createdAt).toLocaleDateString()}</span>
          </CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Edit link"
            className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(link)}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete link"
            className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(link)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 mt-4 sm:flex-row sm:items-center">
          <div className="flex-1 overflow-hidden min-w-0">
            <div className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-full bg-muted/50 p-2 rounded border border-border/50 font-mono">
              {fullUrl}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <CopyAddress address={fullUrl} showIconOnly truncate={false} />
            <Button
              variant="outline"
              size="icon"
              aria-label="Show QR code"
              className="min-h-[44px] min-w-[44px] border-border/50 bg-background/50 text-muted-foreground hover:text-foreground"
              onClick={() => onShowQr(link)}
            >
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
  const { success: notifySuccess, info: notifyInfo } = useNotify();

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assetFilter, setAssetFilter] = useState('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<PaymentLink | null>(null);
  const [deletingLink, setDeletingLink] = useState<PaymentLink | null>(null);
  const [selectedQrLink, setSelectedQrLink] = useState<PaymentLink | null>(null);
  const [linksError, setLinksError] = useState(false);

  // Form states
  const [labelValue, setLabelValue] = useState('');
  const [amountValue, setAmountValue] = useState('');
  const [currencyValue, setCurrencyValue] = useState('USDC');
  const [currencyMode, setCurrencyMode] = useState<'single' | 'multi'>('single');
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(['USDC']);
  const [multiCurrencyAmounts, setMultiCurrencyAmounts] = useState<Record<string, string>>({});
  const [expiryValue, setExpiryValue] = useState('');
  const [redirectUrlValue, setRedirectUrlValue] = useState('');
  const [referenceValue, setReferenceValue] = useState('');
  const [labelError, setLabelError] = useState('');

  // Filtered links logic
  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      const matchesSearch =
        (link.source ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (link.id ?? '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && link.status !== 'deactivated') ||
        (statusFilter === 'deactivated' && link.status === 'deactivated');

      const matchesAsset =
        assetFilter === 'all' ||
        (assetFilter === 'USDC' && link.amountUsdc > 0) ||
        (assetFilter === 'XLM' && !link.amountUsdc);

      return matchesSearch && matchesStatus && matchesAsset;
    });
  }, [links, searchTerm, statusFilter, assetFilter]);

  const totalPages = Math.ceil(filteredLinks.length / pageSize) || 1;
  const paginatedLinks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLinks.slice(start, start + pageSize);
  }, [filteredLinks, currentPage, pageSize]);

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
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    notifySuccess('Payment link updated successfully');
    setEditingLink(null);
  };

  const handleDeleteConfirm = () => {
    notifyInfo('Payment link deleted');
    setDeletingLink(null);
  };

  const resetForm = () => {
    setLabelValue('');
    setAmountValue('');
    setCurrencyValue('USDC');
    setCurrencyMode('single');
    setSelectedCurrencies(['USDC']);
    setMultiCurrencyAmounts({});
    setExpiryValue('');
    setRedirectUrlValue('');
    setReferenceValue('');
    setLabelError('');
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

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Payment Link
              </Button>
            } />
            <DialogContent className="sm:max-w-[480px] bg-card border-border/50 max-h-[85dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Payment Link</DialogTitle>
                <DialogDescription>
                  Generate a reusable link or QR code to accept payments.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="label">Title / Label</Label>
                  <Input
                    id="label"
                    placeholder="e.g. Consulting Retainer"
                    autoFocus
                    className="bg-background/50 border-border/50"
                    value={labelValue}
                    onChange={(e) => setLabelValue(e.target.value)}
                  />
                  {labelError && <p className="text-xs text-destructive mt-1">{labelError}</p>}
                </div>

                <div className="space-y-3">
                  <Label>Payment Mode</Label>
                  <div className="flex rounded-lg border border-border/50 bg-background/50 p-0.5">
                    <button
                      type="button"
                      className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                        currencyMode === 'single'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setCurrencyMode('single')}
                    >
                      Single Currency
                    </button>
                    <button
                      type="button"
                      className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                        currencyMode === 'multi'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setCurrencyMode('multi')}
                    >
                      Multi-Currency
                    </button>
                  </div>
                </div>

                {currencyMode === 'single' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (Optional)</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0.00"
                          className="bg-background/50 border-border/50"
                          value={amountValue}
                          onChange={(e) => setAmountValue(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={currencyValue} onValueChange={(val) => val && setCurrencyValue(val)}>
                          <SelectTrigger className="bg-background/50 border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USDC">USDC</SelectItem>
                            <SelectItem value="XLM">XLM</SelectItem>
                            <SelectItem value="USDT">USDT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <Label>Accepted Currencies</Label>
                    <CurrencySelector
                      selectedCurrencies={selectedCurrencies}
                      onSelectionChange={setSelectedCurrencies}
                      mode="multi"
                      showRates
                    />
                    {selectedCurrencies.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <Label>Default Amounts (Optional)</Label>
                        {selectedCurrencies.map((code) => (
                          <div key={code} className="flex items-center gap-2">
                            <span className="text-sm font-medium w-14 shrink-0">{code}</span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              className="bg-background/50 border-border/50"
                              value={multiCurrencyAmounts[code] ?? ''}
                              onChange={(e) =>
                                setMultiCurrencyAmounts((prev) => ({ ...prev, [code]: e.target.value }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reference">Internal Reference</Label>
                  <Input
                    id="reference"
                    placeholder="e.g. INV-2026-001"
                    className="bg-background/50 border-border/50"
                    value={referenceValue}
                    onChange={(e) => setReferenceValue(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    type="date"
                    className="bg-background/50 border-border/50"
                    value={expiryValue}
                    onChange={(e) => setExpiryValue(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="redirect">Redirect URL (On success)</Label>
                  <Input
                    id="redirect"
                    placeholder="https://yourstore.com/thank-you"
                    className="bg-background/50 border-border/50"
                    value={redirectUrlValue}
                    onChange={(e) => setRedirectUrlValue(e.target.value)}
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit">Create Link</Button>
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
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payment links by title or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50 border-border/50"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
            <SelectTrigger className="w-full sm:w-[130px] bg-background/50 border-border/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deactivated">Deactivated</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assetFilter} onValueChange={(val) => val && setAssetFilter(val)}>
            <SelectTrigger className="w-full sm:w-[130px] bg-background/50 border-border/50">
              <SelectValue placeholder="Asset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assets</SelectItem>
              <SelectItem value="USDC">USDC</SelectItem>
              <SelectItem value="XLM">XLM</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
          {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : paginatedLinks.length === 0 ? (
        <EmptyState
          icon={Link2}
          title={searchTerm ? "No payment links match your search" : "No payment links yet"}
          description={searchTerm ? "Try clearing search or filters to see all links." : "Create your first payment link to start accepting crypto payments."}
          action={{ label: 'New Payment Link', onClick: () => setIsCreateOpen(true) }}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedLinks.map((link) => (
              <PaymentLinkCard
                key={link.id}
                link={link}
                onEdit={setEditingLink}
                onDelete={setDeletingLink}
                onShowQr={setSelectedQrLink}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredLinks.length)} of {filteredLinks.length} links
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs font-semibold px-2">{currentPage} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingLink} onOpenChange={(open) => !open && setEditingLink(null)}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle>Edit Payment Link</DialogTitle>
            <DialogDescription>Update details for {editingLink?.source}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title / Label</Label>
              <Input id="edit-title" defaultValue={editingLink?.source ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount (USDC)</Label>
              <Input id="edit-amount" type="number" defaultValue={editingLink?.amountUsdc ?? 0} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditingLink(null)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingLink} onOpenChange={(open) => !open && setDeletingLink(null)}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Payment Link</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingLink?.source}&quot;? Customers will no longer be able to make payments through this link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeletingLink(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      {selectedQrLink && (
        <QRCodeModal
          open={!!selectedQrLink}
          onOpenChange={(open) => {
            if (!open) setSelectedQrLink(null);
          }}
          value={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/pay/${selectedQrLink.id}`}
          title={selectedQrLink.source ?? 'Payment Link'}
          amountUsdc={selectedQrLink.amountUsdc}
        />
      )}
    </div>
  );
}
