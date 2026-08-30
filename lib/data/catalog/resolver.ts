import type { Listing } from "@/lib/data/listing";
import type { CanonicalProduct } from "@/lib/data/product";
import { usableBrand, usableMpn } from "@/lib/data/catalog/ref";

/**
 * Decides whether an eBay listing really is a given canonical product.
 *
 * This module exists because of a specific measured failure. Across 225 eBay
 * AU listings, exactly two resolved to a catalogue product, and one of those
 * two was wrong:
 *
 *     listing:  "LG OLED 65\" TV Stand Base for OLED65C3PUA"
 *     product:  LG OLED65C3PUA  (the television)
 *     brand:    LG == LG        ✓
 *     mpn:      OLED65C3PUA == OLED65C3PUA  ✓
 *
 * A seller put the television's part number on a stand. Brand agreed, part
 * number agreed, and a resolver checking only those two would have attached a
 * $2,000 OLED TV's specifications, images and score to a $50 accessory.
 *
 * The lesson encoded here: **agreement on identifiers is necessary but not
 * sufficient.** A match must also survive guards that ask what is actually
 * being sold. See `docs/DATA_SOURCES.md` for the full measurement.
 *
 * Nothing calls this yet — no catalogue we have measured can supply canonical
 * products for this market. It is kept, and kept tested, because the rules are
 * the expensive part and they were learned from real data.
 */

export type MatchSignalKind =
  | "mpn-exact"
  | "brand-agrees"
  | "gtin-exact"
  | "model-in-title"
  | "brand-conflict"
  | "accessory-suspected";

export interface MatchSignal {
  kind: MatchSignalKind;
  /** Contribution to the score. Negative for signals that argue against. */
  points: number;
  detail: string;
}

export interface MatchEvidence {
  accepted: boolean;
  score: number;
  signals: MatchSignal[];
  /** Populated when `accepted` is false. */
  rejectedBecause: string | null;
}

/**
 * Points per signal.
 *
 * Chosen so that no combination lacking a part-number match can reach the
 * threshold. Brand + model-in-title is the strongest title-driven combination
 * available and reaches 40 — deliberately short of 75, so a title can support
 * a match but never carry one.
 */
export const MATCH_POINTS = {
  mpnExact: 50,
  brandAgrees: 25,
  gtinExact: 30,
  modelInTitle: 15,
} as const;

export const ACCEPT_THRESHOLD = 75;

/**
 * Words that mean "this listing is something that goes with the product",
 * not "this listing is the product".
 *
 * Deliberately blunt. A false negative costs one missed offer; a false
 * positive attaches a television's review scores to a bracket.
 */
