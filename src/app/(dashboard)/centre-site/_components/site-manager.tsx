"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SitePage, SiteTheme } from "@/types/centre-site";
import ThemePanel from "@/app/(dashboard)/centre-site/_components/theme-panel";
import PagesPanel from "@/app/(dashboard)/centre-site/_components/pages-panel";
import NeedsPanel from "@/app/(dashboard)/centre-site/_components/needs-panel";
import VerificationPanel from "@/app/(dashboard)/centre-site/_components/verification-panel";

type Tab = "pages" | "appearance" | "needs" | "verification";

export default function SiteManager({
  initialTheme,
  initialPages,
  centreCode,
  centreName,
  publicBaseUrl,
  canManagePages,
  canManageTheme,
  canViewNeeds,
  canManageNeeds,
  canVerifyNeeds,
  roleLabel,
}: {
  initialTheme: SiteTheme;
  initialPages: SitePage[];
  centreCode: string;
  centreName: string;
  publicBaseUrl: string;
  canManagePages: boolean;
  canManageTheme: boolean;
  canViewNeeds: boolean;
  canManageNeeds: boolean;
  canVerifyNeeds: boolean;
  roleLabel: string;
}) {
  const [tab, setTab] = useState<Tab>("pages");

  const siteUrl = useMemo(() => `${publicBaseUrl}/s/${centreCode}`, [publicBaseUrl, centreCode]);
  const siteName = initialTheme.site_name || centreName;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centre Website</h1>
          <p className="text-sm text-gray-500 mt-1">
            {siteName} — {roleLabel}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Build your centre&apos;s own public pages and appearance.
          </p>
        </div>
        <Link
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          View public site ↗
        </Link>
      </div>

      <div className="mt-6 border-b border-gray-200">
        <nav className="flex gap-4 -mb-px">
          <button
            type="button"
            onClick={() => setTab("pages")}
            className={`px-1 py-2 text-sm font-medium border-b-2 ${
              tab === "pages"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Pages
          </button>
          <button
            type="button"
            onClick={() => setTab("appearance")}
            className={`px-1 py-2 text-sm font-medium border-b-2 ${
              tab === "appearance"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Appearance
          </button>
          {(canViewNeeds || canManageNeeds) && (
            <button
              type="button"
              onClick={() => setTab("needs")}
              className={`px-1 py-2 text-sm font-medium border-b-2 ${
                tab === "needs"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Needs
            </button>
          )}
          {canVerifyNeeds && (
            <button
              type="button"
              onClick={() => setTab("verification")}
              className={`px-1 py-2 text-sm font-medium border-b-2 ${
                tab === "verification"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Verification
            </button>
          )}
        </nav>
      </div>

      {tab === "pages" ? (
        <PagesPanel
          initialPages={initialPages}
          canManage={canManagePages}
          siteUrl={siteUrl}
        />
      ) : tab === "appearance" ? (
        <ThemePanel initialTheme={initialTheme} canManage={canManageTheme} />
      ) : tab === "verification" ? (
        <VerificationPanel />
      ) : (
        <NeedsPanel
          canManage={canManageNeeds}
          centreCode={centreCode}
          publicBaseUrl={publicBaseUrl}
        />
      )}
    </div>
  );
}