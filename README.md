# BuyWise

BuyWise turns "should I buy this?" into a single, evidence-based answer:
🟢 **BUY NOW**, 🟡 **WAIT**, or 🔴 **DON'T BUY** — with the reasoning shown,
not hidden.

---

# 🅿️ Project status — returning to BuyWise

**BuyWise is parked.** Last worked on August 2026. The app builds, deploys and
runs on live eBay AU data; nothing is broken. It is paused because of an
unsolved *data* problem, not a code problem.

### What BuyWise is for

BuyWise analyses **real, recognisable products** — an Apple iPhone 16, a Sony
TV, a pair of JBL headphones. It is **not** an app that scores arbitrary,
low-quality eBay listings.

```
CanonicalProduct: Sony WH-1000XM5      ← the thing BuyWise understands
  ├─ Offer   eBay AU  $399             ← places you can buy it
  ├─ Offer   eBay AU  $429
  └─ Offer   eBay AU  $449
```

An earlier version scored each eBay listing as if it were its own product.
That approach failed, measurably — see
[why listing-first failed](docs/DATA_SOURCES.md#0-why-the-listing-first-approach-failed).

### Rules that do not change

1. **The six scoring factors are fixed:** Price & Value, Reviews & Quality,
   Reliability, Alternatives, Warranty, Product Age.
2. **Missing data is never guessed.** A factor without a reliable source
   returns `null`, is shown as unavailable with the reason, and its weight is
   redistributed across the factors that could answer. No averages, no
   defaults, no plausible-looking placeholders.
   **And not knowing must never flatter a product** — a BUY NOW requires real
   data behind at least half the model. See
   [the confidence floor](docs/SCORING_MODEL.md#the-confidence-floor).
3. **Identity must be earned.** A seller-supplied barcode can never identify a
   product on its own, and even brand + part number agreement is not
   sufficient — see [the LG stand](docs/DATA_SOURCES.md#102-brand--mpn-agreement-is-still-not-sufficient).

### ⛔ Do not build the feed yet

The Reels-style discovery feed is designed but deliberately unbuilt. **It
should not be built until there is a reliable canonical product source.** The
feed is the easy part and it is worthless without real products to put in it.

### ➡️ The next decision when you return

**Test whether Icecat's bulk index is usable.** It is the only avenue never
tested — all five index URLs returned `401`, because the bulk index needs an
HTTP Basic **password** while the JSON API works with the username alone.

1. Obtain an Icecat password, add it as the repository secret `ICECAT_PASSWORD`.
2. Run *Actions → **Measure canonical product resolution***.
3. It reports the filtered index size and whether seeding a local canonical
   catalogue is viable.

**If the index is good** → build the pre-filtered static index and the
product-first resolution path. The resolver and its guards are already written
and tested.

**If the index is poor** → the decision moves to one of two things, and both
need a deliberate call rather than a default:
- relax the matching rule (exact model token + brand + accessory guard + price
  sanity, in the product-first direction only), or
- pivot market to Best Buy — the only free source found with canonical
  products *and* real review text, at the cost of becoming US-first.

### Read these two documents first

| Document | What it holds |
| --- | --- |
| [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) | Every data source tested, with the actual measurements. **Don't redo this research.** |
| [`docs/BUYWISE_ARCHITECTURE.md`](docs/BUYWISE_ARCHITECTURE.md) | Where this is going, the entity model, and the full return checklist. |
| [`docs/SCORING_MODEL.md`](docs/SCORING_MODEL.md) | The six factors audited one by one — what each uses, what it lacks, and what it must never assume. |

---

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
