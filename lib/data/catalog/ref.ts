import type { Listing } from "@/lib/data/listing";
import type { ProductRef } from "@/lib/data/catalog/types";

/**
 * Turns a listing into the identifiers a catalogue may be searched by —
 * and refuses to produce anything else.
 *
 * This is the single enforcement point for BuyWise's hardest rule about
 * catalogue data: a product is matched by GTIN, or by brand *and* MPN, or
 * not at all. No title similarity, no brand-only guesses, no "close enough".
 *
 * The reason is not fussiness. A product catalogue returns a manufacturer's
 * official datasheet. Attaching one to the wrong listing produces something
 * far worse than missing data: confident, branded, entirely wrong
 * specifications that a user has every reason to believe. A missing datasheet
 * costs a little richness; a mismatched one costs the product's credibility.
 *
 * eBay makes this harder than it sounds, because brand and MPN are
 * seller-typed free text. A large share of listings carry "Unbranded",
 * "Does not apply", or the entire product title pasted into the MPN box.
 * Those are not identifiers, and treating them as such would send junk to
 * the catalogue and occasionally get a confident wrong answer back.
 */

/**
 * Values sellers type when a form demands a field they don't have. None of
 * these identify anything, and several will happily match *something* in a
 * catalogue if passed through.
 */
const NON_IDENTIFIERS = new Set([
  "n/a",
  "na",
  "n.a.",
  "none",
  "no",
  "nil",
  "null",
  "unknown",
  "unbranded",
  "unbranded/generic",
  "generic",
  "nobrand",
  "no brand",
  "noname",
  "no name",
  "oem",
  "aftermarket",
  "does not apply",
  "doesnotapply",
  "does not apply.",
  "not applicable",
  "notapplicable",
  "-",
  "--",
  "0",
  "00",
  ".",
  "n/a.",
  "custom",
  "handmade",
  "universal",
]);

function clean(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (NON_IDENTIFIERS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

/** A brand has to be a name, not a paragraph or a placeholder. */
export function usableBrand(raw: string | null): string | null {
  const brand = clean(raw);
  if (!brand) return null;
  if (brand.length > 40) return null;
  // Needs at least one letter — "123" is not a brand.
  if (!/[a-z]/i.test(brand)) return null;
  return brand;
}

/**
 * A part number has to look like one. Sellers routinely paste the whole
 * listing title into this field, which is why length and word count are
 * checked as well as the placeholder list.
 */
export function usableMpn(raw: string | null, brand: string | null): string | null {
  const mpn = clean(raw);
  if (!mpn) return null;
  // Real part codes are short. Anything this long is a description.
  if (mpn.length > 40 || mpn.length < 2) return null;
  // Four or more words is a title, not a part number.
  if (mpn.split(/\s+/).length >= 4) return null;
  // Must contain an alphanumeric run of 2+; punctuation alone identifies nothing.
  if (!/[a-z0-9]{2,}/i.test(mpn)) return null;
  // "Sony" as the MPN of a Sony product tells us nothing new.
  if (brand && mpn.toLowerCase() === brand.trim().toLowerCase()) return null;
  // A bare 8/12/13/14-digit number is a barcode, whatever box it was typed
  // into. Sellers routinely paste the EAN into the MPN field, and accepting
  // it would smuggle a GTIN in as an identity signal through the one field
  // that is allowed to establish identity on its own. Genuine numeric part
  // codes of those exact lengths are collateral damage, and that is the right
  // trade: the cost is a missed match, the alternative is a wrong one.
  const digits = mpn.replace(/[\s-]/g, "");
  if (/^\d+$/.test(digits) && [8, 12, 13, 14].includes(digits.length)) return null;
  return mpn;
}

/**
 * Every permitted way to look this listing up, strongest identifier first.
 *
 * A GTIN is globally unique and unambiguous, so it is always tried before
 * brand+MPN, which relies on the seller having typed both correctly.
 * Returns an empty array when the listing cannot be identified — the normal
 * case for a great many eBay listings, and one the caller must handle by
 * showing nothing rather than by guessing.
 */
export function productRefsFor(listing: Listing): ProductRef[] {
  const refs: ProductRef[] = [];

  // `gtin` is already validated to be a real 8/12/13/14-digit barcode by the
  // eBay mapper, so it needs no further cleaning here.
  if (listing.gtin) refs.push({ kind: "gtin", gtin: listing.gtin });

  const brand = usableBrand(listing.brand);
  const mpn = usableMpn(listing.model, brand);
  if (brand && mpn) refs.push({ kind: "brand-mpn", brand, mpn });

  return refs;
}

/** True when a listing carries any identifier a catalogue could resolve. */
export function isIdentifiable(listing: Listing): boolean {
  return productRefsFor(listing).length > 0;
}

/** Stable cache key for a ref. */
export function refKey(ref: ProductRef): string {
  return ref.kind === "gtin"
    ? `gtin:${ref.gtin}`
    : `brand-mpn:${ref.brand.toLowerCase()}|${ref.mpn.toLowerCase()}`;
}
