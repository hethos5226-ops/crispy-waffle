import {
  ProductSourceError,
  type Listing,
  type ListingSearchResult,
  type ProductSource,
  type SourceRequestOptions,
} from "@/lib/data/listing";
import type { EbayItem, EbaySearchResponse } from "@/lib/data/ebay/types";
import { mapEbayItem, toEbayItemId } from "@/lib/data/ebay/map";

/**
 * Talks to the BuyWise proxy Worker, never to eBay directly.
 *
 * eBay credentials live only inside that Worker. This module knows nothing
 * but a public URL, so it is safe to run in the browser — which it must,
 * since the app deploys as a static export with no server of its own.
 */

/** Public endpoint of the proxy. Not a secret: it is the URL the app calls. */
const API_BASE = process.env.NEXT_PUBLIC_BUYWISE_API_URL ?? "";

export function isEbayConfigured(): boolean {
  return API_BASE.length > 0;
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  if (!API_BASE) {
    throw new ProductSourceError(
      "Live product search isn't configured for this deployment.",
      "not_configured"
    );
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE.replace(/\/$/, "")}${path}`, {
      signal,
      headers: { accept: "application/json" },
    });
  } catch (cause) {
    // An aborted request is the caller changing their mind, not a failure.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ProductSourceError("Couldn't reach the product service.", "network");
  }

  if (response.status === 404) {
    throw new ProductSourceError("That listing is no longer available.", "not_found", 404);
  }
  if (response.status === 429) {
    throw new ProductSourceError(
      "Too many searches right now — the daily eBay quota is being rate limited.",
      "rate_limited",
      429
    );
  }
  if (!response.ok) {
    throw new ProductSourceError("The product service returned an error.", "upstream", response.status);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ProductSourceError("The product service returned an unreadable response.", "upstream");
  }
}

export class EbayProductSource implements ProductSource {
  readonly id = "ebay" as const;

  async search(
    query: string,
    opts: SourceRequestOptions & { limit?: number; sort?: string; offset?: number } = {}
  ): Promise<ListingSearchResult> {
    const params = new URLSearchParams({ q: query });
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.sort) params.set("sort", opts.sort);
    if (opts.offset) params.set("offset", String(opts.offset));
    if (opts.marketplace) params.set("marketplace", opts.marketplace);

    const data = await request<EbaySearchResponse>(`/search?${params}`, opts.signal);
    const listings = (data.itemSummaries ?? [])
      .map(mapEbayItem)
      .filter((l): l is Listing => l !== null);

    return { query, listings, total: data.total ?? null };
  }

  async getById(id: string, opts: SourceRequestOptions = {}): Promise<Listing | null> {
    const query = opts.marketplace ? `?marketplace=${encodeURIComponent(opts.marketplace)}` : "";
    const data = await request<EbayItem>(
      `/item/${encodeURIComponent(toEbayItemId(id))}${query}`,
      opts.signal
    );
    return mapEbayItem(data);
  }
}

export const ebaySource = new EbayProductSource();