const ACCESSORY_TERMS = [
  "stand", "mount", "bracket", "case", "cover", "sleeve", "skin", "shell",
  "cable", "adapter", "charger", "dock", "cradle", "strap", "band",
  "screen protector", "protector", "filter", "lens cap", "remote",
  "replacement", "spare", "repair", "part", "parts", "kit",
  "compatible with", "fits", "for use with",
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeTight(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * True when the title reads as an accessory *for* the product rather than the
 * product itself.
 *
 * Two independent tests, either of which is enough:
 *  - an accessory noun appears in the title, or
 *  - the model number is preceded by "for", which is how a seller says the
 *    part number belongs to something else ("Stand Base **for** OLED65C3PUA").
 */
export function looksLikeAccessory(title: string, model: string | null): boolean {
  const haystack = ` ${normalize(title)} `;
  for (const term of ACCESSORY_TERMS) {
    if (haystack.includes(` ${normalize(term)} `)) return true;
  }
  if (model) {
    const m = normalize(model);
    if (m && new RegExp(`\\bfor\\b[^a-z0-9]{0,3}${m.replace(/\s+/g, "[^a-z0-9]*")}`).test(haystack)) {
      return true;
    }
  }
  return false;
}

/** Exact model token present in the title, ignoring punctuation and spacing. */
function modelAppearsInTitle(title: string, model: string): boolean {
  const t = normalizeTight(title);
  const m = normalizeTight(model);
  return m.length >= 4 && t.includes(m);
}

/**
 * Weighs one candidate product against one listing.
 *
 * Three gates, all of which must pass, before the score is even consulted:
 *   1. Brands must not contradict each other.
 *   2. The listing must not look like an accessory for the product.
 *   3. A part number must agree — a barcode alone can never identify.
 */
export function evaluateMatch(listing: Listing, candidate: CanonicalProduct): MatchEvidence {
  const signals: MatchSignal[] = [];
  const listingBrand = usableBrand(listing.brand);
  const listingMpn = usableMpn(listing.model, listingBrand);

  // Gate 1 — a contradicted brand is fatal, whatever else agrees.
  if (listingBrand && normalizeTight(listingBrand) !== normalizeTight(candidate.brand)) {
    signals.push({
      kind: "brand-conflict",
      points: 0,
      detail: `Listing says ${listingBrand}, product is ${candidate.brand}.`,
    });
    return { accepted: false, score: 0, signals, rejectedBecause: "Brand conflict" };
  }

  // Gate 2 — the accessory trap that a pure identifier check walks straight into.
  if (looksLikeAccessory(listing.title, candidate.mpn)) {
    signals.push({
      kind: "accessory-suspected",
      points: 0,
      detail: "Title describes an accessory for this product rather than the product.",
    });
    return { accepted: false, score: 0, signals, rejectedBecause: "Looks like an accessory" };
  }

  let score = 0;
  const mpnAgrees = Boolean(listingMpn && normalizeTight(listingMpn) === normalizeTight(candidate.mpn));

  if (mpnAgrees) {
    score += MATCH_POINTS.mpnExact;
    signals.push({ kind: "mpn-exact", points: MATCH_POINTS.mpnExact, detail: `Part number ${candidate.mpn} matches.` });
  }
  if (listingBrand) {
    score += MATCH_POINTS.brandAgrees;
    signals.push({ kind: "brand-agrees", points: MATCH_POINTS.brandAgrees, detail: `Brand ${candidate.brand} agrees.` });
  }
  if (listing.gtin && candidate.gtins.includes(listing.gtin)) {
    score += MATCH_POINTS.gtinExact;
    signals.push({ kind: "gtin-exact", points: MATCH_POINTS.gtinExact, detail: `Barcode ${listing.gtin} matches — corroboration only.` });
  }
  if (modelAppearsInTitle(listing.title, candidate.mpn)) {
    score += MATCH_POINTS.modelInTitle;
    signals.push({ kind: "model-in-title", points: MATCH_POINTS.modelInTitle, detail: "Model number appears in the listing title." });
  }

  // Gate 3 — identity needs a part number. A barcode that agrees is worth
  // points but can never reach the threshold on its own, by construction:
  // gtin(30) + brand(25) + title(15) = 70 < 75.
  if (!mpnAgrees) {
    return {
      accepted: false,
      score,
      signals,
      rejectedBecause: "No part-number agreement — a barcode alone cannot establish identity",
    };
  }

  return {
    accepted: score >= ACCEPT_THRESHOLD,
    score,
    signals,
    rejectedBecause: score >= ACCEPT_THRESHOLD ? null : `Scored ${score}, below the ${ACCEPT_THRESHOLD} threshold`,
  };
}

/**
 * Turns evidence into the sentence a product page shows.
 *
 * A user should always be able to see why BuyWise believes a listing is the
 * product it says it is.
 */
export function describeEvidence(evidence: MatchEvidence): string {
  if (!evidence.accepted) return evidence.rejectedBecause ?? "Not matched.";
  const parts = evidence.signals.filter((s) => s.points > 0).map((s) => s.kind.replace(/-/g, " "));
  return `Matched on ${parts.join(", ")}.`;
}
