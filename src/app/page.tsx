import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Children&apos;s Care Platform</h1>
      <p className="text-lg text-gray-600">
        Management & Accountability Platform
      </p>

      <div className="mt-10 flex items-center gap-4">
        <Link
          href="/login"
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
