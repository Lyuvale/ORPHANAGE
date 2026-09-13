import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSubscriptionForContext } from "@/lib/subscriptions/subscription-access.service";

export interface PublicCentreSummary {
  id: string;
  name: string;
  code: string | null;
  purpose_presets: string[];
  default_purpose: string;
}

/**
 * GET /api/public/centres
 *
 * PUBLIC landing-page endpoint: list centres that have ONLINE CONTRIBUTIONS
 * enabled, with their configurable donation purposes. Used by the public
 * "support a centre" experience BEFORE the platform administrator logs in.
 *
 * SECURITY: this returns only the safe marketing/purpose subset (name, code,
 * purpose presets) of ENABLED centres with a VALID SUBSCRIPTION — never staff,
 * children, balances, or inactive centres.
 */
export async function GET() {
  try {
    const admin = createAdminClient();

    // Only centres with online contributions enabled.
    const { data: enabled, error } = await admin
      .from("centre_online_contributions")
      .select("centre_id, purpose_presets, default_purpose")
      .eq("enabled", true);

    if (error) {
      return NextResponse.json({ error: "Failed to load contribution options" }, { status: 500 });
    }

    if (!enabled || enabled.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const centreIds = enabled.map((c: { centre_id: string }) => c.centre_id);

    const { data: centres, error: centreError } = await admin
      .from("centres")
      .select("id, name, code")
      .eq("status", "active")
      .in("id", centreIds);

    if (centreError) {
      return NextResponse.json({ error: "Failed to load centres" }, { status: 500 });
    }

    // SECURITY: only centres with a valid subscription may receive donations
    // or be listed on the public support page.
    const withValidSubscription: (typeof centres) = [];
    if (centres && centres.length > 0) {
      for (const centre of centres) {
        const subCtx = await loadSubscriptionForContext(admin as never, centre.id);
        if (subCtx.isSubscriptionValid) {
          withValidSubscription.push(centre);
        }
      }
    }

    const byId = new Map(
      (enabled as { centre_id: string; purpose_presets: unknown; default_purpose: string }[]).map(
        (c) => [c.centre_id, c],
      ),
    );

    const data: PublicCentreSummary[] = (
      withValidSubscription as { id: string; name: string; code: string | null }[]
    ).map((c: { id: string; name: string; code: string | null }) => {
      const cfg = byId.get(c.id);
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        purpose_presets: Array.isArray(cfg?.purpose_presets)
          ? (cfg!.purpose_presets as string[])
          : ["General Support"],
        default_purpose: cfg?.default_purpose || "General Support",
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
