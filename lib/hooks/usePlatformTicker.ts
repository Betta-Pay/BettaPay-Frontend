import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

export interface TickerData {
  liveVolume: number;
  liveFees: number;
  activeMerchants: number;
  tps: number;
  timestamp: string;
}

export function usePlatformTicker(pollIntervalMs = 3000) {
  const query = useQuery<TickerData, Error>({
    queryKey: ['admin', 'platform-ticker'],
    queryFn: async () => {
      const res = await apiClient.get<TickerData>('/api/admin/ticker');
      return res.data;
    },
    refetchInterval: pollIntervalMs > 0 ? pollIntervalMs : false,
  });

  return {
    ticker: query.data ?? {
      liveVolume: 1452310.89,
      liveFees: 14523.1,
      activeMerchants: 142,
      tps: 4.2,
      timestamp: new Date().toISOString(),
    },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? query.error.message : null,
    refetch: () => void query.refetch(),
  };
}
