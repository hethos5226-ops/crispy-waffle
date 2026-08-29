"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ScanIcon } from "@/components/icons";
import { Wiz } from "@/components/Wiz";
import { ebaySource } from "@/lib/data/ebay/source";
import { ProductSourceError } from "@/lib/data/listing";

/** Rotated so repeated taps don't always land on the same listing. */
const SAMPLE_QUERIES = [
  "wireless headphones",
  "4k smart tv",
  "smartphone unlocked",
  "laptop",
  "computer monitor",
];

export function ScanScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  async function simulateScan() {
    setBusy(true);
    setError(null);
    try {
      const query = SAMPLE_QUERIES[attempt % SAMPLE_QUERIES.length];
      setAttempt((n) => n + 1);
      const result = await ebaySource.search(query, { limit: 5 });
      if (result.listings.length === 0) {
        setError("eBay returned no listings for that sample search. Try again.");
        return;
      }
      const pick = result.listings[Math.floor(Math.random() * result.listings.length)];
      router.push(`/listing/?id=${encodeURIComponent(pick.id)}`);
    } catch (e) {
      setError(
        e instanceof ProductSourceError && e.kind === "not_configured"
          ? "Live product search isn't connected in this build."
          : "Couldn't reach eBay just now. Check your connection and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 px-6 pb-4 pt-10 text-center">
      <div className="relative flex h-[220px] w-[220px] items-center justify-center rounded-[28px] border-2 border-dashed border-border text-muted">
        <span className="pointer-events-none absolute left-0 top-0 h-9 w-9 rounded-tl-2xl border-l-4 border-t-4 border-accent" />
        <span className="pointer-events-none absolute bottom-0 right-0 h-9 w-9 rounded-br-2xl border-b-4 border-r-4 border-accent" />
        <span className="scan-line pointer-events-none absolute left-[12%] right-[12%] h-0.5 rounded-full bg-accent opacity-85" />
        <ScanIcon className="h-9 w-9" />
      </div>

      <div className="flex items-center gap-3">
        <Wiz pose="magnify" size={76} className="shrink-0" />
        <div className="text-left">
          <p className="text-[15px] font-bold">Point your camera at a barcode</p>
          <p className="mt-1 max-w-[240px] text-[13.5px] text-muted">
            Scanning opens your camera and reads a product&apos;s barcode. Tap below to pull a real eBay listing instead.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={simulateScan}
        disabled={busy}
        className="pressable rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
      >
        {busy ? "Finding a listing…" : "Try a sample listing"}
      </button>

      {error && <p className="max-w-xs text-[13px] text-dont">{error}</p>}
    </div>
  );
}
