import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { requirePermission } from "@/lib/auth/authorization.service";
import { auditCreate } from "@/lib/audit/audit.service";
import {
  listSources,
  listFunds,
  listExpenses,
  listBenefits,
  getFundDetail,
  getExpenseDetail,
  getBenefitDetail,
  getSourceDetail,
} from "@/lib/resources/resources.service";
import {
  toCsv,
  toExcelHtml,
  toMinimalPdf,
  sourceReportRows,
  fundReportRows,
  expenseReportRows,
  benefitReportRows,
  childReportRows,
  type ReportRows,
} from "@/lib/resources/reports";
import { statusFromError } from "@/lib/resources/route-helpers";

const TYPES = ["source", "fund", "expense", "benefit", "child"] as const;
const FORMATS = ["csv", "excel", "pdf"] as const;

async function buildReport(title: string, rows: ReportRows, format: string, filename: string) {
  if (format === "excel") {
    const columns = rows.length > 0
      ? Object.keys(rows[0]).map((k) => ({ key: k, label: k }))
      : [];
    return {
      body: toExcelHtml(title, columns, rows),
      contentType: "application/vnd.ms-excel",
      filename: `${filename}.xls`,
    };
  }
  if (format === "pdf") {
    const columns = rows.length > 0
      ? Object.keys(rows[0]).map((k) => ({ key: k, label: k }))
      : [];
    const pdf = toMinimalPdf(title, columns, rows);
    return {
      body: pdf,
      contentType: "application/pdf",
      filename: `${filename}.pdf`,
    };
  }
  const columns = rows.length > 0
    ? Object.keys(rows[0]).map((k) => ({ key: k, label: k }))
    : [];
  return {
    body: toCsv(columns, rows),
    contentType: "text/csv; charset=utf-8",
    filename: `${filename}.csv`,
  };
}

// ─── GET /api/resources/reports ──────────────────────────────
// Query: ?type=source|fund|expense|benefit|child&format=csv|excel|pdf
// Exports require resources.reports permission.

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const ctx = await requireAppAccess(supabase as unknown as SupabaseClient);
    await requirePermission(supabase as unknown as SupabaseClient, ctx, "resources.reports");

    const typeParam = request.nextUrl.searchParams.get("type") || "source";
    const formatParam = request.nextUrl.searchParams.get("format") || "csv";

    if (!(TYPES as readonly string[]).includes(typeParam)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
    if (!(FORMATS as readonly string[]).includes(formatParam)) {
      return NextResponse.json({ error: "Invalid report format" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const centreId = ctx.centre.id;

    let title = "Resources & Support Report";
    let result: ReportRows = [];
    let filename = "resources-support-report";

    if (typeParam === "source") {
      title = "Source Report";
      filename = "source-report";
      const sources = await listSources(adminSupabase, centreId);
      const details = [];
      for (const s of sources.data.slice(0, 200)) {
        const d = await getSourceDetail(adminSupabase, s.id, centreId);
        if (d) details.push(d);
      }
      result = sourceReportRows(
        details.map((d) => ({
          source_name: d.source_name,
          source_type: d.source_type,
          amount: d.amount,
          funds: d.funds.map((f) => ({ fund_name: f.fund_name, amount_allocated: f.amount_allocated })),
        })),
      );
    } else if (typeParam === "fund") {
      title = "Fund Report";
      filename = "fund-report";
      const funds = await listFunds(adminSupabase, centreId);
      const details = [];
      for (const f of funds.data.slice(0, 200)) {
        const d = await getFundDetail(adminSupabase, f.id, centreId);
        if (d) details.push(d);
      }
      result = fundReportRows(details);
    } else if (typeParam === "expense") {
      title = "Expense Report";
      filename = "expense-report";
      const expenses = await listExpenses(adminSupabase, centreId);
      const details = [];
      for (const e of expenses.data.slice(0, 200)) {
        const d = await getExpenseDetail(adminSupabase, e.id, centreId);
        if (d) details.push(d);
      }
      result = expenseReportRows(details);
    } else if (typeParam === "benefit") {
      title = "Benefit Report";
      filename = "benefit-report";
      const benefits = await listBenefits(adminSupabase, centreId);
      const details = [];
      for (const b of benefits.data.slice(0, 200)) {
        const d = await getBenefitDetail(adminSupabase, b.id, centreId);
        if (d) details.push(d);
      }
      result = benefitReportRows(details);
    } else {
      title = "Child Support Report";
      filename = "child-support-report";
      const { data: children, error } = await adminSupabase
        .from("children")
        .select("id, reference_number, first_name, last_name")
        .eq("centre_id", centreId)
        .limit(500);
      if (error) throw new Error(`Failed to load children: ${error.message}`);
      const details = [];
      for (const c of children ?? []) {
        const benefits = await getBenefitsForChild(adminSupabase, c.id, centreId);
        details.push({
          reference_number: c.reference_number,
          first_name: c.first_name,
          last_name: c.last_name,
          benefits,
        });
      }
      result = childReportRows(details);
    }

    const built = await buildReport(title, result, formatParam, filename);

    await auditCreate(adminSupabase, ctx, "support_report_export", ctx.centre.id, {
      report_type: typeParam,
      format: formatParam,
    });

    return new NextResponse(built.body as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": built.contentType,
        "Content-Disposition": `attachment; filename="${built.filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: statusFromError(message) });
  }
}

interface ChildWithBenefits {
  reference_number: string;
  first_name: string;
  last_name: string;
  benefits: {
    benefit_type: string;
    expense?: { description?: string; fund?: { fund_name?: string; source?: { source_name?: string } | null } | null } | null;
  }[];
}

async function getBenefitsForChild(
  admin: ReturnType<typeof createAdminClient>,
  childId: string,
  centreId: string,
): Promise<ChildWithBenefits["benefits"]> {
  const { data: links } = await admin
    .from("support_benefit_children")
    .select("benefit_id")
    .eq("child_id", childId)
    .eq("centre_id", centreId);
  const ids = (links ?? []).map((r: { benefit_id: string }) => r.benefit_id);
  const out: ChildWithBenefits["benefits"] = [];
  for (const id of ids) {
    const detail = await getBenefitDetail(admin, id, centreId);
    if (detail) {
      out.push({ benefit_type: detail.benefit_type, expense: detail.expense ?? undefined });
    }
  }
  return out;
}
