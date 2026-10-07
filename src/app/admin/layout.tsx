import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const ctx = await requireAppAccess(supabase as never);
  const roleName = await getUserRoleName(supabase as never, ctx);

  if (roleName !== "PLATFORM_ADMINISTRATOR") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                Platform Admin
              </p>
              <h1 className="text-xl font-bold text-gray-900">Children&apos;s Care Platform</h1>
            </div>
            <nav className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <NavLink href="/admin">Overview</NavLink>
              <NavLink href="/admin/centres">Centres</NavLink>
              <NavLink href="/admin/users">Create Manager</NavLink>
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
    >
      {children}
    </Link>
  );
}
