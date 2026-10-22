export type DeliveryStatus = 'delivered' | 'failed' | 'pending' | 'dead';

export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  merchantId: string | null;
  /** Full secret — server only. Use `toPublicSubscription` before responding. */
  signingSecret: string;
  createdAt: string;
  lastTestedAt: string | null;
  lastTestStatus: 'success' | 'failed' | null;
  lastTestStatusCode: number | null;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  event: string;
  payload: Record<string, unknown>;
  status: DeliveryStatus;
  /** HTTP status of the attempt; null when the request never got a response. */
  statusCode: number | null;
  latencyMs: number | null;
  attempt: number;
  error: string | null;
  createdAt: string;
  replayOf: string | null;
  /** Set on a dead-letter entry once a manual retry delivered it. */
  resolvedBy?: string | null;
}

export interface PublicWebhookSubscription
  extends Omit<WebhookSubscription, 'signingSecret'> {
  signingSecretMasked: string;
  failureCount: number;
  consecutiveFailures: number;
  deliveryCount: number;
}

export interface PageInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}
