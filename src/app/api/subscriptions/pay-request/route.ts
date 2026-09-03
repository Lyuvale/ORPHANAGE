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
import { statusFromError } from "@/lib/resources/route-helpers";

function parseAmount(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/**
 * POST /api/subscriptions/pay-request
 *
 * AUTHENTICATED CENTRE: submit a subscription payment request for review.
 * The centre chooses a plan, enters the amount paid and the transaction
 * reference (rejea ya muamala). The request is stored as PENDING and later
 * reviewed by the platform admin (approved → subscription activated / plan
 * auto-selected; rejected → feedback reason).
 *
 * SECURITY: gated by requireAppAccess + requirePermission("subscriptions.manage").
 * The centre may only ever submit for its OWN centre (ctx.centre.id — never
 * taken from the client).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "subscriptions.manage");

    const body = (await request.json()) as {
      plan_id?: string;
      amount?: number;
      provider_reference?: string;
      notes?: string;
    };

    if (!body.plan_id) {
      return NextResponse.json({ error: "plan_id is required." }, { status: 400 });
    }
    const amount = parseAmount(body.amount);
    if (amount === null) {
      return NextResponse.json({ error: "amount must be a positive number." }, { status: 400 });
    }
    const reference = (body.provider_reference || "").trim();
    if (!reference) {
      return NextResponse.json(
        { error: "Transaction reference (rejea ya muamala) is required." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // The chosen plan must exist and be active.
    const plan = await getPlanById(admin, body.plan_id);
    if (!plan || !plan.is_active) {
      return NextResponse.json({ error: "Selected plan is not available." }, { status: 400 });
    }

    // Ensure this centre has a subscription to pay toward.
    const subscription = await getCurrentSubscription(admin, ctx.centre.id);
    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription found for this centre." },
        { status: 404 },
      );
    }

    const { data, error } = await admin
      .from("payment_transactions")
      .insert({
        centre_id: ctx.centre.id,
        flow_type: "SUBSCRIPTION",
        purpose: `${plan.name} subscription`,
        amount,
        currency: "KES",
        provider: "MOCK",
        provider_reference: reference,
        status: "PENDING",
        subscription_id: subscription.id,
        plan_id: plan.id,
        metadata: { notes: body.notes ?? null, submitted_plan: plan.name },
        created_by: ctx.authUserId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to submit payment request." }, { status: 500 });
    }

    return NextResponse.json(
      {
        data: {
          id: data.id,
          status: "PENDING",
          message: "Payment request submitted for review.",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
