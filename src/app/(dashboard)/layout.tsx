import Link from "next/link";
import { redirect } from "next/navigation";
import NotificationBell from "./_components/notification-bell";
import SignOutButton from "./_components/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { requireAppAccess, type AppUserContext } from "@/lib/auth/app-user-context";
import { getUserRoleName } from "@/lib/auth/authorization.service";
import { AuthError } from "@/lib/auth/app-user-context";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let isManager = false;
  let isPlatformAdmin = false;
  try {
    const supabase = (await createClient()) as never;
    const ctx = await requireAppAccess(supabase, { allowInactiveSubscription: true });
    const role = await getUserRoleName(supabase, ctx as unknown as AppUserContext);
    isManager = role === "CENTRE_MANAGER";
    isPlatformAdmin = role === "PLATFORM_ADMINISTRATOR";
  } catch (err) {
    if (err instanceof AuthError && err.code === "NOT_AUTHENTICATED") {
      redirect("/login");
    }
    isManager = false;
    isPlatformAdmin = false;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              Children&apos;s Care Platform
            </h1>
            <nav className="flex space-x-4">
              <Link
                href="/centres"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Centres
              </Link>
              <Link
                href="/children"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Children
              </Link>
              <Link
                href="/health"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Health
              </Link>
              <Link
                href="/education"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Education
              </Link>
              <Link
                href="/staff"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Staff
              </Link>
              <Link
                href="/resources"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Resources
              </Link>
              <Link
                href="/audit"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Audit Trail
              </Link>
              <Link
                href="/subscription"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Subscription
              </Link>
              {isManager && (
                <Link
                  href="/subscriptions"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Subscriptions
                </Link>
              )}
              {isPlatformAdmin && (
                <Link
                  href="/admin"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Platform Admin
                </Link>
              )}
              <Link
                href="/notifications"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Notifications
              </Link>
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
