import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import NotificationBell from "./_components/notification-bell";
import SignOutButton from "./_components/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess, type AppUserContext } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";
import { AuthError } from "@/lib/auth/app-user-context";

export const dynamic = "force-dynamic";

// Tenant (centre) pages a platform admin must be kept out of. Each admin page
// also guards itself, so this is a defence-in-depth redirect to the admin home.
const TENANT_PATHS = [
  "/children",
  "/admissions",
  "/placements",
  "/referrals",
  "/guardians",
  "/cases",
  "/safeguarding",
  "/visits",
  "/staff",
  "/health",
  "/education",
  "/resources",
  "/team",
  "/audit",
  "/centres",
];

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium whitespace-nowrap"
    >
      {children}
    </Link>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let isManager = false;
  let isPlatformAdmin = false;
  let centreName = "";
  try {
    const supabase = (await createClient()) as never;
    const ctx = await requireAppAccess(supabase, { allowInactiveSubscription: true });
    const role = await getUserRoleName(supabase, ctx as unknown as AppUserContext);
    isManager = role === "CENTRE_MANAGER";
    isPlatformAdmin = role === "PLATFORM_ADMINISTRATOR";
    centreName = ctx.centre?.name ?? "";
  } catch (err) {
    if (err instanceof AuthError && err.code === "NOT_AUTHENTICATED") {
      redirect("/login");
    }
    isManager = false;
    isPlatformAdmin = false;
  }

  // Keep the platform admin inside the /admin area. Tenant pages (children,
  // staff, etc.) render their own centre-level view and are not meant for the
  // platform administrator.
  if (isPlatformAdmin) {
    let pathname = "";
    try {
      pathname = (await headers()).get("x-current-path") ?? "";
    } catch {
      pathname = "";
    }
    const onTenantPage = TENANT_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );
    if (onTenantPage) {
      redirect("/admin");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">
                Children&apos;s Care Platform
              </h1>
              {isPlatformAdmin && (
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  PLATFORM ADMIN
                </span>
              )}
              {isManager && centreName && (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  {centreName}
                </span>
              )}
            </div>
            <nav className="flex items-center">
              {isPlatformAdmin ? (
                <>
                  <NavLink href="/admin">Overview</NavLink>
                  <NavLink href="/admin/centres">Centres</NavLink>
                  <NavLink href="/admin/users">Create Manager</NavLink>
                  <NavLink href="/admin/payments">Payments</NavLink>
                  <NavLink href="/admin/subscriptions">Subscriptions</NavLink>
                  <NavLink href="/admin/settings">Settings</NavLink>
                </>
              ) : (
                <>
                  <NavLink href="/children">Children</NavLink>
                  <NavLink href="/admissions">Admissions</NavLink>
                  <NavLink href="/placements">Placements</NavLink>
                  <NavLink href="/referrals">Referrals</NavLink>
                  <NavLink href="/guardians">Guardians</NavLink>
                  <NavLink href="/cases">Cases</NavLink>
                  <NavLink href="/safeguarding">Safeguarding</NavLink>
                  <NavLink href="/visits">Visits</NavLink>
                  <NavLink href="/staff">Staff</NavLink>
                  <NavLink href="/health">Health</NavLink>
                  <NavLink href="/education">Education</NavLink>
                  <NavLink href="/resources">Resources</NavLink>
                  {isManager && <NavLink href="/team">Team</NavLink>}
                  <NavLink href="/audit">Audit</NavLink>
                </>
              )}
              <NavLink href="/notifications">Notifications</NavLink>
              <NotificationBell />
              <SignOutButton />
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
