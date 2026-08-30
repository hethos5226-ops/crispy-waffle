# BuyWise architecture

## The one idea that matters

**BuyWise is product-first, not listing-first.**

The thing BuyWise analyses is a *product*. An eBay listing is merely somewhere
that product happens to be for sale today.

```
CanonicalProduct: Sony WH-1000XM5
  ├─ Offer   eBay AU   $399   New       seller A
  ├─ Offer   eBay AU   $429   New       seller B
  └─ Offer   eBay AU   $449   Open box  seller C
```

Everything BuyWise wants to say — *is this any good, is this a fair price, is
there something better, how old is it* — is a statement about the **product**.
Only price, condition and seller are statements about an individual **offer**.

This distinction is not academic. The first version of BuyWise scored each
eBay listing as though it were its own product, and the result was a scoring
model where four of the six factors were permanently unavailable, because a
marketplace listing simply does not carry review history, warranty terms or a
release date. No amount of engineering fixes that; only the right entity does.

### Listing-first vs product-first

```
LISTING FIRST  (what BuyWise used to do)
  eBay search ──► 50 listings ──► score each one
                                   │
                                   └─► "Not enough data to score" ×40

PRODUCT FIRST  (what BuyWise is for)
  Known product ──► search eBay for it ──► verify each candidate
                                             │
                                             ├─► accepted → Offer
                                             └─► rejected → discarded
                                   │
                                   ▼
                        score the PRODUCT + its offers
```

---

## The two entities

Almost every design decision in BuyWise follows from keeping these apart.

### `CanonicalProduct` — the actual, recognisable product

The thing a person means when they say "a Sony WH-1000XM5". It exists whether
or not anyone is selling one today, and it is the same product regardless of
who sells it.

- **Identity:** `brand` + `mpn` (manufacturer part number). Both required.
- **Carries:** official name, specifications, official images, release date,
  reviews, reliability history, warranty terms.
- **Answers:** *is this any good? is it old? is something better? is it
  reliable?*
- **Defined in:** `lib/data/product.ts`

### `Offer` — one seller's listing of that product

A specific eBay listing. It is not a product; it is an opportunity to buy one.
Ten sellers listing the same headphones produce **one** `CanonicalProduct` and
**ten** `Offer`s.

- **Identity:** the listing id, plus the `productId` it was resolved to.
- **Carries:** price, currency, condition, seller, shipping, listing URL, and
  the `MatchEvidence` explaining why it was tied to that product.
- **Answers:** *what does it cost here? what condition? is this seller any
  good?*
- **Defined in:** `lib/data/product.ts`, wrapping the raw `Listing`

### Why the split matters

| Question | Answered by |
| --- | --- |
| Is this product any good? | Product |
| Is it reliable? | Product |
| How old is it? | Product |
| Is there a better alternative? | Product |
| What's the warranty? | Product |
| **What does it cost?** | **Offer** |
| **What condition is it in?** | **Offer** |
| **Is this seller trustworthy?** | **Offer** |
| **Is this a good price?** | **Both** — offer price against the product's other offers and its history |

