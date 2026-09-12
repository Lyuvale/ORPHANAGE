import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import NotificationBell from "./_components/notification-bell";
import SignOutButton from "./_components/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess, type AppUserContext } from "@/lib/auth/app-user-context";
import { getUserPermissions, getUserRoleName } from "@/lib/auth/authorization.service";
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
  "/register",
  "/dashboard",
  "/centre-site",
];

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-gray-600 hover:text-gray-900 px-2 py-2 text-[13px] font-medium whitespace-nowrap shrink-0"
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
  let canRegister = false;
  let centreName = "";
  // The user's own DB permissions, fetched once. Every centre menu entry is
  // shown only when the matching permission is held, so each role sees only
  // the modules it may use (spec: role-based menu).
  let perms = new Set<string>();
  try {
    const supabase = (await createClient()) as never;
    const ctx = await requireAppAccess(supabase, { allowInactiveSubscription: true });
    const role = await getUserRoleName(supabase, ctx as unknown as AppUserContext);
    isManager = role === "CENTRE_MANAGER";
    isPlatformAdmin = role === "PLATFORM_ADMINISTRATOR";
    try {
      const list = await getUserPermissions(
        supabase as never,
        ctx as unknown as AppUserContext,
      );
      perms = new Set(list);
    } catch {
      perms = new Set<string>();
    }
    // Intake creation permission in any of the five registration modules.
    canRegister =
      perms.has("referrals.create") ||
      perms.has("children.create") ||
      perms.has("guardians.create") ||
      perms.has("admissions.create") ||
      perms.has("placements.create");
    centreName = ctx.centre?.name ?? "";
  } catch (err) {
    if (err instanceof AuthError && err.code === "NOT_AUTHENTICATED") {
      redirect("/login");
    }
    isManager = false;
    isPlatformAdmin = false;
    canRegister = false;
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
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                Children&apos;s Care Platform
              </h1>
              {isPlatformAdmin && (
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 shrink-0">
                  PLATFORM ADMIN
                </span>
              )}
              {isManager && centreName && (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 shrink-0 truncate max-w-48">
                  {centreName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <NotificationBell />
              <SignOutButton />
            </div>
          </div>
          <nav className="flex items-center gap-0.5 overflow-x-auto pb-1 -mb-px">
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
                  <NavLink href="/dashboard">Dashboard</NavLink>
                  {perms.has("children.view") && <NavLink href="/children">Children</NavLink>}
                  {canRegister && <NavLink href="/register">Register</NavLink>}
                  {perms.has("cases.view") && <NavLink href="/cases">Cases</NavLink>}
                  {perms.has("safeguarding.view") && (
                    <NavLink href="/safeguarding">Safeguarding</NavLink>
                  )}
                  {perms.has("visits.view") && <NavLink href="/visits">Visits</NavLink>}
                  {perms.has("staff.view") && <NavLink href="/team">Team</NavLink>}
                  {perms.has("health.view") && <NavLink href="/health">Health</NavLink>}
                  {perms.has("education_development.view") && (
                    <NavLink href="/education">Education</NavLink>
                  )}
                  {perms.has("resources.view") && <NavLink href="/resources">Resources</NavLink>}
                  {perms.has("site.view") && <NavLink href="/centre-site">Website</NavLink>}
                  {isManager && <NavLink href="/subscriptions">Subscriptions</NavLink>}
                  {perms.has("audit.view") && <NavLink href="/audit">Audit</NavLink>}
                </>
              )}
              <NavLink href="/notifications">Notifications</NavLink>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
