import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PERMISSIONS,
  ALL_PERMISSIONS,
  CENTRE_ROLES,
  ROLE_PERMISSIONS,
  PLATFORM_ROLES,
  PLATFORM_ROLE_PERMISSIONS,
} from "@/types/role";
import {
  getPaymentProvider,
  type PaymentProvider,
} from "@/lib/payments/payment-provider";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260912000000_create_platform_admin_payments.sql"),
  "utf-8",
);
const lower = migration.toLowerCase();

describe("Platform Administration permissions", () => {
  it("defines platform.* permissions in the catalogue", () => {
    expect(PERMISSIONS.PLATFORM_VIEW).toBe("platform.view");
    expect(PERMISSIONS.PLATFORM_CENTRES).toBe("platform.centres");
    expect(PERMISSIONS.PLATFORM_SUBSCRIPTIONS).toBe("platform.subscriptions");
    expect(PERMISSIONS.PLATFORM_PAYMENTS).toBe("platform.payments");
    expect(PERMISSIONS.PLATFORM_SETTINGS).toBe("platform.settings");
    expect(ALL_PERMISSIONS).toContain("platform.view");
    expect(ALL_PERMISSIONS).toContain("platform.centres");
    expect(ALL_PERMISSIONS).toContain("platform.subscriptions");
    expect(ALL_PERMISSIONS).toContain("platform.payments");
    expect(ALL_PERMISSIONS).toContain("platform.settings");
  });

  it("PLATFORM_ADMINISTRATOR is NOT a centre role (deny-by-default)", () => {
    expect(CENTRE_ROLES).not.toContain("PLATFORM_ADMINISTRATOR");
    expect(CENTRE_ROLES).not.toContain("PLATFORM_ADMIN");
    expect(PLATFORM_ROLES).toContain("PLATFORM_ADMINISTRATOR");
  });

  it("no centre role receives platform.* permissions", () => {
    for (const role of CENTRE_ROLES) {
      for (const perm of ROLE_PERMISSIONS[role]) {
        expect(perm.startsWith("platform.")).toBe(false);
        expect(perm.startsWith("online_contributions.")).toBe(false);
      }
    }
  });

  it("only the PLATFORM_ADMINISTRATOR references carry platform.* permissions", () => {
    const platformPerms = PLATFORM_ROLE_PERMISSIONS.PLATFORM_ADMINISTRATOR;
    expect(platformPerms).toContain("platform.view");
    expect(platformPerms).toContain("platform.centres");
    expect(platformPerms).toContain("platform.subscriptions");
    expect(platformPerms).toContain("platform.payments");
    expect(platformPerms).toContain("platform.settings");
    expect(platformPerms).toContain("online_contributions.manage");
  });

  it("CENTRE_MANAGER / ACCOUNTANT_BURSAR may view their OWN centre payments only", () => {
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).toContain("payments.view");
    expect(ROLE_PERMISSIONS.ACCOUNTANT_BURSAR).toContain("payments.view");
    expect(ROLE_PERMISSIONS.CENTRE_MANAGER).not.toContain("payments.refund");
    expect(ROLE_PERMISSIONS.SOCIAL_WORKER).not.toContain("payments.view");
    expect(ROLE_PERMISSIONS.CAREGIVER).not.toContain("payments.view");
    expect(ROLE_PERMISSIONS.RECORDS_OFFICER).not.toContain("payments.view");
  });
});

