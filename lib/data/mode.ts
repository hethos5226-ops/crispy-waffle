import { isEbayConfigured } from "@/lib/data/ebay/source";

/**
 * Which product data the app runs on.
 *
 * `live`  — real eBay listings. The production default.
 * `mock`  — the hand-authored demo catalog, for local development only.
 *
 * Mock is opt-in via NEXT_PUBLIC_USE_MOCK_DATA=true and is never selected
 * automatically. In particular the app does not fall back to mock when the
 * eBay API is unavailable: a failed request shows an error state, because
 * showing invented products as though they were real listings would be
 * worse than showing nothing.
 */
export type DataMode = "live" | "mock";

export function getDataMode(): DataMode {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" ? "mock" : "live";
}

export function isMockMode(): boolean {
  return getDataMode() === "mock";
}

/** True when live mode is selected *and* the product service is reachable. */
export function isLiveDataAvailable(): boolean {
  return getDataMode() === "live" && isEbayConfigured();
}
