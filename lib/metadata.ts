import type { Metadata } from "next";

export const DEFAULT_TITLE = "BettaPay | Non-custodial Merchant Platform";
export const DEFAULT_DESCRIPTION = "Accept USDC and stablecoins easily across Africa";
export const DEFAULT_OG_IMAGE = {
  url: "/logo.png",
  width: 1024,
  height: 1024,
  alt: "BettaPay",
} as const;

export function createPaymentLinkMetadata(linkId: string): Metadata {
  const pathId = linkId.trim() || "payment-link";
  const displayLinkId = pathId.slice(0, 80);
  const path = `/pay/${encodeURIComponent(pathId)}`;
  const title = `Pay securely with BettaPay | ${displayLinkId}`;
  const description = `Complete your BettaPay payment securely with payment link ${displayLinkId}.`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      siteName: "BettaPay",
      title,
      description,
      url: path,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [DEFAULT_OG_IMAGE.url],
    },
  };
}
