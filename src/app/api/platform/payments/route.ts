import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { statusFromError } from "@/lib/resources/route-helpers";

/**
 * GET /api/platform/payments
 *
 * PLATFORM ADMIN: cross-centre payment/contribution overview. Gated by
 * requireAppAccess(+ allowInactiveSubscription) and platform.payments.
 * Returns both contribution and subscription payments with centre context.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.payments");

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("payment_transactions")
      .select(
        "id, centre_id, flow_type, purpose, amount, currency, status, provider_reference, contributor_name, contributor_email, subscription_id, source_id, fund_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: "Failed to load payments" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

/**
 * POST /api/platform/payments
 *
 * PLATFORM ADMIN: record a manual payment (cash/bank transfer).
 * Requires platform.payments permission.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.payments");

    const body = (await request.json()) as {
      centre_id?: string;
      flow_type?: string;
      purpose?: string;
      amount?: number;
      currency?: string;
      provider_reference?: string;
      contributor_name?: string;
      contributor_email?: string;
      contributor_contact?: string;
      subscription_id?: string;
      status?: string;
    };

    if (!body.centre_id || !body.flow_type || !body.amount) {
      return NextResponse.json(
        { error: "centre_id, flow_type, and amount are required." },
        { status: 400 },
      );
    }

    if (!["SUBSCRIPTION", "CONTRIBUTION"].includes(body.flow_type)) {
      return NextResponse.json(
        { error: "flow_type must be SUBSCRIPTION or CONTRIBUTION." },
        { status: 400 },
      );
    }

    if (body.amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than zero." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Verify centre exists
    const { data: centre } = await admin
      .from("centres")
      .select("id, name")
      .eq("id", body.centre_id)
      .maybeSingle();

    if (!centre) {
      return NextResponse.json({ error: "Centre not found." }, { status: 404 });
    }

    // Auto-generate provider_reference for manual payments
    const providerRef = body.provider_reference || `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // An explicitly provided reference may only ever be used once.
    if (body.provider_reference) {
      const { data: duplicateRef } = await admin
        .from("payment_transactions")
        .select("id")
        .eq("provider", "MOCK")
        .eq("provider_reference", body.provider_reference)
        .maybeSingle();
      if (duplicateRef) {
        return NextResponse.json(
          { error: "This transaction reference has already been used." },
          { status: 409 },
        );
      }
    }

    const { data, error } = await admin
      .from("payment_transactions")
      .insert({
        centre_id: body.centre_id,
        flow_type: body.flow_type,
        purpose: body.purpose || null,
        amount: body.amount,
        currency: body.currency || "TZS",
        provider: "MOCK",
        provider_reference: providerRef,
        status: body.status || "PENDING",
        contributor_name: body.contributor_name || null,
        contributor_email: body.contributor_email || null,
        contributor_contact: body.contributor_contact || null,
        subscription_id: body.subscription_id || null,
        created_by: ctx.authUserId,
      })
      .select()
      .single();

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "This transaction reference has already been used." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: "Failed to record payment." }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
