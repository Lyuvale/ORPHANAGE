import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicSite } from "@/lib/centre-site/centre-site.service";

/**
 * GET /api/public/sites/[code]
 *
 * PUBLIC endpoint: returns the centre's published site (theme + pages).
 * No authentication required — used by the public centre website
 * and external consumers.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const admin = createAdminClient();
    const site = await getPublicSite(admin, code);

    if (!site) {
      return NextResponse.json({ error: "Centre not found" }, { status: 404 });
    }

    return NextResponse.json({ data: site });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}