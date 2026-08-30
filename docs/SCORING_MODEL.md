# The BuyWise score — audit of the six factors

An audit of what the scoring model actually does, factor by factor, against
the product vision. Written to be re-read cold after a long gap.

Implementation: `lib/score/factors.ts` (composition and the rules),
`lib/scoreWeights.ts` (weights), `lib/listingAnalysis.ts` (the live eBay
scorer). Guarantees are pinned by `scripts/test-scoring.mjs`.

---

## The shape of it

```
six factors ──► each returns a score 0-100, or null if it has no data
                                │
                                ▼
              weight of every null factor is redistributed
              across the factors that could answer
                                │
                                ▼
              score = weighted average of what is known
                                │
                                ▼
              verdict = BUY NOW ≥75 · WAIT ≥50 · DON'T BUY <50
                        ...but a BUY NOW requires ≥50% of the
                           model to have real data behind it
```

**Two rules run through everything:**

1. **Nothing is ever invented.** A factor without a reliable source returns
   `null`, is displayed as unavailable *with the reason*, and contributes
   nothing. No averages, no neutral defaults, no plausible placeholders.
2. **Not knowing must never flatter a product.** See
   [the confidence floor](#the-confidence-floor) — this one was a real bug.

---

## The six factors

### 1. Price & Value — weight 30%

| | |
| --- | --- |
| **Uses today** | The median price of comparable current listings — same product search, **same condition** — and where this offer sits against it. Requires ≥2 comparable listings. |
| **Unavailable** | **Price history.** eBay publishes none, so "cheap relative to its own past" cannot be answered. Today's spread is not history. |
| **Future source** | Keepa (~€49/mo) for Amazon-grade history, or **BuyWise's own observed history** — recording every offer it sees costs nothing and is the one dataset BuyWise would own outright. |
| **Never** | Never present today's cheapest-of-three as a historic low. Never invent a "typical price" or RRP. Never compare across conditions — a used unit under a shelf of new ones is not a bargain, it is a different thing. |
| **When unavailable** | Returns `null` with "not enough comparable listings in the same condition". Weight redistributes. |

### 2. Reviews & Quality — weight 25%

| | |
| --- | --- |
| **Uses today** | eBay's `primaryProductReviewRating`, present only for catalog-matched listings — **rare in practice**. |
| **Unavailable** | Review *text* for essentially all listings. Without it there is no sentiment, no themes, no "owners consistently say…". |
| **Future source** | Best Buy (free, real customer review text, **US only**); Icecat Reviews (exists as a field, gated behind account-manager enablement). |
| **Never** | Never synthesise review text. Never infer quality from price, brand reputation, or seller feedback — **seller feedback rates the seller, not the product**, and conflating them is the most tempting error here. |
| **When unavailable** | Returns `null` with "eBay has no product rating for this listing". Weight redistributes. |

### 3. Reliability — weight 15%

| | |
| --- | --- |
| **Uses today** | The rating histogram, when eBay supplies one: what share of ratings are 1–2 stars. A product averaging 4 because everyone says 4 is not the same as one averaging 4 from a mix of 5s and 1s. |
| **Unavailable** | Recurring-issue detection, which needs review text (see factor 2). No failure rates, no return rates, no longevity data. |
| **Future source** | The same review-text source as factor 2. |
| **Never** | Never infer reliability from the average rating alone — that is factor 2 wearing a different hat, and double-counts one signal. Never treat absence of complaints as evidence of reliability. |
| **When unavailable** | Returns `null` with "no review text or rating breakdown, so recurring problems can't be identified". Weight redistributes. |

### 4. Alternatives — weight 10%

| | |
| --- | --- |
| **Uses today** | How many comparable listings are cheaper than this one, and the cheapest of them as a concrete "consider this instead". |
| **Unavailable** | True *product* alternatives — a different, better product in the same class. That needs a canonical product catalogue, which BuyWise does not have. Today's "alternatives" are other offers, largely of the same thing. |
| **Future source** | A canonical catalogue with categories, so comparables can be sibling products rather than sibling listings. |
| **Never** | Never present a cheaper listing of the *same* product as a better *product*. Never rank alternatives by price alone. |
| **When unavailable** | Returns `null` with "no comparable listings found to weigh this against". Weight redistributes. |

### 5. Warranty — weight 10%

| | |
| --- | --- |
| **Uses today** | **Nothing. Hardcoded `null`.** |
| **Unavailable** | Everything — terms, duration, whether it is manufacturer or seller backed. eBay's API does not carry it. |
| **Future source** | None identified. Manufacturer sites publish no APIs. Australian Consumer Law guarantees are a statutory fact but not product-specific, so they cannot fill this factor. |
| **Never** | Never assume a standard 12-month warranty. Never infer warranty from condition or from the seller being a business. Never state ACL guarantees as if they were *this product's* warranty. |
| **When unavailable** | Always `null` today, with "eBay's listing data doesn't include warranty terms". Weight redistributes. |

### 6. Product Age — weight 10%

| | |
| --- | --- |
| **Uses today** | **Nothing. Hardcoded `null`.** |
| **Unavailable** | Release date, generation, and whether a newer model has superseded it. |
| **Future source** | A catalogue release date — Icecat exposes `ReleaseDate`, though it was empty on both products we matched; Wikidata holds release dates for notable products. Both need a canonical product first. |
| **Never** | Never use the **listing's** creation date as the product's age. `Listing.listedAt` is when a seller posted an ad, and treating it as a release date would invent a product age from an unrelated fact. The field is named and documented to make that mistake hard. |
| **When unavailable** | Always `null` today, with "eBay's listing data doesn't include a model release date". Weight redistributes. |

---

## Where that leaves the live app

On a typical eBay listing:

| Factor | Weight | Typically available? |
| --- | ---: | --- |
| Price & Value | 30% | ✅ with ≥2 comparable listings |
| Reviews & Quality | 25% | ❌ rare |
| Reliability | 15% | ❌ rarer |
| Alternatives | 10% | ✅ |
| Warranty | 10% | ❌ **never** |
| Product Age | 10% | ❌ **never** |

**20% of the weight is missing on every listing, always. Typically ~60% is.**
This is the measured evidence behind the product-first pivot — see
[`DATA_SOURCES.md` §0](DATA_SOURCES.md#0-why-the-listing-first-approach-failed).

---

## Redistribution

```
score = Σ(score × weight for available factors)
        ────────────────────────────────────────
        Σ(weight for available factors)
```

A `null` factor contributes nothing to either sum, so the remaining factors
scale up proportionally. Consequences, all tested:

- **Nothing scoreable → `score: null`, `verdict: null`** — never `0`. A zero
  reads as a damning judgement on a product we know nothing about.
- **`weightRedistributed`** is reported so the UI can say so.
- **`confidence`** reports the share of total weight with real data behind it.
  A 78 from 40% of the model is not the same claim as a 78 from 95%, and the
  interface must not present them identically.

---

## The confidence floor

**This was a real defect, found during this audit.**

Redistribution alone lets missing data flatter a product. The arithmetic is
honest — it averages what is known — but the *verdict* drawn from it was not,
because the factors eBay can populate are systematically the flattering ones
(price, alternatives) while the ones it never supplies are the tempering ones
(warranty, age, and usually reviews and reliability).

Measured, using the real weights:

| Scenario | Score | Verdict |
| --- | ---: | --- |
| price 90, alternatives 90, **everything else unknown** (40% confidence) | 90 | **BUY NOW** |
| the same product, also knowing reviews 40, reliability 50, warranty 60, age 60 | 66 | WAIT |

**Not knowing made the product look better.** For a buying assistant that is
exactly backwards, and it was reachable on live eBay data, since price and
alternatives are precisely the two factors the live path can fill.

The fix, in `composeScore`:

> A **BUY NOW** requires at least `MIN_CONFIDENCE_FOR_BUY` (currently **0.5**)
> of the total weight to have real data behind it. Below that the verdict is
> held at **WAIT** and `verdictLimitedByConfidence` is set, so the reason can
> be shown rather than silently swallowed.

**The cap is deliberately one-directional.** Thin evidence may still produce a
negative verdict, but never a positive one — a false BUY costs someone money,
a false DON'T BUY costs them a deal. That asymmetry is intentional.

The score itself is untouched: it still reads 90, and the breakdown still
shows why. Only the recommendation is withheld.

---

## Guarantees pinned by tests

`scripts/test-scoring.mjs`, 27 cases:

- All six factors exist, weights sum to 1.0, and all six survive composition
  even when unavailable.
- An unavailable factor stays `null` — never defaulted.
- Nothing scoreable → `null` score, `null` verdict, zero confidence.
- Weight redistributes correctly; redistribution and confidence are reported.
- **Ignorance cannot outrank knowledge** — thin evidence cannot produce a
  BUY NOW that fuller evidence would not.
- A well-evidenced product can still say BUY NOW.
- Thin evidence may still say DON'T BUY (the one-directional cap).
- The confidence floor holds exactly at the boundary and just below it.
- Verdict thresholds at 75 / 50.

---

## Known gaps, for when work resumes

1. **The UI does not yet explain a held-back verdict.** `composeScore` sets
   `verdictLimitedByConfidence`, and `ListingAnalysis` now carries it and
   `confidence`, but no component reads them. A user seeing WAIT on a 90 has
   no way to know it was withheld for lack of evidence. This is the first
   thing to wire up.
2. **`MIN_CONFIDENCE_FOR_BUY = 0.5` is a judgement, not a measurement.** Half
   the model felt like the right bar for recommending a purchase. Worth
   revisiting against real products once a catalogue exists.
3. **Four of six factors have no source at all.** That is a data problem, not
   a scoring problem — `DATA_SOURCES.md` is the place it gets solved.
