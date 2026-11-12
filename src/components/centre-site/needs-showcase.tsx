"use client";

import { useMemo, useState } from "react";
import type { PublicCentreNeed } from "@/types/centre-need";
import NeedDonateForm from "@/components/centre-site/need-donate-form";

const numberFormat = new Intl.NumberFormat("en-TZ", {
  maximumFractionDigits: 2,
});

function formatTzs(value: number): string {
  return `TZS ${numberFormat.format(Number(value) || 0)}`;
}

function compactTzs(value: number): string {
  const n = Number(value) || 0;
  if (n >= 1_000_000_000) return `TZS ${(n / 1_000_000_000).toFixed(1)}bn`;
  if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `TZS ${(n / 1_000).toFixed(0)}k`;
  return formatTzs(n);
}

function HandsHeartIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 20s6.5-3.6 9-8.4c.7-1.9-.6-3.9-2.6-3.9-1.7 0-3.2 1.1-4.4 2.6C13.5 8.7 11.9 7.7 10.2 7.7c-2 0-3.3 2-2.6 3.9C9.4 16.4 12 20 12 20Z" />
      <path d="M3 12.5v2.6a3.4 3.4 0 0 0 3.4 3.4H8M3 12.5a2.2 2.2 0 0 1 2.2-2.2h2.6a2.4 2.4 0 0 1 1.7.7L11 13.4a2.4 2.4 0 0 0 1.7.7h3.2" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

function StatCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-900">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}

function TrustChip({ children }: { children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-800">
      <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true">
        <path d="M5 10.5l3.2 3.2L15 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </li>
  );
}

