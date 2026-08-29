import type { ProductSource } from "@/lib/data/listing";
import type { ProductCatalog } from "@/lib/data/catalog/types";
import { ebaySource } from "@/lib/data/ebay/source";
import { icecatCatalog } from "@/lib/data/catalog/icecat/source";

/**
 * Which sources BuyWise runs on, for a given country.
 *
 * A market bundles the two seams together with the formatting rules that go
 * with them, so the rest of the app never has to know that Australian prices
 * come from eBay AU while a future US build would draw offers from Best Buy
 * as well.
 *
 * Australia is the production market and the only one currently selectable.
 * The United States is defined but deliberately left out of `MARKETS` until
 * there is a Best Buy implementation to put in it: shipping a US market whose
 * catalogue and offers were still just eBay would be a worse experience
 * pretending to be a better one.
 *
 * Adding it later is two lines here plus one `ProductCatalog` / `ProductSource`
 * implementation. Nothing in the UI or the scoring engine changes.
 */

export type MarketId = "AU" | "US";

export interface Market {
  id: MarketId;
  label: string;
  /** Marketplace id the eBay Browse API expects. */
  ebayMarketplace: string;
  /** ISO 4217 code prices are expected in. Listings still carry their own. */
  currency: string;
  /** BCP 47 tag used for money and date formatting. */
  locale: string;
  /** Where real prices and availability come from. */
  offerSources: ProductSource[];
  /** Where official product descriptions come from. Never a price source. */
  catalogSources: ProductCatalog[];
}

export const AU_MARKET: Market = {
  id: "AU",
  label: "Australia",
  ebayMarketplace: "EBAY_AU",
  currency: "AUD",
  locale: "en-AU",
  offerSources: [ebaySource],
  catalogSources: [icecatCatalog],
};

/**
 * Not yet selectable. Kept here so the shape of a second market is explicit
 * and so adding Best Buy is an edit rather than a design exercise:
 *
 *   offerSources:   [bestBuySource, ebaySource]
 *   catalogSources: [bestBuyCatalog, icecatCatalog]
 *
 * Best Buy is listed first in both because it supplies canonical products and
 * genuine customer review text, which is exactly what eBay cannot.
 */
export const US_MARKET_DRAFT: Omit<Market, "offerSources" | "catalogSources"> = {
  id: "US",
  label: "United States",
  ebayMarketplace: "EBAY_US",
  currency: "USD",
  locale: "en-US",
};

/** Markets this build can actually run. */
export const MARKETS: Record<"AU", Market> = { AU: AU_MARKET };

export const DEFAULT_MARKET: Market = AU_MARKET;

/**
 * The market this deployment runs on.
 *
 * Reads an env override so a future US build is a build-time flag rather than
 * a code change, but falls back to Australia for anything unrecognised —
 * silently running the wrong market would mislabel every price on screen.
 */
export function getActiveMarket(): Market {
  const configured = process.env.NEXT_PUBLIC_BUYWISE_MARKET;
  if (configured && configured in MARKETS) {
    return MARKETS[configured as keyof typeof MARKETS];
  }
  return DEFAULT_MARKET;
}
