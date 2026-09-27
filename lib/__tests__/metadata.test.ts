import { generateMetadata } from "@/app/pay/[linkId]/layout";
import {
  createPaymentLinkMetadata,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
} from "@/lib/metadata";

describe("metadata", () => {
  it("provides the global fallback values", () => {
    expect(DEFAULT_TITLE).toContain("BettaPay");
    expect(DEFAULT_DESCRIPTION.length).toBeGreaterThan(0);
    expect(DEFAULT_OG_IMAGE.url).toBe("/logo.png");
  });

  it("creates payment-link metadata with canonical and social tags", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ linkId: "link_abc123" }),
    });

    expect(metadata.title).toBe("Pay securely with BettaPay | link_abc123");
    expect(metadata.description).toContain("link_abc123");
    expect(metadata.alternates?.canonical).toBe("/pay/link_abc123");
    expect(metadata.openGraph?.title).toBe(metadata.title);
    expect(metadata.openGraph?.url).toBe("/pay/link_abc123");
    expect(metadata.openGraph?.images).toEqual([DEFAULT_OG_IMAGE]);
    expect(metadata.twitter?.title).toBe(metadata.title);
    expect(metadata.twitter?.images).toEqual([DEFAULT_OG_IMAGE.url]);
  });

  it("uses a safe fallback for an empty link identifier", () => {
    const metadata = createPaymentLinkMetadata("   ");

    expect(metadata.title).toContain("payment-link");
    expect(metadata.alternates?.canonical).toBe("/pay/payment-link");
  });
});
