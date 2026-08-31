import Link from "next/link";

export const metadata = {
  title: "Accounts are provisioned",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Account provisioned</h1>
          <p className="mt-1 text-sm text-gray-600">
            New accounts are created by a platform administrator or your centre
            manager — self-registration is not available.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-700">
            If you need an account, please contact the platform administrator or
            your centre&apos;s manager so they can create one for you.
          </p>
          <p className="mt-4 text-sm text-center">
            <Link href="/login" className="text-blue-600 hover:text-blue-800">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
