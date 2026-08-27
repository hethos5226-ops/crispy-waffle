import type { Product } from "@/lib/types";

/**
 * MOCK CATALOG — DEMO DATA ONLY.
 *
 * These prices, ratings, review summaries, warranty terms and release dates
 * are illustrative placeholders, not live data pulled from any retailer,
 * review site or manufacturer spec sheet. This file is the one place that
 * stands in for a real product/pricing/review API. Swap it for a real
 * `ProductProvider` implementation (see lib/data/provider.ts) without
 * touching any UI code.
 *
 * `warranty` and `release` are `null` on a couple of entries on purpose —
 * they demonstrate the scoring engine's "don't fabricate, mark unavailable
 * and redistribute weight" behavior (see lib/scoring.ts).
 */
export const PRODUCTS: Product[] = [
  {
    id: "hisense-50p7",
    name: "Hisense 50-Inch Class P7 4K QLED TV",
    brand: "Hisense",
    category: "tv",
    price: { current: 649, typical: 729, currency: "USD" },
    reviews: {
      sentimentScore: 78,
      positives: [
        "Good picture quality for the price",
        "Punchy QLED colors",
        "Easy initial setup",
      ],
      complaints: [
        "Average built-in speakers",
        "Google TV software can feel sluggish",
        "Limited local dimming zones",
      ],
    },
    alternativeId: "tcl-c6k",
    aliases: ["50p7", "hisense p7", "hisense 50 p7"],
    warranty: { months: 12, type: "manufacturer", limitations: "Panel defects covered only in the first 90 days in some regions" },
    release: { year: 2023, month: 1 },
    newerModelAvailable: true,
  },
  {
    id: "tcl-c6k",
    name: "TCL 55-Inch Class C6K QLED Mini-LED TV",
    brand: "TCL",
    category: "tv",
    price: { current: 699, typical: 749, currency: "USD" },
    reviews: {
      sentimentScore: 88,
      positives: [
        "Excellent mini-LED contrast",
        "Great value for the panel quality",
        "Google TV runs fast and smooth",
      ],
      complaints: ["Some blooming in very dark scenes", "Stand is fairly wide"],
    },
    alternativeId: "hisense-50p7",
    aliases: ["c6k", "tcl c6k", "tcl 55 c6k"],
    warranty: { months: 24, type: "manufacturer", limitations: null },
    release: { year: 2024, month: 6 },
    newerModelAvailable: false,
  },
  {
    id: "samsung-qn90d",
    name: "Samsung QN90D Neo QLED 4K TV",
    brand: "Samsung",
    category: "tv",
    price: { current: 1499, typical: 1249, currency: "USD" },
    reviews: {
      sentimentScore: 70,
      positives: ["Best-in-class brightness", "Excellent anti-glare coating", "Sleek design"],
      complaints: [
        "Selling well above its typical price right now",
        "Tizen OS shows ads in the menu",
        "Price has climbed since launch, unlike most TVs",
      ],
    },
    alternativeId: "tcl-c6k",
    aliases: ["qn90d", "samsung neo qled"],
    warranty: { months: 12, type: "manufacturer", limitations: null },
    release: { year: 2024, month: 2 },
    newerModelAvailable: true,
  },
  {
    id: "sony-wh1000xm5",
    name: "Sony WH-1000XM5 Wireless Headphones",
    brand: "Sony",
    category: "headphones",
    price: { current: 328, typical: 399, currency: "USD" },
    reviews: {
      sentimentScore: 93,
      positives: [
        "Class-leading noise cancellation",
        "Excellent call quality",
        "Comfortable for long listening sessions",
      ],
      complaints: [
        "Doesn't fold as compactly as the previous generation",
        "Touch controls can misfire",
      ],
    },
    alternativeId: "bose-qc-ultra",
    aliases: ["wh-1000xm5", "xm5", "sony 1000xm5"],
    warranty: { months: 12, type: "manufacturer", limitations: null },
    release: { year: 2022, month: 5 },
    newerModelAvailable: true,
  },
  {
    id: "bose-qc-ultra",
    name: "Bose QuietComfort Ultra Headphones",
    brand: "Bose",
    category: "headphones",
    price: { current: 429, typical: 429, currency: "USD" },
    reviews: {
      sentimentScore: 90,
      positives: ["Immersive Audio mode", "Very comfortable fit", "Strong noise cancellation"],
      complaints: ["Battery life shorter than rivals", "Expensive"],
    },
    alternativeId: "sony-wh1000xm5",
    aliases: ["qc ultra", "quietcomfort ultra"],
    warranty: { months: 12, type: "manufacturer", limitations: null },
    release: { year: 2023, month: 9 },
    newerModelAvailable: false,
  },
  {
    id: "iphone-15",
    name: "Apple iPhone 15",
    brand: "Apple",
    category: "phone",
    price: { current: 729, typical: 799, currency: "USD" },
    reviews: {
      sentimentScore: 87,
      positives: ["Excellent camera system", "Smooth day-to-day performance", "Great build quality"],
      complaints: ["Battery life is only average", "Slower charging than rivals"],
    },
    alternativeId: "samsung-s24",
    aliases: ["iphone15", "apple iphone 15"],
    warranty: { months: 12, type: "manufacturer", limitations: "Extendable via AppleCare+" },
    release: { year: 2023, month: 9 },
    newerModelAvailable: true,
  },
  {
    id: "samsung-s24",
    name: "Samsung Galaxy S24",
    brand: "Samsung",
    category: "phone",
    price: { current: 799, typical: 799, currency: "USD" },
    reviews: {
      sentimentScore: 84,
      positives: ["Bright, sharp display", "Strong AI-powered features", "Great cameras"],
      complaints: ["Bixby still lags behind competitors", "Price has crept up over time"],
    },
    alternativeId: "iphone-15",
    aliases: ["galaxy s24", "s24"],
    warranty: { months: 12, type: "manufacturer", limitations: null },
    release: { year: 2024, month: 1 },
    newerModelAvailable: true,
  },
  {
    id: "macbook-air-m2",
    name: "Apple MacBook Air (M2)",
    brand: "Apple",
    category: "laptop",
    price: { current: 999, typical: 1099, currency: "USD" },
    reviews: {
      sentimentScore: 92,
      positives: ["Fantastic battery life", "Silent fanless design", "Excellent build quality"],
      complaints: ["Only two Thunderbolt ports", "Base storage tier is slow"],
    },
    alternativeId: "dell-xps-13",
    aliases: ["macbook air m2", "m2 air"],
    warranty: { months: 12, type: "manufacturer", limitations: "Extendable via AppleCare+" },
    release: { year: 2022, month: 7 },
    newerModelAvailable: true,
  },
  {
    id: "dell-xps-13",
    name: "Dell XPS 13",
    brand: "Dell",
    category: "laptop",
    price: { current: 949, typical: 999, currency: "USD" },
    reviews: {
      sentimentScore: 83,
      positives: ["Compact and light", "Sharp display", "Good keyboard feel"],
      complaints: ["Webcam quality is mediocre", "Limited port selection"],
    },
    alternativeId: "macbook-air-m2",
    aliases: ["xps13", "xps 13"],
    warranty: null,
    release: { year: 2023, month: 3 },
    newerModelAvailable: false,
  },
  {
    id: "lg-27gp850",
    name: "LG 27GP850-B UltraGear Monitor",
    brand: "LG",
    category: "monitor",
    price: { current: 329, typical: 379, currency: "USD" },
    reviews: {
      sentimentScore: 86,
      positives: [
        "Excellent 165Hz Nano IPS panel",
        "Great color accuracy",
        "Solid HDR for the price",
      ],
      complaints: ["Stand takes up a lot of desk space", "No USB-C input"],
    },
    alternativeId: "dell-u2723qe",
    aliases: ["27gp850", "lg ultragear 27"],
    warranty: { months: 36, type: "manufacturer", limitations: null },
    release: { year: 2022, month: 1 },
    newerModelAvailable: false,
  },
  {
    id: "dell-u2723qe",
    name: "Dell UltraSharp U2723QE Monitor",
    brand: "Dell",
    category: "monitor",
    price: { current: 469, typical: 469, currency: "USD" },
    reviews: {
      sentimentScore: 88,
      positives: [
        "Superb color accuracy out of the box",
        "USB-C with 90W power delivery",
        "Great build quality",
      ],
      complaints: ["Only a 60Hz refresh rate", "Premium price"],
    },
    alternativeId: "lg-27gp850",
    aliases: ["u2723qe", "dell ultrasharp 27"],
    warranty: { months: 36, type: "manufacturer", limitations: "Premium Panel Exchange for bright sub-pixels" },
    release: null,
    newerModelAvailable: false,
  },
];

/** Synchronous lookup for the scoring engine, which needs to stay synchronous. */
export function getById(id: string): Product | null {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}

