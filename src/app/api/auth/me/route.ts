import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ role: null }, { status: 401 });
    }

    const { data: profile } = await client
      .from("user_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ role: null });
    }

    const admin = createAdminClient();
    const { data: userRole } = await admin
      .from("user_roles")
      .select("role:roles(name)")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const roleName = (userRole as { role: { name: string } | null } | null)?.role?.name ?? null;
    return NextResponse.json({ role: roleName });
  } catch {
    return NextResponse.json({ role: null });
  }
}
