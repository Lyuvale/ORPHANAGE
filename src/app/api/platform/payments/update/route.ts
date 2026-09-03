import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { notifyRole } from "@/lib/notifications/notifications.service";

function addMonthsFrom(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

const BILLING_MONTHS: Record<string, number> = {
  DAILY: 0,
  WEEKLY: 0,
  MONTHLY: 1,
  QUARTERLY: 3,
  YEARLY: 12,
  ONETIME: 0,
};

/**
 * PATCH /api/platform/payments/update
 *
 * PLATFORM ADMIN: review a centre-submitted subscription payment.
 *   - status = SUCCESSFUL: approves the payment. The submitted amount is used
 *     to auto-select the best-fitting active plan (highest plan whose price is
 *     <= the confirmed amount) and the centre's subscription is activated with
 *     that plan for its billing period.
 *   - status = FAILED (reject): records an optional `feedback` reason that the
 *     centre sees.
 *
 * SECURITY: gated by requireAppAccess(+ allowInactiveSubscription) and
 * platform.payments. Only a pending payment may be reviewed.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient, {
      allowInactiveSubscription: true,
    });
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "platform.payments");

    const body = (await request.json()) as {
      payment_id?: string;
      status?: string;
      feedback?: string;
    };

    if (!body.payment_id || !body.status) {
      return NextResponse.json({ error: "payment_id and status are required." }, { status: 400 });
    }

    const validStatuses = ["PENDING", "SUCCESSFUL", "FAILED", "CANCELLED", "REFUNDED"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const admin = createAdminClient();

    // Get current payment (full row needed for plan/amount/subscription).
    const { data: current } = await admin
      .from("payment_transactions")
      .select("id, status, amount, centre_id, subscription_id, plan_id")
      .eq("id", body.payment_id)
      .maybeSingle();

    if (!current) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }

    // Only a PENDING payment may be reviewed.
    if (current.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending payments can be reviewed." },
        { status: 409 },
      );
    }

    const feedback = (body.feedback || "").trim() || null;

    let proposedPlanId: string | null = (body.status === "SUCCESSFUL" ? current.plan_id : null) ?? null;

    if (body.status === "SUCCESSFUL") {
      // Auto-select the best-fitting active plan for the confirmed amount.
      const { data: activePlans } = await admin
        .from("plans")
        .select("id, name, price, billing_period")
        .eq("is_active", true)
        .order("price", { ascending: true });

      const plans = (activePlans ?? []) as {
        id: string;
        name: string;
        price: number | string;
        billing_period: string;
      }[];

      if (plans.length === 0) {
        return NextResponse.json({ error: "No active plans are configured." }, { status: 400 });
      }

      const confirmedAmount = Number(current.amount);
      let selected: (typeof plans)[number] | null = null;
      for (const p of plans) {
        if (Number(p.price) <= confirmedAmount) selected = p;
        else break;
      }

      if (!selected) {
        return NextResponse.json(
          {
            error: `Confirmed amount (${confirmedAmount}) is below the cheapest available plan. Reject with feedback instead.`,
          },
          { status: 400 },
        );
      }

      proposedPlanId = selected.id;

      // Activate the centre's subscription with the selected plan.
      if (current.subscription_id) {
        const months = BILLING_MONTHS[selected.billing_period] ?? 1;
        const endDate =
          months > 0
            ? addMonthsFrom(new Date(), months).toISOString().slice(0, 10)
            : null;

        const { data: sub } = await admin
          .from("subscriptions")
          .update({
            plan_id: selected.id,
            status: "active",
            end_date: endDate,
            payment_status: "paid",
            payment_reference: body.payment_id,
          })
          .eq("id", current.subscription_id)
          .select("id, centre_id, plan_id, status")
          .maybeSingle();

        if (sub) {
          // Record history so the change is auditable.
          await admin.from("subscription_history").insert({
            subscription_id: sub.id,
            centre_id: sub.centre_id,
            action: "PAYMENT_APPROVED",
            plan_id: selected.id,
            previous_status: null,
            new_status: "active",
            changed_by: ctx.authUserId,
            reason: `Payment approved (${confirmedAmount}). Plan auto-selected: ${selected.name}.`,
          });
        }
      }
    }

    // Persist the review outcome.
    const updatePayload: Record<string, unknown> = {
      status: body.status,
      reviewed_by: ctx.authUserId,
      reviewed_at: new Date().toISOString(),
    };
    if (body.status === "SUCCESSFUL") {
      updatePayload.plan_id = proposedPlanId;
    } else {
      updatePayload.review_feedback = feedback;
    }

    const { data, error } = await admin
      .from("payment_transactions")
      .update(updatePayload)
      .eq("id", body.payment_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update payment." }, { status: 500 });
    }

    // Notify the centre of the review outcome.
    const message =
      body.status === "SUCCESSFUL"
        ? "Your subscription payment was approved and your subscription is now active."
        : feedback
          ? `Your payment request was not approved: ${feedback}`
          : "Your payment request was not approved.";

    await notifyRole(admin, current.centre_id, ["CENTRE_MANAGER"], {
      title: body.status === "SUCCESSFUL" ? "Payment approved" : "Payment request rejected",
      message,
      type: body.status === "SUCCESSFUL" ? "INFORMATION" : "WARNING",
      event_type: body.status === "SUCCESSFUL" ? "PAYMENT_RECEIVED" : "PAYMENT_FAILED",
      entity_type: "PAYMENT",
      entity_id: current.id,
      route: "/subscriptions",
    }, ctx.authUserId);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