function ActiveNeedCard({
  need,
  index,
  centreCode,
  primaryColor,
}: {
  need: PublicCentreNeed;
  index: number;
  centreCode: string;
  primaryColor: string;
}) {
  const [open, setOpen] = useState(false);
  const percent = Math.min(100, Math.max(0, need.percent));
  const raised = Number(need.raised_amount) || 0;
  const target = Number(need.target_amount) || 0;
  const remaining = Math.max(0, target - raised);

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      {need.image_url ? (
        <div className="relative aspect-[16/9] overflow-hidden bg-stone-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={need.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Inachangwa
          </span>
        </div>
      ) : (
        <div className="relative flex aspect-[16/9] items-end overflow-hidden border-b border-stone-100 bg-gradient-to-br from-emerald-50 via-[#FBF8F3] to-stone-100 p-5">
          <HandsHeartIcon className="pointer-events-none absolute -right-4 -top-6 h-36 w-36 text-emerald-200/70" />
          <span className="relative inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Inachangwa
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Mahitaji {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-snug text-zinc-900">
            {need.title}
          </h3>
          {need.description ? (
            <p className="mt-1.5 text-sm leading-6 text-zinc-500">
              {need.description}
            </p>
          ) : null}
        </div>

        <div className="mt-auto">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">
                <span className="font-semibold text-zinc-800">{formatTzs(raised)}</span> imechangwa
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                {formatTzs(remaining)} zinahitajika
              </p>
            </div>
            <p
              className="text-2xl font-semibold tracking-tight text-zinc-900"
              aria-hidden="true"
            >
              {numberFormat.format(percent)}
              <span className="text-sm font-medium text-zinc-400">%</span>
            </p>
          </div>

          <div
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${need.title}: ${Math.round(percent)}% funded`}
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-[width] duration-700"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-400">
            Lengo: {formatTzs(target)}
          </p>

          <button
            type="button"
            aria-expanded={open}
            aria-controls={`donate-${need.id}`}
            onClick={() => setOpen((v) => !v)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            style={{ backgroundColor: primaryColor }}
          >
            {open ? "Funga fomu" : "Changia sasa"}
            <ArrowRightIcon />
          </button>

          {open ? (
            <div id={`donate-${need.id}`} className="mt-3">
              <NeedDonateForm
                centreCode={centreCode}
                needId={need.id}
                onDone={() => setOpen(false)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/**
 * Public "Centre Needs" section for /s/[code].
 *
 * Renders ONLY PublicCentreNeed fields. Donations are recorded as PENDING
 * contributions and appear after the centre accountant verifies the
 * Jina la Muamala.
 */
export default function NeedsShowcase({
  needs,
  centreCode,
  primaryColor = "#059669",
  headingFont,
}: {
  needs: PublicCentreNeed[];
  centreCode: string;
  primaryColor?: string;
  headingFont?: string | null;
}) {
  const active = useMemo(
    () => needs.filter((need) => !need.is_completed),
    [needs],
  );
  const completed = useMemo(
    () => needs.filter((need) => need.is_completed),
    [needs],
  );

  const totals = useMemo(() => {
    const target = active.reduce((sum, n) => sum + Number(n.target_amount), 0);
    const raised = active.reduce((sum, n) => sum + Number(n.raised_amount), 0);
    const remaining = Math.max(0, target - raised);
    return { target, raised, remaining };
  }, [active]);

  if (!Array.isArray(needs) || needs.length === 0) return null;

  return (
    <section
      id="needs"
      aria-labelledby="needs-heading"
      className="mt-12 scroll-mt-24"
    >
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-[#FBF8F3] shadow-sm">
        {/* ── Editorial header + impact stats ───────────────────────── */}
        <div className="grid gap-6 border-b border-stone-200/80 px-6 py-7 sm:px-8 sm:py-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Changia Sasa
            </p>
            <h2
              id="needs-heading"
              className="mt-3 text-3xl font-semibold leading-[1.15] tracking-tight text-zinc-900 sm:text-4xl"
              style={{ fontFamily: headingFont || undefined }}
            >
              Changia kile kinachohitajika
              <span className="text-emerald-600">.</span>
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-zinc-600 sm:text-[15px]">
              Kila mchango unakwenda moja kwa moja kwenye hitaji ulilochagua —
              na utaonekana hapa baada ya mhasibu wa kituo kuthibitisha Jina la
              Muamala.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              <TrustChip>Mhasibu anathibitisha kila muamala</TrustChip>
              <TrustChip>100% inaenda kwenye hitaji</TrustChip>
              <TrustChip>Maendeleo yanaonekana moja kwa moja</TrustChip>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCell
              label="Mahitaji ya sasa"
              value={String(active.length)}
              hint={completed.length > 0 ? `${completed.length} tayari yametimizwa` : undefined}
            />
            <StatCell
              label="Mkusanywa"
              value={compactTzs(totals.raised)}
              hint="imechangiwa hadi sasa"
            />
            <StatCell
              label="Zinahitajika"
              value={compactTzs(totals.remaining)}
              hint="kabla haujatimia"
            />
            <StatCell
              label="Jumla ya lengo"
              value={compactTzs(totals.target)}
              hint="mahitaji yote ya sasa"
            />
          </div>
        </div>

        {/* ── Active needs ────────────────────────────────────────────── */}
        {active.length > 0 ? (
          <div className="px-6 pb-7 pt-6 sm:px-8 sm:pb-8">
            <ul className="grid gap-6 md:grid-cols-2">
              {active.map((need, index) => (
                <ActiveNeedCard
                  key={need.id}
                  need={need}
                  index={index}
                  centreCode={centreCode}
                  primaryColor={primaryColor}
                />
              ))}
            </ul>
          </div>
        ) : null}

        {/* ── Completed ───────────────────────────────────────────────── */}
        {completed.length > 0 ? (
          <div className="border-t border-stone-200/80 bg-white/50 px-6 py-6 sm:px-8">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-900">
                Tayari yametimizwa
                <span className="ml-2 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                  {completed.length}
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Shukrani kwa wafadhili wetu
              </p>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {completed.map((need) => (
                <li
                  key={need.id}
                  className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M5 10.5l3.2 3.2L15 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800">
                      {need.title}
                    </p>
                    <p className="text-[11px] text-zinc-400">Imetimizwa kikamilifu</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
