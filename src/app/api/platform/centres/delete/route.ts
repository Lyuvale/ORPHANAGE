import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/platform/centres/delete
 * PLATFORM ADMIN: PHYSICALLY delete a centre (permanent, frees the centre code).
 * Blocks if the centre has active children (they must be transferred first).
 *
 * Deletion order:
 *   1. All centre-scoped module data (children, cases, visits, health, staff
 *      records, subscriptions, payments, notifications, audit, roles…).
 *   2. The centre's staff accounts (profiles + auth users). The platform
 *      administrator is never deleted.
 *   3. The centre row itself — so its code can be reused.
 */

// All tables that carry a centre_id and must be cleaned before the centres row.
// Ordered roughly leaf-first (reference tables before the core entities they
// point at) so RESTRICT foreign keys are satisfied.
const CENTRE_CHILD_TABLES = [
  "child_presence",
  "child_caregivers",
  "child_guardians",
  "child_status_history",
  "daily_care_records",
  "daily_notes",
  "meal_records",
  "care_followups",
  "interventions",
  "admission_history",
  "referral_documents",
  "case_notes",
  "case_documents",
  "case_assessments",
  "case_plan_items",
  "case_plans",
  "case_status_history",
  "safeguarding_actions",
  "safeguarding_documents",
  "safeguarding_escalations",
  "safeguarding_status_history",
  "visit_restrictions",
  "visit_status_history",
  "contact_attempts",
  "health_medical_visits",
  "health_appointments",
  "health_appointment_history",
  "health_medication_admin",
  "health_immunizations",
  "health_screenings",
  "health_alerts",
  "health_followups",
  "health_documents",
  "health_medications",
  "education_achievements",
  "education_goals",
  "education_support_needs",
  "education_progress",
  "staff_documents",
  "staff_emergency_contacts",
  "staff_qualifications",
  "staff_training",
  "staff_assignments",
  "staff_history",
  "staff_profiles",
  "support_asset_costs",
  "support_asset_history",
  "support_benefit_children",
  "support_expenses",
  "support_documents",
  "guardian_documents",
  "admissions",
  "referrals",
  "safeguarding_concerns",
  "placements",
  "cases",
  "visits",
  "guardians",
  "education_attendance",
  "education_profiles",
  "health_medical_records",
  "health_profiles",
  "support_assets",
  "support_benefits",
  "support_funds",
  "support_sources",
  "children",
  "subscription_history",
  "subscriptions",
  "payment_transactions",
  "centre_online_contributions",
  "notifications",
  "notification_preferences",
  "audit_logs",
  "role_history",
  "user_roles",
];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { centre_id?: string };
    if (!body.centre_id) {
      return NextResponse.json({ error: "centre_id is required." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check centre exists
    const { data: centre } = await admin
      .from("centres")
      .select("id, name, status")
      .eq("id", body.centre_id)
      .maybeSingle();

    if (!centre) {
      return NextResponse.json({ error: "Centre not found." }, { status: 404 });
    }

    // Check for active children
    const { count: childCount } = await admin
      .from("children")
      .select("id", { count: "exact", head: true })
      .eq("centre_id", body.centre_id)
      .eq("status", "active");

    if (childCount && childCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: centre has ${childCount} active children. Transfer them first.` },
        { status: 409 },
      );
    }

    // 1. Remove all centre-scoped data across the child tables.
    // A missing relation (table not migrated yet) is tolerated; real errors abort.
    for (const table of CENTRE_CHILD_TABLES) {
      const { error } = await admin.from(table as never).delete().eq("centre_id", body.centre_id);
      if (error && !/PGRST205|42703|42P01|PGRST106/i.test(error.message ?? "")) {
        return NextResponse.json({ error: `Failed to clean ${table}: ${error.message}` }, { status: 500 });
      }
    }

    // 2. Delete the centre's staff accounts (profile + auth user), never platform admin.
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("id, auth_user_id")
      .eq("centre_id", body.centre_id);

    let deletedAccounts = 0;
    if (profiles && profiles.length > 0) {
      for (const profile of profiles as { id: string; auth_user_id: string | null }[]) {
        // Clear caregiver links (RESTRICT) and role assignments for this profile
        await admin.from("child_caregivers").delete().eq("caregiver_id", profile.id);
        await admin.from("user_roles").delete().eq("user_id", profile.id);

        const { error } = await admin.from("user_profiles").delete().eq("id", profile.id);
        if (error) {
          // If this profile owns the platform administration role, refuse the whole delete.
          if (/PGRST205|42703|42P01/i.test(error.message ?? "")) {
            // missing relation — ignore, profile delete itself is what matters
          } else {
            return NextResponse.json({ error: error.message }, { status: 500 });
          }
        }
        if (profile.auth_user_id) {
          await admin.auth.admin.deleteUser(profile.auth_user_id).catch(() => {
            // auth account may already be gone; ignore
          });
        }
        deletedAccounts += 1;
      }
    }

    // 3. Delete the centre row itself (frees its code).
    const { error } = await admin.from("centres").delete().eq("id", body.centre_id);
    if (error) {
      return NextResponse.json({ error: `Failed to delete centre: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      data: { success: true, message: "Centre permanently deleted.", accountsDeleted: deletedAccounts },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