Four of the six scoring factors are product-level questions. Ask them of a
listing and they cannot be answered, which is precisely what went wrong with
the earlier listing-first design — see
[`DATA_SOURCES.md` §0](DATA_SOURCES.md#0-why-the-listing-first-approach-failed).

A blunt way to hold it in mind:

> **The product is the noun. The offer is where you can get it.**

---

## The model

```
     KNOWN CANONICAL PRODUCT
                ↓
        FIND REAL OFFERS
                ↓
  COMBINE PRODUCT-LEVEL + OFFER-LEVEL DATA
                ↓
              SCORE
                ↓
     BUYWISE RECOMMENDATION
```

---

## The pieces

Each is a seam so that a better data source can be added later without
rewriting the scoring engine or the UI. All of them exist in the codebase
today; several have no implementation yet, deliberately.

| Concept | Where | What it does | State |
| --- | --- | --- | --- |
| `CanonicalProduct` | `lib/data/product.ts` | A real manufacturer product. Identity is brand + MPN. | Type only |
| `Offer` | `lib/data/product.ts` | One seller's listing *of* a canonical product. | Type only |
| `ProductSource` | `lib/data/listing.ts` | Where offers come from. | **eBay implemented** |
| `ProductCatalog` | `lib/data/catalog/types.ts` | Where canonical products come from. | Interface only — no source qualifies yet |
| `ProductResolver` | `lib/data/catalog/resolver.ts` | Decides whether a listing really is a product. | **Implemented + tested** |
| `MatchEvidence` | `lib/data/catalog/resolver.ts` | Why a match was accepted, retained for display and debugging. | **Implemented** |
| `Market` | `lib/data/market.ts` | Which sources are active for a country. | AU active; US drafted |
| `FactorProvider` | `lib/score/factors.ts` | One scoring factor, with its own data source. | **Implemented + tested** |

`ProductCatalog` currently has **no implementation**, and that is the honest
state of the project: see `DATA_SOURCES.md`. The interface stays because the
problem is a missing source, not a wrong design.

---

## Identity: the strictest part of the system

Getting this wrong is worse than having no product data at all. Attaching a
Sony datasheet to something that is not a Sony is a confident, branded lie.

Two failures found by measurement drive the rules — see `DATA_SOURCES.md` §10
for the evidence:

1. **Seller-supplied barcodes are unreliable.** Four of five UPCitemdb matches
   resolved to unrelated products (luggage, plumbing, plant food, cosmetics)
   from valid, well-formed barcodes.
2. **Brand + MPN agreement is still not sufficient.** An LG TV *stand* carried
   the LG television's own part number. Both identifiers agreed; the match was
   wrong.

### The rules, as implemented

```
Gate 1   Brand conflict                → reject, unconditionally
Gate 2   Looks like an accessory       → reject
             · accessory lexicon: stand, case, mount, replacement, …
             · "for <model>" pattern
Gate 3   No part-number agreement      → reject
             (a barcode can never identify on its own)

Then score:
  MPN exact          +50
  Brand agrees       +25
  GTIN exact         +30    corroboration only
  Model in title     +15    supporting evidence only
  Accept at ≥ 75
```

The weights are chosen so the rules hold *arithmetically*, not by convention:

- GTIN + brand + title = **70** → below threshold. A barcode can never carry a
  match.
- Brand + title = **40** → below threshold. A title can never carry a match.
- Only a part-number agreement can reach 75.

Every accepted match keeps its `MatchEvidence`, so a product page can say
*"matched on brand, part number and model name"* and a future debugger can see
exactly why a wrong match got through.

`scripts/test-resolver.mjs` pins all of this, including the exact LG stand
case. **If that test ever passes that match, the bug is back.**

---

## Scoring: six factors, honest gaps

The six factors are fixed. What changes is who can answer them.

| Factor | Weight | Data source today | Data source wanted |
| --- | ---: | --- | --- |
| Price & Value | 30% | eBay offers + BuyWise's own observed history | Keepa |
| Reviews & Quality | 25% | **unavailable** | Best Buy, or any review-text source |
| Reliability | 15% | **unavailable** | recurring issues from review text |
| Alternatives | 10% | comparable products + their real offers | — |
| Warranty | 10% | **unavailable** | manufacturer data |
| Product Age | 10% | catalogue release date, where confidently matched | Icecat / Wikidata |

**A factor with no reliable data returns `score: null` and its weight is
redistributed across the factors that could answer.** It is never filled with
a guess, an average, or a plausible-looking default. The UI shows the factor,
marked unavailable, with the reason — because "we don't know" is information a
buyer deserves.

`composeScore` also reports **confidence**: the share of total weight that had
real data behind it. A 78 computed from 40% of the weight is not the same
claim as a 78 computed from 95%, and the interface should not pretend it is.

With nothing scoreable the result is `null`, never `0`. Zero reads as a
damning verdict on a product; null says we don't know.

---

## What a finished product page shows

All of these remain in scope. None should be dropped because eBay alone cannot
supply them — each gets its own `FactorProvider` or data source over time.

| | |
| --- | --- |
| Current price | Cheapest verified offer |
| Price history | Competing offers |
| Reviews | Review quality |
| Reliability | Recurring issues |
| Alternatives | Warranty |
| Product age | Specifications |
| Official product images | Seller quality |
| AI summary | Why BuyWise recommends or rejects it |
| Confidence / data availability | |

---

## Price history: BuyWise can generate its own

No source sells Australian eBay price history. But every time BuyWise observes
an offer it can record `(productId, price, currency, condition, observedAt)`.
After a few weeks that *is* a price history — real, measured, not fabricated —
and it is the one dataset BuyWise would own outright.

Open question: per-device `localStorage` gives each user a chart built only
from their own browsing. A *shared* history needs server-side persistence
(Cloudflare D1 or KV behind the existing Worker). Not decided.

---

## Current deployment

| Piece | Where | State |
| --- | --- | --- |
| Frontend | GitHub Pages, static export | Working |
| eBay proxy | Cloudflare Worker (`worker/`) | Working |
| eBay credentials | GitHub Secrets → Cloudflare only | Never in the repo or bundle |
| Demo catalogue | `lib/data/products.ts` | Dev-only, `NEXT_PUBLIC_USE_MOCK_DATA=true`; never reachable in production |

The repository's **default branch is `claude/testing-r61hfk`**, not `main`.
Both deploy workflows trigger from it. This is easy to trip over: a
`workflow_dispatch` workflow only shows a "Run workflow" button when the file
exists on the default branch, which is why
`measure-product-resolution.yml` also carries a `push` trigger.

---

## Unresolved research questions

Recorded, not decided. These are the questions to pick up on return.

1. **What is the best canonical product source for Australian consumer
   electronics?** Nothing measured so far qualifies.
2. **Can a reliable product catalogue be obtained independently of eBay?**
   Icecat's bulk index was never tested — it needs an `ICECAT_PASSWORD` we
   don't have. That is the cheapest unanswered question.
3. **Can identity be established from exact model tokens plus brand, with
   strong accessory and contradiction guards?** In the product-first
   direction we already know the exact model string we searched for, so
   matching it as an exact token is not fuzzy matching. This would lift the
   ~20% brand+MPN ceiling substantially. It needs an explicit decision because
   it relaxes the current "MPN is primary" rule.
4. **Can Australian retailer data be obtained legitimately?** JB Hi-Fi, Kogan,
   Officeworks and Harvey Norman publish no public APIs.
5. **What source can provide review text?** The blocker for two of six
   factors. Best Buy is the only free option found, and it is US-only.
6. **What source can provide warranty information?** Nothing found. Australian
   Consumer Law guarantees are a statutory fact but not product-specific.
7. **How should shared BuyWise price history be persisted?** localStorage vs.
   D1/KV behind the Worker.
8. **Should BuyWise support multiple markets?** The `Market` abstraction is
   built for it; `US_MARKET_DRAFT` records the shape.
9. **Is a paid source justified once the product has users?** Keepa (~€49/mo)
   for price history; Full Icecat for catalogue depth.

---

## When I return — start here

1. **Read `docs/DATA_SOURCES.md`.** It has every number. Do not re-run the
   research.
2. **Run `npm install && npm test && npm run build`.** Confirms the tree still
   works. 45 tests should pass.
3. **Answer question 2 first — it is cheap and unblocks the most.** Get an
   `ICECAT_PASSWORD`, add it as a repository secret, and re-run
   *Actions → Measure canonical product resolution*. It reports the filtered
   index size and whether seeding a local canonical catalogue is viable. This
   is the only remaining experiment on the current architecture.
4. **If the index is good**, build the pre-filtered static index (Option A) and
   the product-first resolution path. The resolver and its guards are already
   written and tested.
5. **If the index is not good**, the decision moves to question 3 (relax the
   matching rule) or a market pivot to Best Buy. Both need your call; neither
   should be made by default.
6. **Do not build the feed until a canonical product source exists.** The feed
   is the easy part and it is worthless without products to put in it.

### Secrets currently configured

| Secret | Still needed? |
| --- | --- |
| `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` | **Yes** — production |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | **Yes** — Worker deploys |
| `ICECAT_USERNAME` | Only for the measurement workflow. Safe to delete if you drop that line of enquiry — nothing in the app reads it. |
