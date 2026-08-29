"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/resources", label: "Overview" },
  { href: "/resources/sources", label: "Sources" },
  { href: "/resources/funds", label: "Funds" },
  { href: "/resources/expenses", label: "Expenses" },
  { href: "/resources/benefits", label: "Benefits" },
];

export default function ResourcesNav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/resources") {
      return pathname === "/resources" || pathname === "/resources/reports";
    }
    return pathname.startsWith(href);
  }

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3" aria-label="Resources and support">
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
