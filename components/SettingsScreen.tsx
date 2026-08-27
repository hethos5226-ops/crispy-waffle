"use client";

import Link from "next/link";
import { TrashIcon, ChevronRightIcon, SparkleIcon, ShieldIcon } from "@/components/icons";
import { Wiz } from "@/components/Wiz";
import { clearFavorites, clearHistory, setThemePref, useThemePref, type ThemePref } from "@/lib/storage";
import { replayOnboarding } from "@/components/Onboarding";
import { useToast } from "@/components/ToastProvider";

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mt-7 mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">{children}</div>;
}

const ROW_CLASS =
  "pressable flex w-full items-center gap-3 rounded-[18px] border border-border bg-surface p-3.5 text-left text-[14.5px] font-semibold";

export function SettingsScreen() {
  const pref = useThemePref();
  const showToast = useToast();

  return (
    <div>
      <div className="mt-4 mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">Appearance</div>
      <div className="flex gap-1 rounded-[18px] bg-surface-muted p-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setThemePref(opt.value)}
            className={`pressable flex-1 rounded-[14px] py-2.5 text-[13.5px] font-semibold ${
              pref === opt.value ? "bg-surface text-foreground" : "text-muted"
            }`}
            style={pref === opt.value ? { boxShadow: "var(--card-shadow)" } : undefined}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">System follows your phone&apos;s own light/dark setting automatically.</p>

      <SectionLabel>About BuyWise</SectionLabel>
      <div className="flex flex-col gap-2.5">
        <Link href="/settings/scoring" className={ROW_CLASS} style={{ boxShadow: "var(--card-shadow)" }}>
          <span className="text-accent">
            <SparkleIcon className="h-[18px] w-[18px]" />
          </span>
          <span>How scoring works</span>
          <ChevronRightIcon className="ml-auto h-4 w-4 text-muted" />
        </Link>
        <Link href="/settings/privacy" className={ROW_CLASS} style={{ boxShadow: "var(--card-shadow)" }}>
          <span className="text-link">
            <ShieldIcon className="h-[18px] w-[18px]" />
          </span>
          <span>Privacy</span>
          <ChevronRightIcon className="ml-auto h-4 w-4 text-muted" />
        </Link>
      </div>

      <SectionLabel>Wiz</SectionLabel>
      <button type="button" onClick={() => replayOnboarding()} className={ROW_CLASS} style={{ boxShadow: "var(--card-shadow)" }}>
        <Wiz pose="head" size={30} />
        <span>Replay the Wiz intro</span>
        <ChevronRightIcon className="ml-auto h-4 w-4 text-muted" />
      </button>

      <SectionLabel>Data</SectionLabel>
      <button
        type="button"
        onClick={() => {
          clearHistory();
          clearFavorites();
          showToast("History and favorites cleared");
        }}
        className={ROW_CLASS}
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <span className="text-dont">
          <TrashIcon className="h-4 w-4" />
        </span>
        <span>Reset history &amp; favorites</span>
        <ChevronRightIcon className="ml-auto h-4 w-4 text-muted" />
      </button>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        History and favourites live only on this device — clearing them can&apos;t be undone.
      </p>

      <p className="mt-7 text-center text-xs text-muted">
        BuyWise demo preview — all data shown is illustrative, not live.
      </p>
    </div>
  );
}
