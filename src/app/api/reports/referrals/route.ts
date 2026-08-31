import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { statusFromError } from "@/lib/resources/route-helpers";
import type { ReportRows } from "@/lib/resources/reports";
import { respondWithExport } from "@/lib/reports/export-response";
import type { ExportFormat } from "@/lib/reports/export";
import {
  getAllReferrals,
  referralsDetailRows,
  referralsByStatusRows,
} from "@/lib/reports/referrals";

const TYPES = ["referrals", "by-status"] as const;
const FORMATS: ExportFormat[] = ["csv", "excel", "pdf"];

const TITLES: Record<(typeof TYPES)[number], string> = {
  referrals: "Referrals List",
  "by-status": "Referrals by Status",
};

// ─── GET /api/reports/referrals ─────────────────────────────
// ?type=referrals|by-status&format=csv|excel|pdf
// Gated by referrals.view and scoped to the caller's centre.

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "referrals.view");

    const type = request.nextUrl.searchParams.get("type") || "referrals";
    const formatParam = request.nextUrl.searchParams.get("format") || "csv";

    if (!(TYPES as readonly string[]).includes(type)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
    if (!(FORMATS as readonly string[]).includes(formatParam as ExportFormat)) {
      return NextResponse.json({ error: "Invalid report format" }, { status: 400 });
    }

    const admin = createAdminClient();
    const centreId = ctx.centre.id;
    const format = formatParam as ExportFormat;

    let rows: ReportRows = [];
    const title = TITLES[type as (typeof TYPES)[number]];

    if (type === "referrals") {
      const referrals = await getAllReferrals(admin, centreId);
      rows = referralsDetailRows(referrals);
    } else if (type === "by-status") {
      const referrals = await getAllReferrals(admin, centreId);
      rows = referralsByStatusRows(referrals);
    }

    return await respondWithExport(admin, ctx, {
      auditEntityType: "referrals_report_export",
      reportType: type,
      title,
      rows,
      format,
      filename: `referrals-${type}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
