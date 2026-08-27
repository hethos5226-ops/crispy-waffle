# BuyWise

BuyWise turns "should I buy this?" into a single, evidence-based answer:
🟢 **BUY NOW**, 🟡 **WAIT**, or 🔴 **DON'T BUY** — with the reasoning shown,
not hidden.

This is the MVP: one search flow, one scoring engine, a small mock catalog
of consumer electronics (TVs, headphones, phones, laptops, monitors).

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, search a product name (or paste a product URL),
and BuyWise returns a score, verdict, price comparison, review summary, and
a suggested alternative.

Try: `Hisense 50P7`, `TCL C6K`, `Samsung QN90D`, `Sony WH-1000XM5`,
`Bose QC Ultra`, `iPhone 15`, `Samsung S24`, `MacBook Air M2`, `Dell XPS 13`,
`LG 27GP850`, `Dell U2723QE`.

## How it's built

- **Next.js (App Router) + TypeScript + Tailwind CSS** — one app for UI and
  backend.
- **Data layer** (`lib/data/`): a `ProductProvider` interface with a
  `MockProductProvider` implementation. All product/price/review data is
  **mock data for this MVP** — clearly separated so a real pricing/review
  API can implement the same interface later without any UI changes.
- **Scoring engine** (`lib/scoring.ts`): a pure function that combines price
  positioning (current vs. typical price) with review sentiment into a
  0–100 score, a verdict, and a plain-English explanation. Independent of
  where the data came from.
- **Routes**:
  - `/` — search entry point.
  - `/result?q=...` — resolves a free-text query (name or pasted URL)
    against the catalog and renders the recommendation.
  - `/product/[id]` — canonical per-product page (used by "better
    alternative" links).
  - `/api/analyze?q=...` — the same analysis as JSON, demonstrating the
    integration boundary for future clients (browser extension, mobile app).

## What's intentionally not built yet

Per the MVP scope: no accounts, no saved products, no price history graphs,
no alerts, no affiliate links. The data layer and scoring engine are
structured so these can be added later without a rewrite — e.g. a real
`ProductProvider` would naturally bring price-history data that a future
`/price-history` view could chart.
