"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string };

export function NavTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
