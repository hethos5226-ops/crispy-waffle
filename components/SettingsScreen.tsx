"use client";

import { TrashIcon, ChevronRightIcon } from "@/components/icons";
import { Wiz } from "@/components/Wiz";
import { clearFavorites, clearHistory, setThemePref, useThemePref, type ThemePref } from "@/lib/storage";
import { replayOnboarding } from "@/components/Onboarding";
import { useToast } from "@/components/ToastProvider";

const OPTIONS: { value: ThemePref; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function SettingsScreen() {
  const pref = useThemePref();
  const showToast = useToast();

  return (
    <div>
      <div className="mt-4 mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">Appearance</div>
      <div className="flex gap-1 rounded-[14px] bg-surface-muted p-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setThemePref(opt.value)}
            className={`flex-1 rounded-[10px] py-2.5 text-[13.5px] font-semibold transition-colors active:scale-95 ${
              pref === opt.value ? "bg-surface text-foreground" : "text-muted"
            }`}
            style={pref === opt.value ? { boxShadow: "var(--card-shadow)" } : undefined}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">System follows your phone&apos;s own light/dark setting automatically.</p>

      <div className="mt-7 mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">Wiz</div>
      <button
        type="button"
        onClick={() => replayOnboarding()}
        className="mb-2.5 flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left text-[14.5px] font-semibold transition-transform active:scale-[0.98]"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <Wiz expression="excited" size={30} />
        <span>Replay the Wiz intro</span>
        <ChevronRightIcon className="ml-auto h-4 w-4 text-muted" />
      </button>

      <div className="mt-7 mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">Data</div>
      <button
        type="button"
        onClick={() => {
          clearHistory();
          clearFavorites();
          showToast("History and favorites cleared");
        }}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left text-[14.5px] font-semibold transition-transform active:scale-[0.98]"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <span className="text-dont">
          <TrashIcon className="h-4 w-4" />
        </span>
        <span>Reset history &amp; favorites</span>
        <ChevronRightIcon className="ml-auto h-4 w-4 text-muted" />
      </button>

      <p className="mt-7 text-xs text-muted">BuyWise demo preview — all data shown is illustrative, not live.</p>
    </div>
  );
}
