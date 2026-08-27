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
}

export interface PriceAnalysis {
  standing: PriceStanding;
  percentBelowTypical: number;
}

export interface ProductAnalysis {
  product: Product;
  score: number;
  verdict: Verdict;
  price: PriceAnalysis;
  reasoning: string;
  alternative: { product: Product; score: number; verdict: Verdict } | null;
}
