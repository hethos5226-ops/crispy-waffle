"use client";

import type { Listing } from "@/lib/data/listing";
import { RETAILER_LABELS } from "@/lib/data/listing";
import { CATALOG_LABELS, MATCH_LABELS, type CatalogProduct } from "@/lib/data/catalog/types";
import { useCatalogProduct } from "@/lib/data/catalog/useCatalogProduct";
import type { MissEnrichment } from "@/lib/data/catalog/lookup";
import { Disclosure } from "@/components/Disclosure";
import { BoxIcon, ShieldIcon } from "@/components/icons";

/**
 * Manufacturer product information, kept visibly separate from the offer.
 *
 * The separation is the point. Everything else on the listing page describes
 * one seller's item — its price, condition and seller. This card describes
 * the *product*, from the brand's own datasheet, and says so in its header,
 * its footnote, and in how it is matched.
 *
 * It only ever appears on an exact identifier match (barcode, or brand plus
 * part number). When a listing can't be identified the card explains that
 * instead of quietly disappearing, because "we don't know what this is" is
 * itself worth telling a buyer.
 */

/** How many spec rows to show before folding the rest away. */
const VISIBLE_SPECS = 6;

export function CatalogPanel({ listing }: { listing: Listing }) {
  const state = useCatalogProduct(listing);

  if (state.status === "idle") return null;

  if (state.status === "loading") {
    return (
      <div
        className="rounded-[22px] border border-border bg-surface p-5 sm:p-6"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <Header />
        <div className="mt-4 space-y-2" aria-busy="true" aria-label="Looking up product details">
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-surface-muted" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
    );
  }

  const { enrichment } = state;

  return (
    <div
      className="rounded-[22px] border border-border bg-surface p-5 sm:p-6"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      <Header product={enrichment.product} />
      {enrichment.status === "matched" ? (
        <Matched product={enrichment.product} listing={listing} />
      ) : (
        <Unmatched status={enrichment.status} listing={listing} />
      )}
    </div>
  );
}

function Header({ product }: { product?: CatalogProduct | null }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 className="flex items-center gap-1.5 text-[14.5px] font-bold">
        <BoxIcon className="h-4 w-4 text-muted" />
        Product details
      </h2>
      {product && (
        <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-muted">
          {CATALOG_LABELS[product.source]}
        </span>
      )}
    </div>
  );
}

function Matched({ product, listing }: { product: CatalogProduct; listing: Listing }) {
  const specCount = product.specGroups.reduce((n, g) => n + g.specs.length, 0);
  const flat = product.specGroups.flatMap((g) => g.specs.map((s) => ({ ...s, group: g.name })));
  const visible = flat.slice(0, VISIBLE_SPECS);
  const hidden = flat.slice(VISIBLE_SPECS);

  return (
    <>
      {/* The official name is shown alongside, never instead of, the seller's
          title — they are different claims by different parties. */}
      <p className="mt-3 text-[15px] font-bold leading-snug">{product.name}</p>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
        {product.brand && <span className="font-semibold text-foreground">{product.brand}</span>}
        {product.category && (
          <>
            <span className="text-border">·</span>
            <span>{product.category}</span>
          </>
        )}
        {product.releaseDate && (
          <>
            <span className="text-border">·</span>
            <span>Released {formatReleaseDate(product.releaseDate)}</span>
          </>
        )}
      </div>

      {product.summary && (
        <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-muted">{product.summary}</p>
      )}

      {specCount > 0 && (
        <dl className="mt-4 border-t border-border">
          {visible.map((spec, i) => (
            <SpecRow key={`${spec.group}-${spec.name}-${i}`} name={spec.name} value={spec.value} />
          ))}
        </dl>
      )}

      {hidden.length > 0 && (
        <Disclosure trigger={`All ${specCount} specifications`}>
          <dl className="pb-1">
            {hidden.map((spec, i) => (
              <SpecRow key={`${spec.group}-${spec.name}-${i}`} name={spec.name} value={spec.value} />
            ))}
          </dl>
        </Disclosure>
      )}

      {/* The trust boundary, stated plainly. */}
      <p className="mt-4 flex gap-2 border-t border-border pt-3.5 text-[12px] leading-relaxed text-muted">
        <ShieldIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Supplied by {CATALOG_LABELS[product.source]} from {product.brand ?? "the manufacturer"}&apos;s own
          datasheet and matched to this listing by {MATCH_LABELS[product.matchedBy]}. It describes the product
          — the price, condition and seller above come from {RETAILER_LABELS[listing.retailer]} and describe
          this specific item.
        </span>
      </p>
    </>
  );
}

function SpecRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex gap-4 border-b border-border py-2 last:border-b-0">
      <dt className="w-[42%] shrink-0 text-[12.5px] text-muted">{name}</dt>
      <dd className="min-w-0 flex-1 text-[12.5px] font-medium">{value}</dd>
    </div>
  );
}

/**
 * Every reason for having no datasheet is a different fact about the listing,
 * so each gets its own explanation rather than a shared shrug.
 */
function Unmatched({
  status,
  listing,
}: {
  status: MissEnrichment["status"];
  listing: Listing;
}) {
  const retailer = RETAILER_LABELS[listing.retailer];

  const copy: Record<typeof status, { title: string; body: string }> = {
    unidentified: {
      title: "This listing can't be identified",
      body: `The seller didn't publish a barcode or a brand and part number, so there's no way to look this up in a manufacturer's catalogue. BuyWise won't guess from the listing title — matching on wording alone would risk showing you another product's specifications.`,
    },
    not_in_catalog: {
      title: "No manufacturer datasheet found",
      body: `This listing carries a valid product identifier, but no catalogue we use covers it. That's common for unbranded and grey-market goods, where no manufacturer publishes official specifications.`,
    },
    unavailable: {
      title: "Product details couldn't be loaded",
      body: `The product catalogue didn't respond just now. This doesn't affect the ${retailer} price and seller information above, which loaded normally.`,
    },
  };

  const { title, body } = copy[status];

  return (
    <div className="mt-3 flex gap-3 rounded-2xl bg-surface-muted p-4">
      <BoxIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold">{title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}

/** Catalogue dates are ISO; show the month and year, which is all that's meaningful. */
function formatReleaseDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });
}
