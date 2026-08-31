import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import {
  getCurrentSubscription,
  getPlanById,
} from "@/lib/subscriptions/subscription.service";
import { getPaymentProvider } from "@/lib/payments/payment-provider";
import { initiatePayment } from "@/lib/payments/payment-confirmation.service";
import { statusFromError } from "@/lib/resources/route-helpers";

function parseAmount(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/**
 * POST /api/subscriptions/pay
 *
 * AUTHENTICATED: initiate an online subscription-payment for the current
 * centre's subscription (SUBSCRIPTION financial context). On webhook
 * confirmation the subscription is activated/extended — this payment is NEVER
 * recorded as a support Source (it is not a centre inflow).
 *
 * SECURITY: gated by requireAppAccess + requirePermission("subscriptions.manage").
 * The amount is taken from the centre's plan price server-side (never trusted
 * from the client) and re-validated at confirmation.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "subscriptions.manage");

    const body: Record<string, unknown> = {};
    try {
      Object.assign(body, await request.json());
    } catch {
      // fall through — no body needed for a plan-priced subscription payment
    }

    const admin = createAdminClient();

    const subscription = await getCurrentSubscription(admin, ctx.centre.id);
    if (!subscription) {
      return NextResponse.json({ error: "No subscription to pay for" }, { status: 404 });
    }

    const plan = await getPlanById(admin, subscription.plan_id);
    if (!plan) {
      return NextResponse.json({ error: "Subscription plan not found" }, { status: 404 });
    }

    // Amount always comes from the server-side plan price.
    const amount = parseAmount(plan.price) ?? 0;
    if (amount <= 0) {
      return NextResponse.json(
        { error: "This plan has no payable amount" },
        { status: 400 },
      );
    }

    const reference = `SUBSCRIPTION-${ctx.centre.id}-${body.idempotency_key && typeof body.idempotency_key === "string"
      ? body.idempotency_key.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40)
      : Date.now()}`;

    const payment = await initiatePayment(admin, {
      centreId: ctx.centre.id,
      flowType: "SUBSCRIPTION",
      amount,
      currency: "KES",
      purpose: `${plan.name} subscription (${plan.billing_period})`,
      providerReference: reference,
      subscriptionId: subscription.id,
      createdBy: ctx.authUserId,
    });

    const provider = getPaymentProvider();
    const checkout = await provider.createCheckout({
      amount,
      currency: "KES",
      purpose: payment.purpose ?? plan.name,
      reference,
      centreName: ctx.centre.name,
    });

    await admin
      .from("payment_transactions")
      .update({ provider_reference: checkout.providerReference })
      .eq("id", payment.id);

    return NextResponse.json(
      {
        data: {
          payment_id: payment.id,
          provider_reference: checkout.providerReference,
          checkout_url: checkout.checkoutUrl,
          amount,
          currency: "KES",
          purpose: payment.purpose,
          status: "PENDING",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
