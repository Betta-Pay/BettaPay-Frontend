"use client";

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { Check, X, Loader2, ExternalLink, ArrowLeft } from 'lucide-react';
import { CurrencyDisplay } from '@/components/shared';
import { truncateAddress } from '@/lib/utils/format';
import { apiClient } from '@/lib/api/axios';

type Status = 'processing' | 'success' | 'failed';

export default function PaymentStatusPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const txId = params.txId as string;
  const initialStatus = (searchParams.get('status') as Status) || 'processing';
  
  const [status, setStatus] = useState<Status>(initialStatus);
  const [paymentData, setPaymentData] = useState<Record<string, unknown> | null>(null);

  // Poll for status
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const response = await apiClient.get(`/api/payments/${txId}`);
        const payment = response.data;
        
        if (payment) {
          setPaymentData(payment);
          
          if (payment.status === 'success') {
            setStatus('success');
            return;
          } else if (payment.status === 'failed') {
            setStatus('failed');
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch payment status', err);
      }

      // Continue polling if still processing
      if (status === 'processing') {
        timer = setTimeout(checkStatus, 3000);
      }
    };

    if (status === 'processing') {
      checkStatus();
    }

    return () => clearTimeout(timer);
  }, [status, txId]);

  const mockData = paymentData ? {
    amount: Number(paymentData.amount),
    currency: (paymentData.asset as string) || 'USDC',
    merchantName: 'BettaPay Merchant LLC',
    txHash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b' // Would come from indexer in prod
  } : {
    amount: 0,
    currency: 'USDC',
    merchantName: 'Merchant Corp',
    txHash: '...'
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {status === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center justify-center space-y-6 text-center"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center shadow-lg">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Confirming Payment</h2>
                <p className="text-muted-foreground mt-2">Waiting for Stellar network confirmation...</p>
              </div>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
                <div className="h-2 bg-success w-full" />
                <CardContent className="pt-8 pb-8 px-6 flex flex-col items-center text-center space-y-6">
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
                    className="w-20 h-20 rounded-full bg-success/10 border-2 border-success flex items-center justify-center"
                  >
                    <Check className="w-10 h-10 text-success" />
                  </motion.div>
                  
                  <div>
                    <h2 className="text-2xl font-bold">Payment Successful</h2>
                    <p className="text-muted-foreground mt-1">To {mockData.merchantName}</p>
                  </div>

                  <div className="text-4xl font-bold text-foreground">
                    <CurrencyDisplay amount={mockData.amount} currency={mockData.currency} />
                  </div>

                  <div className="w-full bg-transparent rounded-lg p-4 space-y-3 text-sm border border-border text-left">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction ID</span>
                      <span className="font-mono">{truncateAddress(txId)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Network Hash</span>
                      <a href="#" className="font-mono text-primary hover:underline flex items-center gap-1">
                        {truncateAddress(mockData.txHash)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <Button className="w-full h-12" onClick={() => router.push('/')}>
                    Return to Merchant
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
                <div className="h-2 bg-destructive w-full" />
                <CardContent className="pt-8 pb-8 px-6 flex flex-col items-center text-center space-y-6">
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center"
                  >
                    <X className="w-10 h-10 text-destructive" />
                  </motion.div>
                  
                  <div>
                    <h2 className="text-2xl font-bold">Payment Failed</h2>
                    <p className="text-muted-foreground mt-1">The transaction was rejected by the network.</p>
                  </div>

                  <div className="w-full flex gap-3 mt-4">
                    <Button variant="outline" className="flex-1" onClick={() => router.back()}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button className="flex-1" onClick={() => setStatus('processing')}>
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
