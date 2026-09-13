import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { initiatePayment } from "@/lib/payments/payment-confirmation.service";
import { getPaymentProvider } from "@/lib/payments/payment-provider";

/**
 * POST /api/public/sites/[code]/donate
 *
 * PUBLIC endpoint: visitors donate to a centre from its public website. No
 * app authentication — the centre's OWN subscription/donation services are
 * never exposed; only a new CONTRIBUTION payment is created against the
 * centre, and once the (verified) provider confirms it, the money lands as a
 * CONTRIBUTION Source + Fund in that centre's Resources — visible to the
 * accountant/bursar immediately, with a notification.
 *
 * Guards (all server-side, service role):
 *   - Centre must exist, be ACTIVE and have online contributions enabled.
 *   - The platform-wide donations switch must be ON.
 *   - amount within [1, 100,000,000] TZS; purpose must be one of the centre's
 *     configured presets (or the default); email validated when provided.
 */

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100_000_000;

function parseAmount(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

async function platformDonationsEnabled(admin: ReturnType<typeof createAdminClient>): Promise<boolean> {
  const { data } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", "online_contributions_enabled")
    .maybeSingle();
  return data?.value !== false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const admin = createAdminClient();

    const { data: centre, error: centreError } = await admin
      .from("centres")
      .select("id, name, code, status")
      .eq("code", code)
      .maybeSingle();

    if (centreError) throw new Error(`Failed to load centre: ${centreError.message}`);
    if (!centre || centre.status !== "active") {
      return NextResponse.json({ error: "Centre not found." }, { status: 404 });
    }

    const { data: contribCfg } = await admin
      .from("centre_online_contributions")
      .select("enabled, purpose_presets, default_purpose")
      .eq("centre_id", centre.id)
      .maybeSingle();

    if (!contribCfg || contribCfg.enabled !== true) {
      return NextResponse.json(
        { error: "Online donations are not enabled for this centre." },
        { status: 403 },
      );
    }
    if (!(await platformDonationsEnabled(admin))) {
      return NextResponse.json(
        { error: "Online donations are currently paused." },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      amount?: unknown;
      purpose?: unknown;
      name?: unknown;
      email?: unknown;
    };

    const amount = parseAmount(body.amount);
    if (amount === null || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return NextResponse.json(
        { error: `Amount must be between TZS ${MIN_AMOUNT.toLocaleString()} and TZS ${MAX_AMOUNT.toLocaleString()}.` },
        { status: 400 },
      );
    }

    const presets: string[] = Array.isArray(contribCfg.purpose_presets)
      ? (contribCfg.purpose_presets as unknown[]).map((p) => String(p))
      : [];
    const defaultPurpose = String(contribCfg.default_purpose ?? "General Support");

    const purpose = typeof body.purpose === "string" && body.purpose.trim()
      ? body.purpose.trim().slice(0, 300)
      : defaultPurpose;
    if (purpose !== defaultPurpose && !presets.includes(purpose)) {
      return NextResponse.json(
        { error: "Please choose one of the centre's listed donation purposes." },
        { status: 400 },
      );
    }

    const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
    let email: string | null = null;
    if (typeof body.email === "string" && body.email.trim()) {
      email = body.email.trim().slice(0, 254);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
    }

    // 1. Ask the (replaceable) provider for a checkout for this donation.
    const provider = getPaymentProvider();
    const internalReference = `DON-${randomUUID()}`;
    const checkout = await provider.createCheckout({
      amount,
      currency: "TZS",
      purpose,
      reference: internalReference,
      centreName: centre.name,
      contributorEmail: email ?? undefined,
      contributorName: name || undefined,
    });

    // 2. Record the PENDING payment under the provider's reference so a
    //    verified confirmation/webhook can be matched idempotently.
    await initiatePayment(admin, {
      centreId: centre.id,
      flowType: "CONTRIBUTION",
      amount,
      currency: "TZS",
      purpose,
      provider: provider.name,
      providerReference: checkout.providerReference,
      contributorName: name || null,
      contributorEmail: email,
      createdBy: null,
    });

    return NextResponse.json(
      {
        data: {
          checkoutUrl: checkout.checkoutUrl,
          reference: checkout.providerReference,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}