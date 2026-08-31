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
  medicalRecordsRows,
  appointmentsRows,
  followupsRows,
  screeningsRows,
  immunizationsRows,
  healthSummaryRows,
} from "@/lib/reports/health";

const TYPES = [
  "medical-records",
  "appointments",
  "followups",
  "screenings",
  "immunizations",
  "summary",
] as const;
const FORMATS: ExportFormat[] = ["csv", "excel", "pdf"];

const TITLES: Record<(typeof TYPES)[number], string> = {
  "medical-records": "Health Medical Records",
  appointments: "Health Appointments",
  followups: "Health Follow-Ups",
  screenings: "Health Screenings",
  immunizations: "Health Immunizations",
  summary: "Health Summary",
};

// ─── GET /api/reports/health ─────────────────────────────────
// ?type=medical-records|appointments|followups|screenings|immunizations|summary&format=csv|excel|pdf
// Gated by health.view and scoped to the caller's centre.

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "health.view");

    const type = request.nextUrl.searchParams.get("type") || "medical-records";
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

    if (type === "medical-records") {
      rows = await medicalRecordsRows(admin, centreId);
    } else if (type === "appointments") {
      rows = await appointmentsRows(admin, centreId);
    } else if (type === "followups") {
      rows = await followupsRows(admin, centreId);
    } else if (type === "screenings") {
      rows = await screeningsRows(admin, centreId);
    } else if (type === "immunizations") {
      rows = await immunizationsRows(admin, centreId);
    } else if (type === "summary") {
      rows = await healthSummaryRows(admin, centreId);
    }

    return await respondWithExport(admin, ctx, {
      auditEntityType: "health_report_export",
      reportType: type,
      title,
      rows,
      format,
      filename: `health-${type}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}