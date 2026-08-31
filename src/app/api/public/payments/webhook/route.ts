import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments/payment-provider";
import { confirmPayment } from "@/lib/payments/payment-confirmation.service";

/**
 * POST /api/public/payments/webhook
 *
 * PUBLIC provider callback — the ONLY route that records money as received.
 *
 * SECURITY:
 *  - The raw request body is re-read (not the parsed JSON) so the signature
 *    is verified over the exact bytes sent by the provider.
 *  - Signature verification is server-side and provider-specific
 *    (secrets come from env only; never stored).
 *  - Idempotent: `confirmPayment` only transitions a PENDING transaction to a
 *    terminal state, so duplicate or replayed callbacks are safe.
 *  - Amount is re-checked against the stored pending amount.
 *  - No sensitive credentials are ever logged or returned.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    const provider = getPaymentProvider();

    // 1. Verify the signature over the raw body (deny if invalid).
    const headers: Record<string, string | string[] | undefined> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const verified = provider.verifyWebhookSignature({ headers, rawBody });
    if (!verified) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    // 2. Parse the verified event into a canonical confirmation.
    let payload: unknown;
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const event = provider.parseWebhookEvent(payload);

    if (!event.reference || event.amount <= 0) {
      return NextResponse.json({ error: "Malformed webhook event" }, { status: 400 });
    }

    // 3. Dispatch the confirmation (idempotent, amount-verified).
    //    The MOCK provider (dev/test only) skips the amount re-check because
    //    its mock gateway does not echo a real amount. Production providers
    //    always verify the amount against the stored pending transaction.
    const signatureValue = headers["x-payment-signature"];
    const signature = Array.isArray(signatureValue)
      ? signatureValue[0] ??
        null
      : typeof signatureValue === "string"
        ? signatureValue
        : null;
    const admin = createAdminClient();
    const result = await confirmPayment(admin, {
      reference: event.reference,
      status: event.status,
      amount: event.amount,
      currency: event.currency,
    }, {
      webhookRaw: payload,
      webhookSignature: signature,
      skipAmountVerification: provider.name === "MOCK",
    });

    // 4. Always acknowledge to the provider (idempotent by design).
    return NextResponse.json({ ok: true, outcome: result.outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    // Do NOT leak internals to the caller; log server-side.
    console.error("[PAYMENT-WEBHOOK] Failed to process webhook:", message);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
