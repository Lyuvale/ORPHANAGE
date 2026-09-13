/**
 * Payment Confirmation Service
 *
 * Dispatches a provider webhook-confirmed payment to the correct financial
 * context. IDEMPOTENT: a payment_transactions row may only transition once
 * to a terminal state, so duplicate webhooks are safe.
 *
 * Two distinct financial contexts (never mixed):
 *   - SUBSCRIPTION: payment activates / extends the centre's SaaS subscription
 *     (recorded on the subscription + payment_transactions, NOT a support Source).
 *   - CONTRIBUTION : payment is an online gift; on confirmation a CONTRIBUTION
 *     Source (+ optional Fund) is created in that centre's Resources & Support
 *     (the source of truth).
 *
 * SECURITY: called only after the webhook signature has been verified server-side.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSource, createFund } from "@/lib/resources/resources.service";
import {
  activateSubscription,
  extendSubscription,
  getSubscriptionById,
} from "@/lib/subscriptions/subscription.service";
import { recordAuditEvent, type SecurityAuditEventInput } from "@/lib/audit/audit.service";
import { notifyRole } from "@/lib/notifications/notifications.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

/**
 * Sentinel UUID used when a contribution is confirmed with no acting app user
 * (public anonymous donation). support_sources/support_funds.created_by are
 * NOT NULL (no FK), so this zero-UUID marks "system / online contribution"
 * without fabricating a real user.
 */
const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";

