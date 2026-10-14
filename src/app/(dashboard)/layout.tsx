import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Sidebar from "./_components/sidebar";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess, type AppUserContext } from "@/lib/auth/app-user-context";
import { getUserPermissions, getUserRoleName } from "@/lib/auth/authorization.service";
import { AuthError } from "@/lib/auth/app-user-context";

export const dynamic = "force-dynamic";

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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let isManager = false;
  let isPlatformAdmin = false;
  let canRegister = false;
  let centreName = "";
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

  const navItems = isPlatformAdmin
    ? [
        { href: "/admin", label: "Overview", icon: "dashboard" },
        { href: "/admin/centres", label: "Centres", icon: "children" },
        { href: "/admin/users", label: "Create Manager", icon: "team" },
        { href: "/admin/payments", label: "Payments", icon: "subscriptions" },
        { href: "/admin/subscriptions", label: "Subscriptions", icon: "subscriptions" },
        { href: "/admin/settings", label: "Settings", icon: "audit" },
        { href: "/notifications", label: "Notifications", icon: "notifications" },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
        ...(perms.has("children.view")
          ? [{ href: "/children", label: "Children", icon: "children" }]
          : []),
        ...(canRegister
          ? [{ href: "/register", label: "Register", icon: "register" }]
          : []),
        ...(perms.has("cases.view")
          ? [{ href: "/cases", label: "Cases", icon: "cases" }]
          : []),
        ...(perms.has("safeguarding.view")
          ? [{ href: "/safeguarding", label: "Safeguarding", icon: "safeguarding" }]
          : []),
        ...(perms.has("visits.view")
          ? [{ href: "/visits", label: "Visits", icon: "visits" }]
          : []),
        ...(perms.has("staff.view")
          ? [{ href: "/team", label: "Team", icon: "team" }]
          : []),
        ...(perms.has("health.view")
          ? [{ href: "/health", label: "Health", icon: "health" }]
          : []),
        ...(perms.has("education_development.view")
          ? [{ href: "/education", label: "Education", icon: "education" }]
          : []),
        ...(perms.has("resources.view")
          ? [{ href: "/resources", label: "Resources", icon: "resources" }]
          : []),
        ...(perms.has("site.view")
          ? [{ href: "/centre-site", label: "Website", icon: "website" }]
          : []),
        ...(isManager
          ? [{ href: "/subscriptions", label: "Subscriptions", icon: "subscriptions" }]
          : []),
        ...(perms.has("audit.view")
          ? [{ href: "/audit", label: "Audit", icon: "audit" }]
          : []),
        { href: "/notifications", label: "Notifications", icon: "notifications" },
      ];

  return (
    <Sidebar
      navItems={navItems}
      centreName={centreName}
      isPlatformAdmin={isPlatformAdmin}
      isManager={isManager}
    >
      {children}
    </Sidebar>
  );
}