describe("Platform & Payments Migration", () => {
  it("adds the PLATFORM_ADMINISTRATOR role", () => {
    expect(migration).toContain("'PLATFORM_ADMINISTRATOR'");
  });

  it("fixes the notification enums for subscriptions + payments", () => {
    for (const evt of [
      "SUBSCRIPTION_ACTIVATED",
      "SUBSCRIPTION_EXPIRED",
      "PAYMENT_RECEIVED",
      "CONTRIBUTION_RECEIVED",
      "PAYMENT_FAILED",
      "PLATFORM_ALERT",
    ]) {
      expect(migration).toContain(`ADD VALUE IF NOT EXISTS '${evt}'`);
    }
    expect(migration).toContain(`ADD VALUE IF NOT EXISTS 'PAYMENT'`);
    expect(migration).toContain(`ADD VALUE IF NOT EXISTS 'CONTRIBUTION'`);
    expect(migration).toContain(`ADD VALUE IF NOT EXISTS 'PLATFORM'`);
  });

  it("adds CONTRIBUTION and RESOURCE source types + a source status column", () => {
    expect(lower).toContain("'contribution'");
    expect(lower).toContain("'resource'");
    expect(lower).toContain(`add column if not exists status support_source_status`);
    expect(lower).toContain("create type support_source_status as enum");
  });

  it("creates payment_transactions with idempotency + dual financial context", () => {
    expect(lower).toContain("create table payment_transactions ");
    expect(lower).toContain("unique (provider, provider_reference)");
    expect(lower).toContain("payment_flow_type");
    expect(lower).toContain("subscription_id");
    expect(lower).toContain("source_id");
    expect(lower).toContain("webhook_signature");
    expect(migration).toContain("'SUBSCRIPTION', 'CONTRIBUTION'");
    expect(migration).toContain("'PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'REFUNDED'");
  });

  it("enables RLS and tenant isolation on payment_transactions", () => {
    expect(lower).toContain("alter table payment_transactions enable row level security");
    expect(lower).toContain("payments_select_own");
    expect(lower).toContain("using (centre_id = public.current_centre_id())");
  });

  it("creates platform administration tables", () => {
    expect(lower).toContain("create table platform_settings ");
    expect(lower).toContain("create table centre_online_contributions ");
    expect(lower).toContain("create table platform_alerts ");
    expect(lower).toContain("online_contrib_select_enabled");
  });
});

describe("Payment Provider abstraction", () => {
  const provider: PaymentProvider = getPaymentProvider();

  it("exposes a replaceable provider (default MOCK)", () => {
    expect(provider.name).toBe("MOCK");
  });

  it("createCheckout returns a provider reference and a checkout URL", async () => {
    const result = await provider.createCheckout({
      amount: 100,
      currency: "KES",
      purpose: "General Support",
      reference: "test-ref-1",
    });
    expect(result.providerReference).toBe("MOCK-test-ref-1");
    expect(result.checkoutUrl).toContain("/payments/confirm?ref=");
  });

  it("parseWebhookEvent maps provider statuses to canonical statuses", () => {
    expect(provider.parseWebhookEvent({ reference: "MOCK-x", status: "SUCCESSFUL" }).status).toBe(
      "SUCCESSFUL",
    );
    expect(provider.parseWebhookEvent({ reference: "MOCK-x", status: "FAILED" }).status).toBe(
      "FAILED",
    );
    expect(provider.parseWebhookEvent({ reference: "MOCK-x", status: "CANCELLED" }).status).toBe(
      "CANCELLED",
    );
    expect(provider.parseWebhookEvent({ reference: "MOCK-x", status: "REFUNDED" }).status).toBe(
      "REFUNDED",
    );
  });
});

describe("Centre-submitted payment flow & security", () => {
  const publicCentres = readFileSync(
    join(process.cwd(), "src/app/api/public/centres/route.ts"),
    "utf-8",
  );
  const submitPay = readFileSync(
    join(process.cwd(), "src/app/api/subscriptions/pay-request/route.ts"),
    "utf-8",
  );
  const submitPayments = readFileSync(
    join(process.cwd(), "src/app/api/subscriptions/payments/route.ts"),
    "utf-8",
  );
  const review = readFileSync(
    join(process.cwd(), "src/app/api/platform/payments/update/route.ts"),
    "utf-8",
  );

  it("public centre pages do not store card data or secrets", () => {
    expect(publicCentres).not.toMatch(/card_number/i);
    expect(publicCentres).not.toMatch(/cvv|cvc|card_number/i);
  });

  it("the centre payment-submission route stays authenticated + permission gated", () => {
    expect(submitPay).toContain("requireAppAccess");
    expect(submitPay).toContain("requirePermission");
    expect(submitPay).toContain("subscriptions.manage");
    expect(submitPay).toContain("ctx.centre.id");
  });

  it("the centre payment-history route is tenant-scoped to the own centre", () => {
    expect(submitPayments).toContain("requireAppAccess");
    expect(submitPayments).toContain("requirePermission");
    expect(submitPayments).toContain("subscriptions.manage");
    expect(submitPayments).toContain("ctx.centre.id");
  });

  it("the review route is platform-gated and auto-selects a plan on approval", () => {
    expect(review).toContain("requirePermission");
    expect(review).toContain("platform.payments");
    expect(review).toContain("SUCCESSFUL");
    expect(review).toContain("review_feedback");
  });
});
