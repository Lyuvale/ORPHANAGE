import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments/payment-provider";
import { initiatePayment } from "@/lib/payments/payment-confirmation.service";

interface ContributionBody {
  centre_id?: string;
  amount?: number;
  currency?: string;
  purpose?: string;
  contributor_name?: string;
  contributor_email?: string;
  contributor_contact?: string;
  idempotency_key?: string;
}

function parseAmount(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/**
 * POST /api/public/contributions
 *
 * PUBLIC endpoint to initiate an online contribution (donation) to a centre
 * that has online contributions enabled.
 *
 * SECURITY:
 *  - Never stores card/credential data.
 *  - Creates only a PENDING payment_transactions row; no money is recorded as
 *    received until a signature-verified webhook confirms it.
 *  - Idempotent via the provider reference (client-provided idempotency_key).
 *  - Amount is re-validated at confirmation time in `confirmPayment`.
 */
export async function POST(request: NextRequest) {
  try {
    let body: ContributionBody = {};
    try {
      body = (await request.json()) as ContributionBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate centre_id + amount.
    if (!body.centre_id || typeof body.centre_id !== "string") {
      return NextResponse.json({ error: "V_INVALID: centre_id is required" }, { status: 400 });
    }
    const amount = parseAmount(body.amount);
    if (amount === null) {
      return NextResponse.json({ error: "V_INVALID: amount must be a positive number" }, { status: 400 });
    }
    const currency = body.currency && /^[A-Z]{3}$/.test(body.currency) ? body.currency : "KES";

    const admin = createAdminClient();

    // Master switch (platform setting): online contributions must be enabled.
    const { data: master } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", "online_contributions_enabled")
      .maybeSingle();
    const masterEnabled = master?.value === true;
    if (!masterEnabled) {
      return NextResponse.json(
        { error: "Online contributions are currently unavailable" },
        { status: 400 },
      );
    }

    // Ensure the centre exists, is active, and has online contributions enabled.
    const { data: centre } = await admin
      .from("centres")
      .select("id, name")
      .eq("id", body.centre_id)
      .eq("status", "active")
      .maybeSingle();
    if (!centre) {
      return NextResponse.json({ error: "V_INVALID: Centre not found or inactive" }, { status: 400 });
    }

    const { data: cfg } = await admin
      .from("centre_online_contributions")
      .select("enabled, purpose_presets")
      .eq("centre_id", body.centre_id)
      .maybeSingle();
    if (!cfg || cfg.enabled !== true) {
      return NextResponse.json(
        { error: "Online contributions are not enabled for this centre" },
        { status: 400 },
      );
    }

    // Purpose sanitisation (must be one of the centre's preset purposes).
    const presets: string[] = Array.isArray(cfg.purpose_presets)
      ? (cfg.purpose_presets as string[])
      : ["General Support"];
    const purpose = body.purpose && presets.includes(body.purpose) ? body.purpose : presets[0];

    // Build an idempotent provider reference (client idempotency_key + UUID suffix).
    const idempotencyKey = (body.idempotency_key || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    const reference = `CONTRIB-${idempotencyKey || randomUUID().replace(/-/g, "")}-${randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)}`;

    // Create the pending payment transaction.
    const payment = await initiatePayment(admin, {
      centreId: body.centre_id,
      flowType: "CONTRIBUTION",
      amount,
      currency,
      purpose,
      providerReference: reference,
      contributorName: (body.contributor_name || "").slice(0, 200) || null,
      contributorEmail: (body.contributor_email || "").slice(0, 200) || null,
      contributorContact: (body.contributor_contact || "").slice(0, 200) || null,
      createdBy: null,
    });

    // Ask the (replaceable) provider to create a checkout for this payment.
    const provider = getPaymentProvider();
    const checkout = await provider.createCheckout({
      amount,
      currency,
      purpose,
      reference,
      centreName: (centre as { name: string }).name,
      contributorEmail: payment.contributor_email ?? undefined,
      contributorName: payment.contributor_name ?? undefined,
    });

    // Persist the provider reference for webhook idempotency.
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
          currency,
          purpose,
          status: "PENDING",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
