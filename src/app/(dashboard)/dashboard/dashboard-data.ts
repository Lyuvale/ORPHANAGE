import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any, "public", any>;

/**
 * Direct, minimal dashboard queries.
 *
 * The dashboard previously called its own `/api/*` routes over HTTP with
 * `cache: "no-store"`. That re-entered middleware + auth + DB for every widget.
 * These helpers query the same tables with explicit columns and centre scoping,
 * so a dashboard load is a handful of cheap queries instead of many HTTP hops.
 */

function admin(): AdminClient {
  return createAdminClient() as AdminClient;
}

export async function countCentreRows(
  table: string,
  centreId: string,
  filters: Record<string, string> = {},
  notIn?: { column: string; values: string[] },
): Promise<number | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = admin()
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("centre_id", centreId);
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    if (notIn && notIn.values.length > 0) {
      query = query.not(notIn.column, "in", `(${notIn.values.join(",")})`);
    }
    const { count, error } = await query;
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

export interface DashReferralRow {
  id: string;
  child_first_name: string | null;
  child_last_name: string | null;
  status: string | null;
  source: string | null;
  reference_number: string | null;
}

export async function listDashReferrals(
  centreId: string,
  status: string,
  limit = 20,
): Promise<DashReferralRow[]> {
  try {
    const { data, error } = await admin()
      .from("referrals")
      .select(
        "id, child_first_name, child_last_name, status, source, reference_number",
      )
      .eq("centre_id", centreId)
      .eq("status", status)
      .order("submitted_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as DashReferralRow[];
  } catch {
    return [];
  }
}

export interface DashAdmissionRow {
  id: string;
  referral_id: string | null;
  child_id: string | null;
  reference_number: string | null;
}

export async function listDashAdmissions(
  centreId: string,
  status: string,
  limit = 20,
): Promise<DashAdmissionRow[]> {
  try {
    const { data, error } = await admin()
      .from("admissions")
      .select("id, referral_id, child_id, reference_number")
      .eq("centre_id", centreId)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as DashAdmissionRow[];
  } catch {
    return [];
  }
}

export interface DashGuardianRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  referral_id: string | null;
}

export async function listDashGuardiansByReferral(
  centreId: string,
  referralIds: string[],
): Promise<DashGuardianRow[]> {
  if (referralIds.length === 0) return [];
  try {
    const { data, error } = await admin()
      .from("guardians")
      .select("id, first_name, last_name, referral_id")
      .eq("centre_id", centreId)
      .in("referral_id", referralIds);
    if (error) return [];
    return (data ?? []) as DashGuardianRow[];
  } catch {
    return [];
  }
}

export async function latestSubscriptionStatus(
  centreId: string,
): Promise<string | null> {
  try {
    const { data, error } = await admin()
      .from("subscriptions")
      .select("status")
      .eq("centre_id", centreId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return (data as { status?: string } | null)?.status ?? null;
  } catch {
    return null;
  }
}
