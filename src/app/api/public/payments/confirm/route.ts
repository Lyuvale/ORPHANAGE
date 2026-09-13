import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmPayment } from "@/lib/payments/payment-confirmation.service";
import { getPaymentProvider } from "@/lib/payments/payment-provider";

/**
 * POST /api/public/payments/confirm
 *
 * PUBLIC (MOCK provider only): confirm a donation after the visitor returns
 * from the checkout. Idempotent — repeats return "ALREADY" without side
 * effects. On first confirmation the contribution is dispatched to the
 * centre's Resources & Support (CONTRIBUTION Source + Fund) and the manager
 * and accountant are notified.
 *
 * SECURITY: this confirmation path is ONLY available while the payment
 * provider is the development MOCK provider (the confirmation page is the
 * provider's checkout URL). With a real provider, confirmations arrive only
 * through the provider webhook after signature verification — this route
 * returns 403 so money can never be "booked" from a client request.
 */
export async function POST(request: NextRequest) {
  try {
    if (getPaymentProvider().name !== "MOCK") {
      return NextResponse.json(
        { error: "Payment confirmation is handled by the payment provider webhook." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { reference?: unknown };
    if (typeof body.reference !== "string" || !body.reference.trim()) {
      return NextResponse.json({ error: "reference is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const result = await confirmPayment(
      admin,
      { reference: body.reference.trim(), status: "SUCCESSFUL", amount: 0, currency: "TZS" },
      { skipAmountVerification: true },
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}