export type Category = "tv" | "headphones" | "phone" | "laptop" | "monitor";

export type Verdict = "BUY_NOW" | "WAIT" | "DONT_BUY";

export type PriceStanding = "cheap" | "normal" | "expensive";

export interface PriceInfo {
  current: number;
  typical: number;
  currency: string;
}

export interface ReviewData {
  /** 0-100 aggregate sentiment signal derived from review sources. */
  sentimentScore: number;
  positives: string[];
  complaints: string[];
}

export interface WarrantyInfo {
  months: number;
  type: "manufacturer" | "retailer";
  limitations: string | null;
}

export interface ReleaseInfo {
  year: number;
  /** 1-12 */
  month: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  price: PriceInfo;
  reviews: ReviewData;
  /** id of a related product BuyWise can point users to instead. */
  alternativeId?: string;
  /** lowercase search terms (model numbers, nicknames) beyond the name/brand. */
  aliases: string[];
  /** null when no reliable warranty data is available — never fabricated. */
  warranty: WarrantyInfo | null;
  /** null when no reliable release-date data is available — never fabricated. */
  release: ReleaseInfo | null;
  newerModelAvailable: boolean;
}

export interface PriceAnalysis {
  standing: PriceStanding;
  percentBelowTypical: number;
}

export type ScoreFactorKey = "price" | "reviews" | "reliability" | "alternatives" | "warranty" | "age";

export interface ScoreFactor {
  key: ScoreFactorKey;
  label: string;
  /** 0-1 share of the composite score this factor is weighted at (before any redistribution). */
  weight: number;
  /** null when reliable data isn't available — the factor is excluded, not guessed. */
  score: number | null;
  detail: string;
}

export interface ProductAnalysis {
  product: Product;
  score: number;
  verdict: Verdict;
  price: PriceAnalysis;
  reasoning: string;
  alternative: { product: Product; score: number; verdict: Verdict } | null;
  factors: ScoreFactor[];
  /** true when one or more factors were unavailable and their weight was redistributed. */
  weightRedistributed: boolean;
}

export interface PriceHistoryPoint {
  date: Date;
  price: number;
}

export interface Review {
  author: string;
  rating: number;
  daysAgo: number;
  source: string;
  text: string;
}

export interface ReviewSummary {
  items: Review[];
  average: number;
  count: number;
}

export interface RetailerListing {
  name: string;
  price: number;
}
