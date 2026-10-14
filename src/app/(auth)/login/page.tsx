import LoginForm from "./LoginForm";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen bg-slate-50">
      {/* ── Brand panel (left) ─────────────────────────────── */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-care-700 via-care-800 to-care-950 p-12 text-white lg:flex">
        {/* Texture: soft light rays */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-hope-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-care-400/10 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <svg className="h-5 w-5 text-hope-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66" /><path d="m18 15-2-2" /><path d="m15 18-2-2" /></svg>
          </div>
          <span className="font-display text-base font-bold tracking-wide">
            Children&apos;s Care Platform
          </span>
        </div>

        <div className="relative max-w-md space-y-6">
          <p className="font-display text-5xl leading-tight font-extrabold tracking-tight">
            Care that is{" "}
            <span className="bg-gradient-to-r from-hope-300 to-hope-400 bg-clip-text text-transparent">
              seen and accountable
            </span>
          </p>
          <p className="text-base leading-relaxed text-care-100/90">
            Timu ya uongozi wa kituo, huduma za kila siku, afya, elimu,
            ulinzi na michango — yote katika nafasi moja salama kwa ajili ya
            watoto walio moyoni mwetu.
          </p>
          <ul className="space-y-3 text-sm">
            {[
              "Mazingira salama ya taarifa kwa kila kituo",
              "Uwajibikaji kupitia audit trail ya kila hatua",
              "Michango ya wazi yenye lengo maalum na uthibitisho",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-hope-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                <span className="text-care-100/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-care-100/60">
          © {new Date().getFullYear()} Children&apos;s Care Platform
        </p>
      </section>

      {/* ── Form panel (right) ───────────────────────────────── */}
      <section className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Karibu tena
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Ingia kutumia taarifa zako za akaunti ya kituo chako.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
