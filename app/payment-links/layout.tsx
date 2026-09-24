import { ServerHeaderAuth } from '@/components/layout/ServerHeaderAuth';

/**
 * /payment-links renders the public `Header` but sits behind auth in the
 * middleware, so every visitor is signed in — resolve that on the server so
 * the Header never shows logged-out links here (issue #712).
 */
export default function PaymentLinksLayout({ children }: { children: React.ReactNode }) {
  return <ServerHeaderAuth>{children}</ServerHeaderAuth>;
}
