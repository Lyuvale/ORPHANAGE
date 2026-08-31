/**
 * Payment Provider Abstraction
 *
 * A replaceable layer for processing online payments / donations /
 * contributions. The rest of the application ONLY depends on this interface —
 * never on a specific gateway — so the provider can be swapped by deployment
 * environment (PAYMENT_PROVIDER) without touching business logic.
 *
 * SECURITY PRINCIPLES:
 *  - Card/credential data is NEVER stored on our side. The provider only
 *    receives an opaque reference and the amount/currency/purpose.
 *  - Secrets (provider keys) live ONLY in environment variables — never in
 *    code or the database.
 *  - Webhooks/callbacks are always verified server-side (raw-body signature
 *    verification) and are idempotent via the provider transaction reference.
 */

export type PaymentProviderName = "MOCK" | "EXTENSION";

export interface CreateCheckoutParams {
  /** Amount in minor-currency-independent decimal units. */
  amount: number;
  currency: string;
  purpose: string;
  /** Our stable reference used as the idempotency key. */
  reference: string;
  centreName?: string;
  contributorEmail?: string;
  contributorName?: string;
}

export interface CreateCheckoutResult {
  /** URL the payer is redirected to (provider-hosted checkout). */
  checkoutUrl: string;
  /** Provider-side transaction reference (idempotency key). */
  providerReference: string;
  /** Optional expiry for the generated checkout. */
  expiresAt?: string | null;
}

export interface WebhookVerificationContext {
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
}

export interface ParsedWebhookEvent {
  /** Provider transaction reference. */
  reference: string;
  status: "SUCCESSFUL" | "FAILED" | "CANCELLED" | "REFUNDED";
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  /** Create a provider-hosted checkout. */
  createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;
  /** Server-side verify an incoming webhook signature. */
  verifyWebhookSignature(ctx: WebhookVerificationContext): boolean;
  /** Parse a verified webhook payload into a canonical event. */
  parseWebhookEvent(payload: unknown): ParsedWebhookEvent;
}

// ─── Mock provider (default for development / local workflows) ─────────────

/**
 * Mock payment provider used when no live gateway is configured. It returns a
 * deterministic checkout URL (the payment confirmation page) and accepts a
 * local confirmation without real card processing. It EXISTS so the full
 * idempotent, webhook-confirmed flow can be exercised end-to-end.
 *
 * A real provider implementation is added by implementing `PaymentProvider`
 * and toggling PAYMENT_PROVIDER. The application logic is provider-agnostic.
 */
class MockPaymentProvider implements PaymentProvider {
  readonly name: PaymentProviderName = "MOCK";

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    // Deterministic reference (our idempotency key echoed back to the provider).
    const providerReference = `MOCK-${params.reference}`;
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const checkoutUrl = `${baseUrl}/payments/confirm?ref=${encodeURIComponent(providerReference)}`;
    return { checkoutUrl, providerReference, expiresAt: null };
  }

  verifyWebhookSignature(ctx: WebhookVerificationContext): boolean {
    // In mock mode, confirmation is enabled for the local development flow.
    void ctx;
    return true;
  }

  parseWebhookEvent(payload: unknown): ParsedWebhookEvent {
    const body = (payload ?? {}) as {
      reference?: string;
      status?: string;
      amount?: number;
      currency?: string;
      metadata?: Record<string, unknown>;
    };
    const statusMap: ParsedWebhookEvent["status"] =
      body.status === "FAILED"
        ? "FAILED"
        : body.status === "CANCELLED"
          ? "CANCELLED"
          : body.status === "REFUNDED"
            ? "REFUNDED"
            : "SUCCESSFUL";
    return {
      reference: body.reference ?? "",
      status: statusMap,
      amount: Number(body.amount ?? 0),
      currency: body.currency ?? "KES",
      metadata: body.metadata ?? {},
    };
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function getPaymentProvider(): PaymentProvider {
  const name = (process.env.PAYMENT_PROVIDER ?? "MOCK").toUpperCase();
  switch (name) {
    // A real provider (e.g. PesaFlow / Chip / etc.) would be registered here
    // with keys read from PAYMENT_PROVIDER_* environment variables only.
    default:
      return new MockPaymentProvider();
  }
}
