"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HistoryIcon, OverviewIcon, ScanIcon, SearchIcon, SettingsIcon } from "@/components/icons";

const TABS = [
  { href: "/", label: "Recs", icon: SearchIcon, match: (p: string) => p === "/" },
  { href: "/history", label: "History", icon: HistoryIcon, match: (p: string) => p.startsWith("/history") },
  { href: "/scan", label: "Scan", icon: ScanIcon, match: (p: string) => p.startsWith("/scan") },
  { href: "/overview", label: "Overview", icon: OverviewIcon, match: (p: string) => p.startsWith("/overview") },
  { href: "/settings", label: "Settings", icon: SettingsIcon, match: (p: string) => p.startsWith("/settings") },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-border px-1 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2"
      style={{ backgroundColor: "color-mix(in srgb, var(--surface) 90%, transparent)", backdropFilter: "blur(16px)" }}
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex max-w-[84px] flex-1 flex-col items-center gap-[3px] rounded-xl px-2.5 py-1.5 text-[10.5px] font-semibold transition-colors active:scale-95 ${
              active ? "text-accent" : "text-muted"
            }`}
          >
            <Icon className={`h-5 w-5 transition-transform ${active ? "-translate-y-px" : ""}`} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
