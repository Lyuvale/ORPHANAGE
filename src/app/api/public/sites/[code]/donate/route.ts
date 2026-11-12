import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { initiatePayment } from "@/lib/payments/payment-confirmation.service";
import { getPaymentProvider } from "@/lib/payments/payment-provider";
import { createRateLimiter, clientIp } from "@/lib/security/rate-limit";
import { createPublicContribution } from "@/lib/centre-site/centre-needs.service";
import { publicContributionSchema } from "@/lib/centre-site/centre-needs.validation";

const donateLimiter = createRateLimiter(30, 10 * 60 * 1000); // 30 per 10 min / IP

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
 * Two modes:
 *   1. Manual transfer (body.transaction_reference present): record a PENDING
 *      contribution for accountant verification. This is a bank / M-Pesa
 *      transfer, NOT a gateway payment, so online-donation switches are NOT
 *      required.
 *   2. Auto-checkout (no transaction_reference): create a provider checkout.
 *      This path requires the centre's online contributions to be enabled and
 *      the platform-wide donations switch to be ON.
 *
 * Guards (all server-side, service role):
 *   - Centre must exist and be ACTIVE.
 *   - amount within [1, 100,000,000] TZS; for checkout, purpose must be one of
 *     the centre's configured presets (or the default); email validated.
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

    // Rate limit BEFORE any work: per-IP cap on donation initiations.
    const limit = donateLimiter(clientIp(request));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

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

    const body = (await request.json().catch(() => ({}))) as {
      amount?: unknown;
      purpose?: unknown;
      name?: unknown;
      email?: unknown;
      needId?: unknown;
      transaction_reference?: unknown;
      contributor_name?: unknown;
    };

    const amount = parseAmount(body.amount);
    if (amount === null || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      return NextResponse.json(
        { error: `Amount must be between TZS ${MIN_AMOUNT.toLocaleString()} and TZS ${MAX_AMOUNT.toLocaleString()}.` },
        { status: 400 },
      );
    }

    // ── Transfer mode (bank / M-Pesa reference supplied) ──────────────────
    // The donor says they transferred money outside the platform. Record a
    // PENDING contribution; the accountant verifies it before it counts.
    const transactionReference =
      typeof body.transaction_reference === "string"
        ? body.transaction_reference.trim()
        : "";

    if (transactionReference) {
      const parsed = publicContributionSchema.safeParse({
        needId: body.needId,
        amount,
        transaction_reference: transactionReference,
        contributor_name:
          typeof body.contributor_name === "string"
            ? body.contributor_name
            : typeof body.name === "string"
              ? body.name
              : null,
      });

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: parsed.error.issues.map((issue) => issue.message).join("; "),
          },
          { status: 400 },
        );
      }

      try {
        const contribution = await createPublicContribution(admin, centre.id, {
          needId: parsed.data.needId,
          amount: parsed.data.amount,
          transactionReference: parsed.data.transaction_reference,
          contributorName: parsed.data.contributor_name,
        });
        return NextResponse.json(
          {
            data: {
              id: contribution.id,
              status: contribution.status,
            },
          },
          { status: 201 },
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Need not available"
        ) {
          return NextResponse.json(
            { error: "Need not available" },
            { status: 404 },
          );
        }
        throw error;
      }
    }

    // ── Auto-checkout gateway mode (no transaction reference) ─────────────
    // Manual transfers returned above never reach the payment gateway, so the
    // centre's online-contribution switch and the platform switch are enforced
    // ONLY for this gateway path.
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

    // Optional: donate to a specific published need. When present the need's
    // title becomes the purpose (server-side, never trusted from the client)
    // and the preset-purpose check is skipped. The need is stored in
    // payment_transactions.metadata so confirmation can link the contribution.
    let needId: string | null = null;
    let needTitle: string | null = null;

    if (typeof body.needId === "string" && body.needId.trim()) {
      const { data: need, error: needError } = await admin
        .from("centre_needs")
        .select("id, centre_id, title, status, is_public")
        .eq("id", body.needId.trim())
        .maybeSingle();

      if (needError) throw new Error(`Failed to load need: ${needError.message}`);
      if (
        !need ||
        need.centre_id !== centre.id ||
        need.status !== "active" ||
        need.is_public !== true
      ) {
        return NextResponse.json(
          { error: "Need not available" },
          { status: 404 },
        );
      }

      needId = String(need.id);
      needTitle = String(need.title);
    }

    const presets: string[] = Array.isArray(contribCfg.purpose_presets)
      ? (contribCfg.purpose_presets as unknown[]).map((p) => String(p))
      : [];
    const defaultPurpose = String(contribCfg.default_purpose ?? "General Support");

    let purpose: string;
    if (needId && needTitle) {
      purpose = needTitle.slice(0, 300);
    } else {
      purpose = typeof body.purpose === "string" && body.purpose.trim()
        ? body.purpose.trim().slice(0, 300)
        : defaultPurpose;
      if (purpose !== defaultPurpose && !presets.includes(purpose)) {
        return NextResponse.json(
          { error: "Please choose one of the centre's listed donation purposes." },
          { status: 400 },
        );
      }
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
      metadata: needId ? { needId } : null,
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