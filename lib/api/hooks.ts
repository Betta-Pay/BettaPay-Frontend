"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiPayment {
  id: string;
  txHash: string | null;
  payerAddress: string | null;
  merchantId: string;
  amountUsdc: number;
  amountNgn: number | null;
  fxRate: number | null;
  status: string;
  source: string | null;
  createdAt: string;
  stellarOpId?: string | null;
}

export interface ApiSettlement {
  id: string;
  merchantId: string;
  amountUsdc: number;
  amountNgn: number | null;
  status: string;
  createdAt: string;
  txHash: string | null;
  bankName: string | null;
  accountNumber: string | null;
}

export interface ApiRate {
  from: string;
  to: string;
  rate: number;
  change: number;
  trend: 'up' | 'down';
}

// ─── usePayments ──────────────────────────────────────────────────────────────

export function usePayments() {
  const [data, setData] = useState<ApiPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: ApiPayment[] }>('/api/payments');
      setData(res.data?.data ?? res.data ?? []);
    } catch {
      setError('Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// ─── useSettlements ───────────────────────────────────────────────────────────

export function useSettlements() {
  const [data, setData] = useState<ApiSettlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: ApiSettlement[] }>('/api/settlements');
      setData(res.data?.data ?? res.data ?? []);
    } catch {
      setError('Failed to load settlements');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// ─── useRates ─────────────────────────────────────────────────────────────────

export function useRates() {
  const [data, setData] = useState<ApiRate[]>([]);
  const [primaryRate, setPrimaryRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ rates: ApiRate[]; usdcNgn?: number }>('/api/rates');
      const rates: ApiRate[] = res.data?.rates ?? [];
      setData(rates);
      // Primary USDC/NGN rate
      const primary = res.data?.usdcNgn ?? rates.find(r => r.from === 'USDC' && r.to === 'NGN')?.rate ?? null;
      setPrimaryRate(primary);
    } catch {
      setError('Failed to load exchange rates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, primaryRate, isLoading, error, refetch: fetch };
}
