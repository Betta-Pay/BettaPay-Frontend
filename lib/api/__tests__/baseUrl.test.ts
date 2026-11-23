/* eslint-disable @typescript-eslint/no-require-imports */
import type { AxiosInstance } from 'axios';

// Verifies that the API base URL is resolved per request rather than captured
// at module load, so dev/QA endpoint switches (and tests) take effect on the
// next call without re-importing the module.
describe('api base URL resolution', () => {
  let apiClient: AxiosInstance;
  let setApiBaseUrl: (url: string | null) => void;
  let resetApiBaseUrl: () => void;
  let getApiBaseUrl: () => string;

  let seenBaseUrls: Array<string | undefined>;
  let seenTimeouts: Array<number | undefined>;

  beforeEach(() => {
    jest.resetModules();
    seenBaseUrls = [];
    seenTimeouts = [];

    // Require axios fresh in this module registry generation and install the
    // recording adapter BEFORE the SUT is required, so the instance it creates
    // inherits the adapter from the axios defaults it was merged from.
    const axios = require('axios');
    axios.defaults.adapter = (config: import("axios").InternalAxiosRequestConfig) => {
      seenBaseUrls.push(config.baseURL);
      seenTimeouts.push(config.timeout);
      return Promise.resolve({
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {},
      });
    };

    const mod = require('@/lib/api/axios');
    apiClient = mod.apiClient;
    setApiBaseUrl = mod.setApiBaseUrl;
    resetApiBaseUrl = mod.resetApiBaseUrl;
    getApiBaseUrl = mod.getApiBaseUrl;
  });

  afterEach(() => {
    resetApiBaseUrl();
    delete (window as Window & typeof globalThis & { __BETTAPAY_API_URL__?: string }).__BETTAPAY_API_URL__;
  });

  it('applies a new base URL to subsequent requests', async () => {
    setApiBaseUrl('https://qa.bettapay.io');
    await apiClient.get('/api/payments');

    setApiBaseUrl('https://staging.bettapay.io');
    await apiClient.get('/api/payments');

    expect(seenBaseUrls).toEqual([
      'https://qa.bettapay.io',
      'https://staging.bettapay.io',
    ]);
  });

  it('falls back to the configured value when the override is cleared', async () => {
    setApiBaseUrl('https://qa.bettapay.io');
    expect(getApiBaseUrl()).toBe('https://qa.bettapay.io');

    resetApiBaseUrl();
    await apiClient.get('/api/payments');

    expect(seenBaseUrls[0]).toBe(getApiBaseUrl());
    expect(seenBaseUrls[0]).not.toBe('https://qa.bettapay.io');
  });

  it('strips trailing slashes so paths join cleanly', () => {
    setApiBaseUrl('https://qa.bettapay.io/');
    expect(getApiBaseUrl()).toBe('https://qa.bettapay.io');
    expect(getApiBaseUrl().endsWith('/')).toBe(false);

    setApiBaseUrl('https://qa.bettapay.io///');
    expect(getApiBaseUrl()).toBe('https://qa.bettapay.io');
    expect(getApiBaseUrl().endsWith('/')).toBe(false);
  });

  it('never returns a URL ending with / even when given root slashes or empty strings', () => {
    setApiBaseUrl('/');
    expect(getApiBaseUrl().endsWith('/')).toBe(false);
    expect(getApiBaseUrl()).not.toBe('');

    setApiBaseUrl('///');
    expect(getApiBaseUrl().endsWith('/')).toBe(false);

    setApiBaseUrl('   ');
    expect(getApiBaseUrl().endsWith('/')).toBe(false);
  });

  it('handles NEXT_PUBLIC_API_URL with trailing slashes and relative paths cleanly', async () => {
    const originalEnv = process.env.NEXT_PUBLIC_API_URL;
    try {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.env.bettapay.io///';
      expect(getApiBaseUrl()).toBe('https://api.env.bettapay.io');
      expect(getApiBaseUrl().endsWith('/')).toBe(false);

      process.env.NEXT_PUBLIC_API_URL = '/api/v1///';
      expect(getApiBaseUrl()).toBe('/api/v1');
      expect(getApiBaseUrl().endsWith('/')).toBe(false);
    } finally {
      if (originalEnv === undefined) {
        delete process.env.NEXT_PUBLIC_API_URL;
      } else {
        process.env.NEXT_PUBLIC_API_URL = originalEnv;
      }
    }
  });

  it('handles SSR fallback consistently when window is undefined', () => {
    expect(getApiBaseUrl().endsWith('/')).toBe(false);
    expect(getApiBaseUrl()).toBe('http://localhost:3001');
  });

  it('reads a runtime global when no override is set', async () => {
    (window as Window & typeof globalThis & { __BETTAPAY_API_URL__?: string }).__BETTAPAY_API_URL__ = 'https://runtime.bettapay.io';
    await apiClient.get('/api/payments');

    expect(seenBaseUrls[0]).toBe('https://runtime.bettapay.io');
  });

  it('lets an explicit per-request baseURL win over the resolved one', async () => {
    setApiBaseUrl('https://qa.bettapay.io');
    await apiClient.get('/api/payments', {
      baseURL: 'https://one-off.bettapay.io',
    });

    expect(seenBaseUrls[0]).toBe('https://one-off.bettapay.io');
  });

  it('keeps the existing timeout behaviour intact', async () => {
    await apiClient.get('/api/rates');
    expect(seenTimeouts[0]).toBe(15000);

    // Payment paths keep their extended timeout.
    await apiClient.post('/payments', {});
    expect(seenTimeouts[1]).toBe(30000);
  });
});
