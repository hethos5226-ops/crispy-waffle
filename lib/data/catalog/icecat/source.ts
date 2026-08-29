import {
  CatalogSourceError,
  type CatalogProduct,
  type ProductCatalog,
  type ProductRef,
} from "@/lib/data/catalog/types";
import type { IcecatResponse } from "@/lib/data/catalog/icecat/types";
import { mapIcecatProduct } from "@/lib/data/catalog/icecat/map";

/**
 * Open Icecat, reached through the BuyWise proxy Worker.
 *
 * Same arrangement as the eBay source and for the same reasons: the Icecat
 * username never reaches the browser, and the static export has no server of
 * its own. This module knows only a public URL.
 *
 * Open Icecat covers brands that sponsor their own content — most major
 * consumer-electronics manufacturers do. Anything outside that set simply
 * returns no datasheet, which is a legitimate answer and not an error.
 */

const API_BASE = process.env.NEXT_PUBLIC_BUYWISE_API_URL ?? "";

export function isIcecatConfigured(): boolean {
  return API_BASE.length > 0;
}

export class IcecatCatalog implements ProductCatalog {
  readonly id = "icecat" as const;

  isConfigured(): boolean {
    return isIcecatConfigured();
  }

  async lookup(ref: ProductRef, opts: { signal?: AbortSignal } = {}): Promise<CatalogProduct | null> {
    if (!API_BASE) {
      throw new CatalogSourceError(
        "Product catalogue data isn't configured for this deployment.",
        "not_configured"
      );
    }

    const params = new URLSearchParams();
    if (ref.kind === "gtin") {
      params.set("gtin", ref.gtin);
    } else {
      params.set("brand", ref.brand);
      params.set("mpn", ref.mpn);
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE.replace(/\/$/, "")}/catalog?${params}`, {
        signal: opts.signal,
        headers: { accept: "application/json" },
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
      throw new CatalogSourceError("Couldn't reach the product catalogue.", "network");
    }

    // No datasheet for this identifier. Expected, and not a failure: most
    // eBay listings are not products any catalogue knows about.
    if (response.status === 404) return null;

    if (response.status === 429) {
      throw new CatalogSourceError("Product catalogue rate limit reached.", "rate_limited", 429);
    }
    if (!response.ok) {
      throw new CatalogSourceError(
        "The product catalogue returned an error.",
        "upstream",
        response.status
      );
    }

    let body: IcecatResponse;
    try {
      body = (await response.json()) as IcecatResponse;
    } catch {
      throw new CatalogSourceError("The product catalogue returned an unreadable response.", "upstream");
    }

    return mapIcecatProduct(body, ref.kind);
  }
}

export const icecatCatalog = new IcecatCatalog();
