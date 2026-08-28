"use client";

import Link from "next/link";
import { Wiz } from "@/components/Wiz";
import { ProductSourceError } from "@/lib/data/listing";

/** Turns a failure into something a person can act on, per failure kind. */
function describe(error: unknown): { heading: string; message: string; canRetry: boolean } {
  if (error instanceof ProductSourceError) {
    switch (error.kind) {
      case "not_configured":
        return {
          heading: "Live search isn't switched on",
          message:
            "This build isn't pointed at the product service yet, so only the demo catalog is available. Everything else works as normal.",
          canRetry: false,
        };
      case "rate_limited":
        return {
          heading: "Too many searches right now",
          message: "The daily eBay search quota is being throttled. Try again in a few minutes.",
          canRetry: true,
        };
      case "network":
        return {
          heading: "Couldn't reach the product service",
          message: "That usually means you're offline, or the service is briefly down. Check your connection and try again.",
          canRetry: true,
        };
      case "not_found":
        return {
          heading: "That listing is gone",
          message: "It was probably sold or removed from eBay since you last saw it.",
          canRetry: false,
        };
      default:
        return {
          heading: "Product search is having trouble",
          message: "eBay returned an error. This is usually temporary — try again shortly.",
          canRetry: true,
        };
    }
  }
  return {
    heading: "Something went wrong",
    message: "The search couldn't be completed. Try again in a moment.",
    canRetry: true,
  };
}

export function ApiErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { heading, message, canRetry } = describe(error);

  return (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <Wiz pose="tablet" size={104} />
      <div>
        <p className="text-[17px] font-bold">{heading}</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted">{message}</p>
      </div>
      <div className="mt-1 flex items-center gap-2.5">
        {canRetry && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="pressable rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
          >
            Try again
          </button>
        )}
        <Link
          href="/"
          className="pressable rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold"
        >
          Back to Recs
        </Link>
      </div>
    </div>
  );
}
