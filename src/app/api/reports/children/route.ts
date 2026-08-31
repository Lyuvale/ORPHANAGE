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
  getActiveChildren,
  childrenByStatusRows,
  childrenDetailRows,
  childrenAgeGroupRows,
  admissionHistoryRows,
  statusHistoryRows,
} from "@/lib/reports/children";

const TYPES = ["by-status", "detail", "by-age", "admissions", "status-history"] as const;
const FORMATS: ExportFormat[] = ["csv", "excel", "pdf"];

const TITLES: Record<(typeof TYPES)[number], string> = {
  "by-status": "Children by Status",
  detail: "Children Details",
  "by-age": "Children by Age Group",
  admissions: "Admission History",
  "status-history": "Child Status History",
};

// ─── GET /api/reports/children ───────────────────────────────
// ?type=by-status|detail|by-age|admissions|status-history&format=csv|excel|pdf
// Gated by children.view and scoped to the caller's centre.

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "children.view");

    const type = request.nextUrl.searchParams.get("type") || "by-status";
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

    if (type === "by-status") {
      const children = await getActiveChildren(admin, centreId);
      rows = childrenByStatusRows(children);
    } else if (type === "detail") {
      const children = await getActiveChildren(admin, centreId);
      rows = childrenDetailRows(children);
    } else if (type === "by-age") {
      const children = await getActiveChildren(admin, centreId);
      rows = childrenAgeGroupRows(children);
    } else if (type === "admissions") {
      rows = await admissionHistoryRows(admin, centreId);
    } else if (type === "status-history") {
      rows = await statusHistoryRows(admin, centreId);
    }

    return await respondWithExport(admin, ctx, {
      auditEntityType: "children_report_export",
      reportType: type,
      title,
      rows,
      format,
      filename: `children-${type}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
