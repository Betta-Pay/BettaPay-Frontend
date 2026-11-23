import { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { reportApiFailure, apiClient } from '../axios';
import { captureException } from '@/lib/errorReporting';
import { useOfflineStore } from '@/lib/store/offlineStore';

jest.mock('@/lib/errorReporting', () => ({
  captureException: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

describe('reportApiFailure error classification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOfflineStore.setState({ isOnline: true, isApiReachable: true });
  });

  describe('direct reportApiFailure scrubbing and formatting', () => {
    it('reports 5xx failures with method, stripped path, status, and does not leak headers', () => {
      const config = {
        method: 'post',
        url: 'https://api.bettapay.io/payments/process?token=secret123&user=admin',
        headers: {
          Authorization: 'Bearer super-secret-token',
          Cookie: 'session=secret-cookie-val',
          'X-Api-Key': 'key-value',
        },
        data: { sensitiveInfo: 'card-data', ssn: '000-00-0000' },
      } as unknown as InternalAxiosRequestConfig;

      const response = {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {},
        config,
        data: { error: 'Internal Server Error' },
      } as AxiosResponse;

      const error = new AxiosError('Service Unavailable', 'ERR_BAD_RESPONSE', config, {}, response);

      reportApiFailure(error, 'http_503');

      expect(captureException).toHaveBeenCalledTimes(1);
      const [capturedError, context] = (captureException as jest.Mock).mock.calls[0];

      expect(capturedError).toBeInstanceOf(Error);
      expect(capturedError.message).toBe('API http_503: POST https://api.bettapay.io/payments/process -> 503');
      expect(capturedError.message).not.toContain('secret123');
      expect(capturedError.message).not.toContain('super-secret-token');
      expect(context).toEqual({ source: 'api' });
    });

    it('reports network failure when response is absent, displaying no response', () => {
      const config = {
        method: 'get',
        url: '/api/transactions?page=2',
        headers: { Authorization: 'Bearer token-123' },
      } as unknown as InternalAxiosRequestConfig;

      const error = new AxiosError('Network Error', 'ERR_NETWORK', config);

      reportApiFailure(error, 'network');

      expect(captureException).toHaveBeenCalledTimes(1);
      const [capturedError, context] = (captureException as jest.Mock).mock.calls[0];

      expect(capturedError.message).toBe('API network: GET /api/transactions -> no response');
      expect(capturedError.message).not.toContain('Bearer');
      expect(context).toEqual({ source: 'api' });
    });
  });

  describe('apiClient interceptor error handling', () => {
    it('does NOT report 4xx client errors (400, 403, 404)', async () => {
      const axios = jest.requireActual<typeof import('axios')>('axios').default;

      for (const status of [400, 403, 404]) {
        jest.clearAllMocks();
        axios.defaults.adapter = (config: InternalAxiosRequestConfig) => {
          return Promise.reject(
            new axios.AxiosError('Client error', 'ERR_BAD_REQUEST', config, {}, {
              data: { message: 'Not allowed or invalid' },
              status,
              statusText: 'Client Error',
              headers: {},
              config,
            })
          );
        };

        await expect(apiClient.get('/api/test-4xx')).rejects.toBeDefined();
        expect(captureException).not.toHaveBeenCalled();
      }
    });

    it('reports 5xx errors via captureException', async () => {
      const axios = jest.requireActual<typeof import('axios')>('axios').default;

      axios.defaults.adapter = (config: InternalAxiosRequestConfig) => {
        return Promise.reject(
          new axios.AxiosError('Server Error', 'ERR_BAD_RESPONSE', config, {}, {
            data: { message: 'Internal crash' },
            status: 500,
            statusText: 'Internal Server Error',
            headers: {},
            config,
          })
        );
      };

      await expect(apiClient.get('/api/test-500')).rejects.toBeDefined();
      expect(captureException).toHaveBeenCalledTimes(1);
      const [capturedError] = (captureException as jest.Mock).mock.calls[0];
      expect(capturedError.message).toContain('http_500');
    });

    it('reports network failures and marks isApiReachable as false in offlineStore', async () => {
      const axios = jest.requireActual<typeof import('axios')>('axios').default;

      axios.defaults.adapter = (config: InternalAxiosRequestConfig) => {
        return Promise.reject(
          new axios.AxiosError('Network Error', 'ERR_NETWORK', config)
        );
      };

      expect(useOfflineStore.getState().isApiReachable).toBe(true);

      await expect(apiClient.get('/api/test-network')).rejects.toBeDefined();

      expect(captureException).toHaveBeenCalledTimes(1);
      const [capturedError] = (captureException as jest.Mock).mock.calls[0];
      expect(capturedError.message).toContain('network');
      expect(useOfflineStore.getState().isApiReachable).toBe(false);
    });
  });
});
