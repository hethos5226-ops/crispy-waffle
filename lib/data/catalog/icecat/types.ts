/**
 * The subset of Icecat's Live JSON response BuyWise reads.
 *
 * Icecat's payload is large, deeply nested, and varies between products —
 * localized fields arrive either as a bare string or as a `{ Value }`
 * wrapper, and several keys have historical aliases. Everything here is
 * therefore optional and loosely typed, with `lib/data/catalog/icecat/map.ts`
 * responsible for reading it defensively and returning null rather than
 * guessing.
 *
 * The exact live shape is captured by the Phase 0 audit workflow
 * (`.github/workflows/audit-ebay-coverage.yml`), which prints the real
 * response tree of a successful lookup.
 *
 * Reference: https://iceclog.com/manual-for-icecat-json-product-requests/
 */

/** Icecat writes localized text as either a string or a `{ Value }` object. */
export type IcecatLocalized = string | { Value?: string } | null | undefined;

export interface IcecatImage {
  Pic?: string;
  HighPic?: string;
  LowPic?: string;
  ThumbPic?: string;
  Pic500x500?: string;
  PicHeight?: number | string;
  PicWidth?: number | string;
  IsMain?: string | boolean;
}

export interface IcecatFeature {
  Feature?: { Name?: IcecatLocalized };
  /** Human-readable value including its unit, e.g. "30 mm". */
  PresentationValue?: string;
  Value?: string | number;
  LocalValue?: string;
}

export interface IcecatFeatureGroup {
  FeatureGroup?: { Name?: IcecatLocalized };
  Features?: IcecatFeature[];
}

export interface IcecatGeneralInfo {
  IcecatId?: number | string;
  Title?: string;
  TitleInfo?: { GeneratedIntTitle?: string; GeneratedLocalTitle?: IcecatLocalized };
  ProductName?: string;
  Brand?: string;
  BrandInfo?: { BrandName?: string };
  BrandPartCode?: string;
  ProductCode?: string;
  /** Barcodes. Icecat has sent both an array and a single string. */
  GTIN?: string[] | string;
  Category?: { CategoryID?: string | number; Name?: IcecatLocalized };
  SummaryDescription?: {
    ShortSummaryDescription?: string;
    LongSummaryDescription?: string;
  };
  Description?: { ShortDesc?: string; LongDesc?: string };
  ReleaseDate?: string;
}

export interface IcecatData {
  GeneralInfo?: IcecatGeneralInfo;
  Image?: IcecatImage;
  Gallery?: IcecatImage[];
  FeaturesGroups?: IcecatFeatureGroup[];
}

export interface IcecatResponse {
  msg?: string;
  /** Present on failures; its presence means "no product", not "empty product". */
  StatusCode?: number | string;
  data?: IcecatData;
}
