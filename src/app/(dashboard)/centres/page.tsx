import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";

// Tenant isolation: a centre user may only ever see their OWN centre.
// Listing all centres is a platform operation (/admin/centres).
export default async function CentresPage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never);
  redirect(`/centres/${ctx.centre.id}`);
}