export interface PaymentRow {
  id: string;
  centre_id: string;
  flow_type: "SUBSCRIPTION" | "CONTRIBUTION";
  purpose: string | null;
  amount: number;
  currency: string;
  provider: string;
  provider_reference: string;
  status: string;
  contributor_name: string | null;
  contributor_email: string | null;
  contributor_contact: string | null;
  subscription_id: string | null;
  source_id: string | null;
  fund_id: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Confirm a payment from a verified provider webhook event.
 *
 * @returns {Promise<{ outcome: "CONFIRMED" | "ALREADY" | "IGNORED" }>}
 */
export async function confirmPayment(
  admin: AdminClient,
  event: {
    reference: string;
    status: "SUCCESSFUL" | "FAILED" | "CANCELLED" | "REFUNDED";
    amount: number;
    currency: string;
  },
  opts: {
    webhookRaw?: unknown;
    webhookSignature?: string | null;
    actorUserId?: string | null;
    /** SKIP the amount-match check. Only ever set when running the MOCK
     *  provider (development/test). Production providers always verify. */
    skipAmountVerification?: boolean;
  } = {},
): Promise<{ outcome: "CONFIRMED" | "ALREADY" | "IGNORED" }> {
  // 1. Load the payment transaction by provider reference.
  const { data: payment, error } = await admin
    .from("payment_transactions")
    .select("*")
    .eq("provider_reference", event.reference)
    .maybeSingle();

  if (error || !payment) {
    console.warn("[PAYMENT] Webhook for unknown reference ignored:", event.reference);
    return { outcome: "IGNORED" };
  }

  const row = payment as PaymentRow;

  // 2. Idempotency: only PENDING may transition to a terminal state.
  if (row.status === "SUCCESSFUL") return { outcome: "ALREADY" };
  if (row.status === "FAILED" || row.status === "CANCELLED" || row.status === "REFUNDED") {
    return { outcome: "ALREADY" };
  }
  if (row.status !== "PENDING") return { outcome: "ALREADY" };

  // 3. Amount sanity check (reject mismatched/malicious confirmations).
  const tolerance = 0.01;
  const amountOk =
    opts.skipAmountVerification === true ||
    Math.abs(Number(row.amount) - Number(event.amount)) <= tolerance;
  if (!amountOk) {
    console.warn("[PAYMENT] Amount mismatch on webhook confirmation:", row.provider_reference);
    return { outcome: "IGNORED" };
  }

  // 4. Transition the payment transaction.
  if (event.status === "SUCCESSFUL") {
    await admin
      .from("payment_transactions")
      .update({
        status: "SUCCESSFUL",
        verified_at: new Date().toISOString(),
        webhook_raw: opts.webhookRaw ?? null,
        webhook_signature: opts.webhookSignature ?? null,
      })
      .eq("id", row.id);

    // 5. Dispatch to the correct financial context.
    if (row.flow_type === "SUBSCRIPTION") {
      await handleSubscriptionConfirmation(admin, row, opts.actorUserId ?? undefined);
    } else {
      await handleContributionConfirmation(admin, row, opts.actorUserId ?? undefined);
    }
    return { outcome: "CONFIRMED" };
  }

  // Failed / cancelled / refunded — mark terminal, no Source / no activation.
  await admin
    .from("payment_transactions")
    .update({
      status: event.status,
      verified_at: new Date().toISOString(),
      webhook_raw: opts.webhookRaw ?? null,
      webhook_signature: opts.webhookSignature ?? null,
    })
    .eq("id", row.id);

  if (row.flow_type === "CONTRIBUTION") {
    await notifyRole(admin, row.centre_id, ["CENTRE_MANAGER", "ACCOUNTANT_BURSAR"], {
      title: "Online contribution not received",
      message: `A contribution attempt of ${formatAmount(row.amount, row.currency)} was ${event.status.toLowerCase()}.`,
      type: "INFORMATION",
      event_type: "PAYMENT_FAILED",
      entity_type: "CONTRIBUTION",
      entity_id: row.id,
      route: "/resources/sources",
    }, opts.actorUserId ?? undefined);
  }

  return { outcome: "CONFIRMED" };
}

async function handleSubscriptionConfirmation(
  admin: AdminClient,
  row: PaymentRow,
  actorUserId?: string,
): Promise<void> {
  if (!row.subscription_id) {
    console.warn("[PAYMENT] Subscription confirmation without subscription_id");
    return;
  }

  const subscription = await getSubscriptionById(admin, row.subscription_id);
  if (!subscription) return;

  // Renew / extend the subscription for the next billing period.
  const currentEnd = subscription.end_date;
  const now = new Date();
  let nextEnd: string;
  if (currentEnd && new Date(currentEnd).getTime() > now.getTime()) {
    // Renewal extends from current end date.
    nextEnd = addMonthsFrom(new Date(currentEnd), 1).toISOString().slice(0, 10);
  } else {
    // First payment / fresh activation extends from now.
    nextEnd = addMonthsFrom(now, 1).toISOString().slice(0, 10);
  }

  await extendSubscription(admin, row.subscription_id, { endDate: nextEnd }, {
    actorUserId: actorUserId ?? null,
    reason: `Subscription payment confirmed (${row.provider_reference})`,
  });
  await activateSubscription(admin, row.subscription_id, {
    actorUserId: actorUserId ?? null,
    reason: `Subscription payment confirmed (${row.provider_reference})`,
  });

  // Platform + centre notification.
  await notifyRole(admin, row.centre_id, ["CENTRE_MANAGER"], {
    title: "Subscription payment received",
    message: `Your SaaS subscription renewal of ${formatAmount(row.amount, row.currency)} was received.`,
    type: "INFORMATION",
    event_type: "SUBSCRIPTION_ACTIVATED",
    entity_type: "SUBSCRIPTION",
    entity_id: row.subscription_id,
    route: "/subscription",
  }, actorUserId);

  const input: SecurityAuditEventInput = {
    action: "SUBSCRIPTION_PAYMENT_RECEIVED",
    entity_type: "subscription",
    entity_id: row.subscription_id,
    centre_id: row.centre_id,
    actor_user_id: actorUserId ?? undefined,
    new_values: { amount: row.amount, currency: row.currency, reference: row.provider_reference },
  };
  await recordAuditEvent(admin, null, input);
}

async function handleContributionConfirmation(
  admin: AdminClient,
  row: PaymentRow,
  actorUserId?: string,
): Promise<void> {
  // Create the CONTRIBUTION Source (the source of truth) — unless the payment
  // is a refund for a previously received contribution (handled elsewhere).
  const contributorName = row.contributor_name || "Online contributor";
  const purpose = row.purpose || "General Support";

  const source = await createSource(admin, {
    centre_id: row.centre_id,
    source_type: "CONTRIBUTION",
    source_name: `Online contribution - ${contributorName}`,
    amount: Number(row.amount),
    source_date: new Date().toISOString().slice(0, 10),
    purpose,
    notes: `Provider reference: ${row.provider_reference}. Email: ${row.contributor_email ?? "n/a"}.`,
  }, actorUserId ?? SYSTEM_ACTOR_ID);

  // Link the source to the payment transaction.
  await admin
    .from("payment_transactions")
    .update({ source_id: source.id })
    .eq("id", row.id);

  // Optionally create a Fund for the chosen purpose (allocating the full amount).
  const defaultPurpose = purpose;
  const fund = await createFund(admin, {
    centre_id: row.centre_id,
    source_id: source.id,
    fund_name: defaultPurpose,
    amount_allocated: Number(row.amount),
    purpose: defaultPurpose,
  }, actorUserId ?? SYSTEM_ACTOR_ID);

  await admin
    .from("payment_transactions")
    .update({ fund_id: fund.id })
    .eq("id", row.id);

  // Centre notifications.
  await notifyRole(admin, row.centre_id, ["CENTRE_MANAGER", "ACCOUNTANT_BURSAR"], {
    title: "Online contribution received",
    message: `An online contribution of ${formatAmount(row.amount, row.currency)} was received (${purpose}).`,
    type: "INFORMATION",
    event_type: "CONTRIBUTION_RECEIVED",
    entity_type: "SOURCE",
    entity_id: source.id,
    route: "/resources/sources",
  }, actorUserId);

  // NOTE: A thank-you email to the contributor is intentionally not sent here —
  // email delivery is out of scope and must not carry sensitive data. The
  // contributor's supplied email/contact is only ever stored in the payment
  // transaction and shown to centre staff.

  const contributionInput: SecurityAuditEventInput = {
    action: "CONTRIBUTION_RECEIVED",
    entity_type: "support_source",
    entity_id: source.id,
    centre_id: row.centre_id,
    actor_user_id: actorUserId ?? undefined,
    new_values: { amount: row.amount, currency: row.currency, purpose, reference: row.provider_reference },
  };
  await recordAuditEvent(admin, null, contributionInput);
}

function addMonthsFrom(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Initiate a payment (creates a PENDING transaction + returns checkout details).
 * Shared by subscription-payment and online-contribution flows.
 */
export async function initiatePayment(
  admin: AdminClient,
  input: {
    centreId: string;
    flowType: "SUBSCRIPTION" | "CONTRIBUTION";
    amount: number;
    currency?: string;
    purpose?: string | null;
    providerReference: string;
    provider?: string;
    contributorName?: string | null;
    contributorEmail?: string | null;
    contributorContact?: string | null;
    subscriptionId?: string | null;
    createdBy?: string | null;
  },
): Promise<PaymentRow> {
  const { data, error } = await admin
    .from("payment_transactions")
    .insert({
      centre_id: input.centreId,
      flow_type: input.flowType,
      purpose: input.purpose ?? null,
      amount: input.amount,
      currency: input.currency ?? "TZS",
      provider: input.provider ?? "MOCK",
      provider_reference: input.providerReference,
      status: "PENDING",
      contributor_name: input.contributorName ?? null,
      contributor_email: input.contributorEmail ?? null,
      contributor_contact: input.contributorContact ?? null,
      subscription_id: input.subscriptionId ?? null,
      created_by: input.createdBy ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to initiate payment: ${error.message}`);
  return (data ?? null) as unknown as PaymentRow;
}
