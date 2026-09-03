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
      .select("role:roles(id, name)")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const role = (userRole as { role: { id: string; name: string } | null } | null)?.role ?? null;

    // Own permission strings for client-side visibility decisions (e.g. show
    // Approve/Reject only to approvers). Every action endpoint enforces the
    // same permission again, so this reveals nothing privileged.
    let permissions: string[] = [];
    if (role) {
      const { data: rpRows } = await admin
        .from("role_permissions")
        .select("permission:permissions(module, action)")
        .eq("role_id", role.id);
      permissions = ((rpRows ?? []) as unknown as { permission: { module: string; action: string } | null }[])
        .map((row) => row.permission)
        .filter((p): p is { module: string; action: string } => !!p)
        .map((p) => `${p.module}.${p.action}`);
    }
    return NextResponse.json({ role: role?.name ?? null, permissions });
  } catch {
    return NextResponse.json({ role: null });
  }
}
