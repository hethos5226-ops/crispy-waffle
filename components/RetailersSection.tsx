"use client";

import type { Product } from "@/lib/types";
import { ExternalLinkIcon, StoreIcon } from "@/components/icons";
import { buildRetailers } from "@/lib/retailers";
import { useToast } from "@/components/ToastProvider";

export function RetailersSection({ product }: { product: Product }) {
  const listings = buildRetailers(product);
  const showToast = useToast();
  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: product.price.currency, maximumFractionDigits: 0 }).format(v);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6" style={{ boxShadow: "var(--card-shadow)" }}>
      <h2 className="flex items-center gap-1.5 text-[14.5px] font-bold">
        <StoreIcon className="h-4 w-4 text-muted" />
        Where to buy
      </h2>
      <div className="mt-1">
        {listings.map((listing, i) => (
          <div key={listing.name} className="flex items-center justify-between gap-2.5 border-t border-border py-2.5 first:border-t-0 first:pt-1">
            <button
              type="button"
              onClick={() => showToast("Retailer links aren't available yet")}
              className="flex items-center gap-1.5 text-left text-sm font-semibold text-link transition-opacity hover:underline active:opacity-70"
            >
              {listing.name}
              <ExternalLinkIcon className="h-3 w-3 shrink-0 opacity-80" />
              {i === 0 && (
                <span className="ml-1 rounded-full bg-buy-soft px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-buy">
                  Best price
                </span>
              )}
            </button>
            <span className="shrink-0 text-[14.5px] font-bold tabular-nums">{fmt(listing.price)}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] text-muted">
        Illustrative demo retailers with fictitious names, not real listings — this is where live marketplace links will
        surface later.
      </p>
    </div>
  );
}
