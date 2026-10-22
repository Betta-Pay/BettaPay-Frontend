'use client';
import { apiClient } from '@/lib/api/axios';

// These routes live in Next.js; bypass the API client's external base URL.
export async function adminGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return (await apiClient.get<T>(path, { baseURL: '/', signal })).data;
}
export async function adminPost<T>(path: string, body: unknown): Promise<T> {
  return (await apiClient.post<T>(path, body, { baseURL: '/' })).data;
}
