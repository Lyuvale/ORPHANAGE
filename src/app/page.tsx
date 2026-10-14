import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6">
      <div className="max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-care-600 text-white shadow-lg shadow-care-600/25">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66" />
            <path d="m18 15-2-2" />
            <path d="m15 18-2-2" />
          </svg>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Children&apos;s Care Platform
        </h1>
        <p className="mt-4 text-lg text-slate-500">
          Management & Accountability Platform
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Huduma za kila siku, afya, elimu, ulinzi na michango — yote katika nafasi moja salama.
        </p>

        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-care-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-care-600/25 transition-all hover:bg-care-700 hover:shadow-xl hover:shadow-care-600/30"
          >
            Sign in
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}
