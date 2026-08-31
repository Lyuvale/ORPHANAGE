import LoginForm from "./LoginForm";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Children&apos;s Care Platform</h1>
          <p className="mt-1 text-sm text-gray-600">
            Sign in to access the management platform
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
