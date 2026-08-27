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

/**
 * Floating, fully-rounded bar rather than a full-width square one — the
 * translucent blur reads as a layer above the content instead of a border.
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-[calc(10px+env(safe-area-inset-bottom))]">
      <div
        className="pointer-events-auto flex w-full max-w-md items-stretch justify-around gap-1 rounded-[26px] border border-border/70 p-1.5"
        style={{
          backgroundColor: "color-mix(in srgb, var(--surface) 78%, transparent)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "0 8px 32px -8px rgba(0,0,0,0.22), 0 1px 2px rgba(0,0,0,0.06)",
        }}
      >
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`pressable relative flex flex-1 flex-col items-center gap-[3px] rounded-[20px] px-1 py-2 text-[10px] font-semibold ${
                active ? "text-accent" : "text-muted"
              }`}
              style={
                active
                  ? { backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)" }
                  : undefined
              }
            >
              <Icon className={`h-[22px] w-[22px] transition-transform duration-300 ${active ? "-translate-y-px scale-105" : ""}`} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
