# BuyWise

BuyWise turns "should I buy this?" into a single, evidence-based answer:
🟢 **BUY NOW**, 🟡 **WAIT**, or 🔴 **DON'T BUY** — with the reasoning shown,
not hidden.

> **Status: paused, mid-research.** The app works and runs on live eBay AU
> data. The next phase — a product-first discovery feed — is blocked on an
> unsolved problem: no free data source we have measured can supply canonical
> product identity for Australian consumer electronics.
>
> **Start here when picking this back up:**
> - [`docs/BUYWISE_ARCHITECTURE.md`](docs/BUYWISE_ARCHITECTURE.md) — where this
>   is going, and the "When I return" checklist.
> - [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) — every data source tested,
>   with the actual measurements. Don't redo this research.

## The idea

BuyWise is **product-first, not listing-first**. The thing being analysed is a
*product*; a marketplace listing is only somewhere that product happens to be
for sale.

```
CanonicalProduct: Sony WH-1000XM5
  ├─ Offer   eBay AU  $399
  ├─ Offer   eBay AU  $429
  └─ Offer   eBay AU  $449
```

A product is scored on six factors — Price & Value, Reviews & Quality,
Reliability, Alternatives, Warranty, Product Age. **A factor with no reliable
data is marked unavailable and its weight redistributed.** Nothing is ever
filled in with a guess.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 45 tests: identifier gate + product resolver + scoring
npm run build
```

Live eBay data needs `NEXT_PUBLIC_BUYWISE_API_URL` pointing at the deployed
Worker. Without it the app runs but shows no listings. For UI work without
touching the eBay quota, `NEXT_PUBLIC_USE_MOCK_DATA=true` switches to the
development catalogue in `lib/data/products.ts` — never reachable in
production.

## How it's built

- **Next.js (App Router) + TypeScript + Tailwind**, deployed as a static
  export to GitHub Pages.
- **`worker/`** — a Cloudflare Worker proxying the eBay Browse API. It exists
  because GitHub Pages cannot run server code and eBay's API needs a secret.
  Credentials travel GitHub Secrets → Cloudflare and never reach the browser.

### The seams

Each abstraction exists so a better data source can be added without
rewriting the scoring engine or the UI.

| Concept | File | State |
| --- | --- | --- |
| `CanonicalProduct`, `Offer` | `lib/data/product.ts` | Types |
| `ProductSource` | `lib/data/listing.ts` | **eBay implemented** |
| `ProductCatalog` | `lib/data/catalog/types.ts` | Interface only — no source qualifies yet |
| `ProductResolver`, `MatchEvidence` | `lib/data/catalog/resolver.ts` | **Implemented + tested** |
| `Market` | `lib/data/market.ts` | AU active, US drafted |
| `FactorProvider` | `lib/score/factors.ts` | **Implemented + tested** |

### Product identity is the strict part

Attaching one product's specifications to another is worse than showing
nothing, so identity has hard rules, all learned from measured failures:

- **Brand conflict → immediate rejection.**
- **A part number must agree.** A seller-supplied barcode can never establish
  identity on its own — measured resolving to luggage, plumbing and cosmetics.
- **A title is supporting evidence only**, never sufficient.
- **Identifier agreement is still not enough.** An eBay listing for an LG TV
  *stand* carried the television's own part number; brand and MPN both agreed
  and the match was wrong. An accessory guard catches it.

`scripts/test-resolver.mjs` pins each of these against the real cases.

## Measurement, not assumption

`.github/workflows/measure-product-resolution.yml` measures eBay identifier
coverage and catalogue resolution against the live APIs. Every figure in
`docs/DATA_SOURCES.md` came from it and can be reproduced.

Note the repository's default branch is `claude/testing-r61hfk`, not `main`.
Both deploy workflows trigger from it.
