import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createPaymentLinkMetadata } from "@/lib/metadata";

type PaymentLinkMetadataProps = {
  params: { linkId: string } | Promise<{ linkId: string }>;
};

export async function generateMetadata({ params }: PaymentLinkMetadataProps): Promise<Metadata> {
  const { linkId } = await params;

  return createPaymentLinkMetadata(linkId);
}

export default function PaymentLinkLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
