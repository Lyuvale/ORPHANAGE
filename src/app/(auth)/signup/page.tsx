import Link from "next/link";
import SignupForm, { type SignupCentreOption } from "./SignupForm";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Create account",
};

export default async function SignupPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("centres")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  const centres: SignupCentreOption[] = (data ?? []).map(
    (c: { id: string; name: string }) => ({ id: c.id, name: c.name }),
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="mt-1 text-sm text-gray-600">
            Join a children&apos;s care centre on the platform
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {centres.length === 0 ? (
            <div>
              <p className="text-sm text-gray-700">
                There are no active centres available to join yet. Please contact
                the platform administrator.
              </p>
              <p className="mt-4 text-sm text-center">
                <Link href="/login" className="text-blue-600 hover:text-blue-800">
                  Back to sign in
                </Link>
              </p>
            </div>
          ) : (
            <SignupForm centres={centres} />
          )}
        </div>
      </div>
    </main>
  );
}
