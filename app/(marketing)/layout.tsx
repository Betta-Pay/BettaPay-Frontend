import { ServerHeaderAuth } from '@/components/layout/ServerHeaderAuth';

/**
 * Layout for the public marketing pages (landing, pricing, about, …).
 *
 * The route group does not change any URL. It exists so auth state for the
 * shared `Header` is resolved once, on the server (issue #712).
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <ServerHeaderAuth>{children}</ServerHeaderAuth>;
}
