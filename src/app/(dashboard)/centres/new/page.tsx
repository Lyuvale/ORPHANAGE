import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";

// Centre creation is a platform-only operation (/admin/centres/new).
// A centre user reaching this page is sent back to their own centre.
export default async function NewCentrePage() {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never);
  redirect(`/centres/${ctx.centre.id}`);
}
