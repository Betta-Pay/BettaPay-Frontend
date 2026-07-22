/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Next.js dev mode (React Refresh / webpack HMR) evaluates JavaScript at
// runtime, which a CSP without 'unsafe-eval' blocks — that stops React from
// hydrating and leaves the app non-interactive locally. Allow it in development
// only; the production CSP stays strict.
const isDev = process.env.NODE_ENV === 'development';
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:"
  : "script-src 'self' 'unsafe-inline' https:";

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline' https:; img-src 'self' data:; connect-src 'self' https: wss:; font-src 'self' data:;`,
          },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
