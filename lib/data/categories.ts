/**
 * The category chips on Recs.
 *
 * eBay's Browse API has no "give me good products in this category" endpoint,
 * so each chip is a real keyword search against the consumer-electronics
 * category the Worker already scopes to. The query is what BuyWise sends —
 * results are whatever eBay actually returns for it.
 */
export interface BrowseCategory {
  id: string;
  label: string;
  query: string;
}

export const BROWSE_CATEGORIES: BrowseCategory[] = [
  { id: "featured", label: "Featured", query: "wireless headphones" },
  { id: "tv", label: "TVs", query: "4k smart tv" },
  { id: "headphones", label: "Headphones", query: "noise cancelling headphones" },
  { id: "phone", label: "Phones", query: "smartphone unlocked" },
  { id: "laptop", label: "Laptops", query: "laptop" },
  { id: "monitor", label: "Monitors", query: "computer monitor" },
];

export const DEFAULT_CATEGORY = BROWSE_CATEGORIES[0];
