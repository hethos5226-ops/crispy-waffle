import type {
  CatalogImage,
  CatalogProduct,
  CatalogSpec,
  CatalogSpecGroup,
  ProductMatchKind,
} from "@/lib/data/catalog/types";
import type {
  IcecatData,
  IcecatFeatureGroup,
  IcecatImage,
  IcecatLocalized,
  IcecatResponse,
} from "@/lib/data/catalog/icecat/types";

/**
 * Icecat's JSON → BuyWise's `CatalogProduct`.
 *
 * Written defensively on purpose. Icecat's payload varies by product and by
 * brand: localized strings arrive wrapped or bare, several fields have older
 * aliases, and a "successful" HTTP 200 can still carry an error body. Reading
 * it loosely and returning null on anything unusable is the only safe posture
 * — the alternative is a half-populated datasheet presented as authoritative.
 *
 * The same rule as the eBay mapper applies throughout: absent means null.
 * Nothing is defaulted or inferred.
 */

/** Icecat writes localized text as a bare string or a `{ Value }` wrapper. */
function text(value: IcecatLocalized): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (value && typeof value === "object" && typeof value.Value === "string") {
    return value.Value.trim() || null;
  }
  return null;
}

function num(value: number | string | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function image(raw: IcecatImage | undefined, url: string | undefined): CatalogImage | null {
  if (!url) return null;
  return {
    url,
    width: num(raw?.PicWidth),
    height: num(raw?.PicHeight),
  };
}

function mapImages(data: IcecatData): CatalogImage[] {
  const out: CatalogImage[] = [];
  const seen = new Set<string>();

  const push = (img: CatalogImage | null) => {
    if (!img || seen.has(img.url)) return;
    seen.add(img.url);
    out.push(img);
  };

  // The main product shot first, at the largest size Icecat offers.
  const main = data.Image;
  push(image(main, main?.HighPic ?? main?.Pic500x500 ?? main?.Pic ?? main?.LowPic));

  for (const g of data.Gallery ?? []) {
    push(image(g, g.HighPic ?? g.Pic ?? g.Pic500x500 ?? g.LowPic));
  }

  return out;
}

/**
 * Specs keep Icecat's own grouping ("Audio", "Connectivity", …) because that
 * grouping is part of what the manufacturer published. `PresentationValue`
 * is preferred over `Value` since it carries the unit.
 */
function mapSpecGroups(groups: IcecatFeatureGroup[] | undefined): CatalogSpecGroup[] {
  const out: CatalogSpecGroup[] = [];

  for (const group of groups ?? []) {
    const name = text(group.FeatureGroup?.Name);
    const specs: CatalogSpec[] = [];

    for (const feature of group.Features ?? []) {
      const specName = text(feature.Feature?.Name);
      const rawValue =
        feature.PresentationValue ??
        feature.LocalValue ??
        (feature.Value != null ? String(feature.Value) : null);
      const value = rawValue?.trim();
      if (!specName || !value) continue;
      specs.push({ name: specName, value });
    }

    if (specs.length > 0) out.push({ name: name ?? "Specifications", specs });
  }

  return out;
}

function mapGtins(raw: string[] | string | undefined): string[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const out: string[] = [];
  for (const value of list) {
    const digits = String(value).replace(/[\s-]/g, "");
    if (/^\d{8,14}$/.test(digits) && !/^0+$/.test(digits)) out.push(digits);
  }
  return Array.from(new Set(out));
}

/** Icecat sends "0000-00-00" and similar for "unknown". */
function releaseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  if (value.startsWith("0000")) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? value.slice(0, 10) : null;
}

export function mapIcecatProduct(
  response: IcecatResponse,
  matchedBy: ProductMatchKind
): CatalogProduct | null {
  // A 200 with a StatusCode is Icecat's way of saying "no product".
  if (response.StatusCode != null) return null;

  const data = response.data;
  const info = data?.GeneralInfo;
  if (!data || !info) return null;

  // Without a name there is no product worth showing.
  const name =
    info.TitleInfo?.GeneratedIntTitle?.trim() ||
    info.Title?.trim() ||
    info.ProductName?.trim() ||
    null;
  if (!name) return null;

  const icecatId = info.IcecatId != null ? String(info.IcecatId) : null;
  if (!icecatId) return null;

  const summary =
    info.SummaryDescription?.LongSummaryDescription?.trim() ||
    info.SummaryDescription?.ShortSummaryDescription?.trim() ||
    info.Description?.ShortDesc?.trim() ||
    null;

  return {
    id: `icecat:${icecatId}`,
    source: "icecat",
    name,
    brand: info.Brand?.trim() || info.BrandInfo?.BrandName?.trim() || null,
    mpn: info.BrandPartCode?.trim() || info.ProductCode?.trim() || null,
    gtins: mapGtins(info.GTIN),
    category: text(info.Category?.Name),
    summary,
    images: mapImages(data),
    specGroups: mapSpecGroups(data.FeaturesGroups),
    releaseDate: releaseDate(info.ReleaseDate),
    // Open Icecat publishes datasheets, not customer reviews.
    rating: null,
    matchedBy,
  };
}
