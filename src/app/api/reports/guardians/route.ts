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
  guardianRows,
  relationshipRows,
  guardiansSummaryRows,
  guardianDetailRows,
  relationshipsRows,
  guardianRelationshipTypes,
  guardianNameMap,
  childNameMap,
} from "@/lib/reports/guardians";

const TYPES = ["summary", "guardians", "relationships"] as const;
const FORMATS: ExportFormat[] = ["csv", "excel", "pdf"];

const TITLES: Record<(typeof TYPES)[number], string> = {
  summary: "Guardians Summary",
  guardians: "Guardians Details",
  relationships: "Child-Guardian Relationships",
};

// ─── GET /api/reports/guardians ──────────────────────────────
// ?type=summary|guardians|relationships&format=csv|excel|pdf
// Gated by guardians.view and scoped to the caller's centre.

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "guardians.view");

    const type = request.nextUrl.searchParams.get("type") || "summary";
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

    if (type === "summary") {
      const guardians = await guardianRows(admin, centreId);
      rows = guardiansSummaryRows(guardians);
    } else if (type === "guardians") {
      const guardians = await guardianRows(admin, centreId);
      const relationshipTypes = await guardianRelationshipTypes(admin, centreId);
      rows = guardianDetailRows(guardians, relationshipTypes);
    } else if (type === "relationships") {
      const relationships = await relationshipRows(admin, centreId);
      const [guardians, children] = await Promise.all([
        guardianNameMap(admin, centreId),
        childNameMap(admin, centreId),
      ]);
      rows = relationshipsRows(relationships, guardians, children);
    }

    return await respondWithExport(admin, ctx, {
      auditEntityType: "guardians_report_export",
      reportType: type,
      title,
      rows,
      format,
      filename: `guardians-${type}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}
