# Product data sources — what we tested and what we found

Every figure here was measured against the live APIs from GitHub Actions,
not estimated. The workflow that produced most of them is
`.github/workflows/measure-product-resolution.yml`; re-running it reproduces
the numbers.

The question all of this was trying to answer:

> Can BuyWise identify a real, canonical product (an *Apple iPhone 16*, a
> *Sony WH-1000XM5*) and then use eBay to find offers for it?

**As of the last measurement, no.** The evidence is below.

---

## Contents

0. [Why the listing-first approach failed](#0-why-the-listing-first-approach-failed)
1. [What we tested](#1-what-we-tested)
2. [eBay Browse API](#2-ebay-browse-api--accepted)
3. [eBay Catalog API](#3-ebay-catalog-api--rejected)
4. [Icecat Open](#4-icecat-open--rejected-as-a-backbone)
5. [UPCitemdb](#5-upcitemdb--rejected)
6. [Go-UPC](#6-go-upc--deferred-untested)
7. [Amazon PA-API / Creators API](#7-amazon-pa-api--creators-api--rejected)
8. [Best Buy](#8-best-buy--deferred)
9. [Keepa](#9-keepa--deferred)
10. [Two failure modes worth remembering](#10-two-failure-modes-worth-remembering)
11. [Summary](#11-summary)

---

## 0. Why the listing-first approach failed

Before any of the source research below, BuyWise worked a different way: it
searched eBay, took whatever listings came back, and scored **each listing as
though it were its own product**. That approach was abandoned, and it is worth
being precise about why, because the reasons are structural rather than fixable
by better engineering.

### It made two thirds of the scoring model unanswerable

The six factors ask questions about a *product*. A marketplace listing cannot
answer most of them, because a listing is a statement about one seller's stock,
not about the thing being sold. In `lib/listingAnalysis.ts` — the listing-first
scorer still powering the app today — this is visible in the code:

| Factor | Weight | On an eBay listing |
| --- | ---: | --- |
| Price & Value | 30% | needs ≥2 comparable listings in the same condition |
| Reviews & Quality | 25% | `null` unless eBay catalog-matched the item — rare |
| Reliability | 15% | `null` unless a rating histogram exists — rarer |
| Alternatives | 10% | needs comparable listings |
| **Warranty** | **10%** | **hardcoded `null` — eBay publishes no warranty terms** |
| **Product Age** | **10%** | **hardcoded `null` — eBay publishes no release dates** |

**20% of the weight is missing on every listing, always. Typically ~60% is
missing**, once Reviews and Reliability drop out too. The redistribution logic
kept that honest rather than hiding it, so most listings scored on roughly 40%
of the model, and many showed "Not enough data to score" outright.

That is not a data-source problem that a better API fixes. It is a category
error: asking a listing questions only a product can answer.

### The listings themselves were mostly not products

The eBay AU sample in §2 shows the second half of the problem:

- **51.6%** of listings had a usable brand — the rest said `Unbranded`,
  `Generic`, or `Does not apply`.
- **19.6%** had a genuine brand *and* part number.
- So **roughly 80% of listings cannot be tied to a real product at all**, no
  matter which catalogue we pair them with.

A feed built from arbitrary listings is therefore mostly unidentifiable stock,
scored on a minority of the model. Neither problem is solved by trying harder
on the listing side.

### What replaced it

Invert the direction. Start from a **canonical product** BuyWise already knows
is real, then search eBay for **offers** of that product. The product answers
the six factors; the offers supply price, condition and seller. Listings that
cannot be verified as that product are simply not shown, rather than being
scored badly.

This is the architecture described in `BUYWISE_ARCHITECTURE.md`. It is blocked
on exactly one thing: a reliable source of canonical products — which is what
the rest of this document set out to find, and did not.

---

## 1. What we tested

Two things, separately:

- **Identifier availability** — how often eBay AU publishes a brand, a genuine
  manufacturer part number, or a barcode at all.
- **Catalogue resolution** — whether those identifiers actually find the right
  product in a product catalogue.

The second is worthless without the first, and the first turned out to be the
binding constraint.

A note on method that cost us two wrong conclusions before we fixed it: the
audit imports the application's own identifier gate
(`lib/data/catalog/ref.ts`) rather than reimplementing it, so what we measure
and what the app does cannot drift apart. An earlier version reimplemented the
check, got it wrong, and reported 77.5% GTIN coverage when the true figure was
30% — the difference being seller-typed placeholders like `"Does not apply"`
counted as barcodes.

---

## 2. eBay Browse API — **accepted**

The offer source. Working in production today via the Cloudflare Worker in
`worker/`.

### Identifier availability, 225 eBay AU listings across 9 categories

Sampled via `getItem`, 25 listings per category.

| Category | Listings | Usable brand | Genuine MPN | Brand + MPN |
| --- | ---: | ---: | ---: | ---: |
| Phones | 25 | 64% | 20% | 20% |
| TVs | 25 | 68% | 48% | **40%** |
| Headphones | 25 | 44% | 20% | 20% |
| Laptops | 25 | 48% | 12% | 4% |
| Monitors | 25 | 52% | 28% | 24% |
| Cameras | 25 | 40% | 20% | 20% |
| Tablets | 25 | 72% | 24% | 20% |
| Speakers | 25 | 36% | 4% | 4% |
| Wearables | 25 | 40% | 24% | 24% |
| **Overall** | **225** | **51.6%** | **22.2%** | **19.6%** |

**Only ~20% of eBay AU listings carry a genuine brand and part number.** That
ceiling is eBay's data quality and applies no matter which catalogue we pair
it with. It is the single most important number in this document.

### Field-presence vs. field-*usefulness*

Measured separately on an earlier 40-listing sample, because the gap is the
whole problem:

| Field | Present | Actually usable |
| --- | ---: | ---: |
| Brand | 95% | **40–45%** |
| MPN | 17.5–22.5% | 17.5–22.5% |
| GTIN | 75–77.5% | **30%** |
| `localizedAspects` | 100% | 100% |

Over half of sellers type `Unbranded`, `Generic` or `Does not apply` into the
brand box; most barcode fields contain a placeholder rather than a barcode.

### Other findings

- **Identifiers appear only on `getItem`, never in search results.** Search
  returns brand/MPN/GTIN at 0%. Enrichment therefore costs **one extra API
  call per listing**, and a feed built on it costs ~2 extra calls per card
  versus browsing search results alone.
- **ePID** appears on ~12.8% of *search* results but 0% of `getItem`
  responses. It cannot be resolved to a product (see §3) but is still a valid
  **grouping** key: two listings sharing an ePID are the same product per eBay.
- Free tier is 5,000 calls/day. Not the binding constraint at our volumes.
- eBay publishes no price history, no warranty terms, no release dates, and
  review text only for catalog-matched items (rare).

**Verdict: keep as the offer source. It is good at what it is — a marketplace
of offers. It is not a product catalogue and should never be used as one.**

---

## 3. eBay Catalog API — **rejected**

`commerce/catalog/v1_beta` would resolve an ePID to a real product with
aspects and identifiers. It is a **Limited Release** API:

> "Access to Limited Release APIs is contingent upon invitation from eBay
> and/or a rigorous business case review and signed contracts."

Not obtainable for a project at this stage.

**Verdict: rejected for now. Revisit only if BuyWise has traction that would
support a business case.**

---

## 4. Icecat Open — **rejected as a backbone**

Free registration, brand-approved datasheets, ~18–30M products. Two access
paths, and the distinction matters:

| Path | Auth | Works? |
| --- | --- | --- |
| Live JSON API (`live.icecat.biz/api/`) | username only | **yes** |
| Bulk index (`data.icecat.biz/export/…`) | HTTP Basic, **needs a password** | **401 — untested** |

Correct request shape (we got this wrong first time and every lookup returned
400): `?shopname=<user>&lang=en&content=&GTIN=…` — note `shopname` not
`UserName`, `lang` not `Language`, and **`content` is mandatory** even when
empty.

### Experiment 1 — resolution by seller-supplied GTIN

14 GTINs from live eBay AU listings, against a control lookup that returned
HTTP 200 (so the integration was working):

| Result | Count |
| --- | ---: |
| Datasheet found | **0 / 14** |
| "The GTIN can not be found" | 10 |
| "Not present in the Icecat database" | 2 (both Sony) |
| "Product has brand restrictions" | 1 (Apple) |
| **"To access Full Icecat content, an app_key is required"** | 1 (Sony) |

That last row matters: the one product Icecat *did* hold was behind the paid
tier. The free tier's ceiling sits below its own catalogue.

### Experiment 2 — resolution by verified brand + genuine MPN

The stricter, more defensible path, on 225 listings:

| Measure | Result |
| --- | --- |
| Listings with genuine brand + MPN | 44 / 225 (19.6%) |
| **Resolved to an Icecat product** | **2 / 44 (4.5%)** |
| **End to end** | **2 / 225 (0.9%)** |
| Of the 2 matches, brand agreed | 2 / 2 |
| **Of the 2 matches, actually correct** | **1 / 2** |

Absent from Icecat despite being mainstream: **JBL Tune 770NC, Sony ULT WEAR,
Google Pixel 4, Google Pixel 2 XL, AUSDOM E7 / E7PRO, Laser ANC**.

### Product data quality, where a match did occur

| Measure | Result |
| --- | --- |
| Datasheets returned | 2 / 2 |
| With ≥5 specifications | 100% (mean **82** specs) |
| With official images | 100% |
| **With release date** | **0%** |

Where Icecat has a product the specification and image data is genuinely
excellent. The release date — the one thing that would have unlocked the
Product Age factor — was empty on both. Small sample; treat as unconfirmed
rather than settled.

**Verdict: rejected as the canonical product backbone. Not rejected as a
concept.** Coverage of Australian consumer electronics is too thin, and the
bulk index that would let us seed a catalogue locally was never tested because
it needs a password we do not have. **Worth one more experiment on return** —
see the checklist in `BUYWISE_ARCHITECTURE.md`.

---

## 5. UPCitemdb — **rejected**

Free trial endpoint, no key, no signup: `api.upcitemdb.com/prod/trial/lookup?upc=…`

| Measure | Result |
| --- | --- |
| GTINs tested | 12 |
| Matches | 5 (**41.7%**) |
| **Matches that were the right product** | **1 / 5 (20%)** |
| Brand agrees / conflicts / unverifiable | 1 / 3 / 1 |

The four wrong matches, all from eBay AU consumer-electronics listings:

| eBay listing | UPCitemdb returned |
| --- | --- |
| VIVO TV Cart 32–83" | *Slimbridge Loomis XXL* — **luggage** |
| VIVO Mobile TV Cart | *Tempress II Pressure Balancing Tub* — **plumbing** |
| Tall TV Cart 32–83" | *Growth Technology Palm Focus* — **plant food** |
| VIVO Mobile TV Cart | *Tints Lip And Cheek Stain* — **cosmetics** |

Fields on a successful match: name 100%, brand 100%, category 80%, but
**images 20%**, **specifications 20%**, model 20%. No structured spec table —
just loose `color` / `size` / `dimension` / `weight` strings.

Rate limiting is far tighter than the documented 100/day: an unthrottled run
lost 3 of 9 lookups to `TOO_FAST`, and spacing requests 1.5s apart made it
*worse* (15 of 21), because the quota is consumed across GitHub's shared
runner IPs. Only a 20-second backoff-and-retry produced a clean sample.

**Verdict: rejected. Precision ~20%, thin fields, and the failures are not
its fault** — see §10.

---

## 6. Go-UPC — **deferred (untested)**

`go-upc.com/api/v1/code/<gtin>`, `Authorization: Bearer <key>`. **No free API
tier** — paid plans only, max 2 requests/second. Never tested; we have no key
and did not want to report an estimate as a measurement.

**Verdict: deferred. Low priority** — the UPCitemdb failures were caused by
wrong barcodes in eBay listings, and any accurate barcode database returns the
same wrong product. A better index does not fix a bad key.

---

## 7. Amazon PA-API / Creators API — **rejected**

- **PA-API 5.0 was retired on 15 May 2026.** It rejects calls.
- Its replacement, the **Creators API**, is free but requires an approved
  Associates account with **10 qualifying referred sales in the trailing 30
  days**.

You need a working affiliate business before you get API access — a
chicken-and-egg wall for a project that hasn't launched.

**Verdict: rejected. Not available at any effort level right now.**

---

## 8. Best Buy — **deferred**

The strongest free option measured or researched. Free API key, ~5 req/s,
1M+ products, and uniquely it supplies **canonical products, full
specifications, live prices *and* real customer review text** in one API.

The blocker is geography: **US/Canada only**. BuyWise currently targets
`EBAY_AU` with AUD pricing. Adopting Best Buy means pivoting the app's market.

We were unable to confirm whether new API key registration is currently open —
`developer.bestbuy.com` is unreachable from the build environment.

**Verdict: deferred pending a decision on market. It is the only free source
that would answer the Reviews & Quality and Reliability factors.**

---

## 9. Keepa — **deferred**

The only realistic source of **price history**, which is the largest permanent
hole in the scoring model. €49/month minimum, no free tier.

**Verdict: deferred. Not needed yet** — BuyWise can accumulate its own price
history by recording every offer it observes (see `BUYWISE_ARCHITECTURE.md`).
Revisit if the product gets users and history-from-day-one matters.

---

## 10. Two failure modes worth remembering

These are the reason the architecture has the guards it does. Both were
discovered by measurement, not anticipated.

### 10.1 Seller-supplied GTINs are unreliable

A barcode in an eBay listing is typed by a seller. It is frequently a
placeholder (`Does not apply`, `N/A`), and when it *is* a real barcode it is
frequently **someone else's product's barcode**. Four of five UPCitemdb
matches resolved to unrelated goods — luggage, plumbing, plant food,
cosmetics — from valid, well-formed barcodes.

> **Rule: a GTIN may corroborate an identity that was established some other
> way. It must never establish identity by itself.**

This is enforced arithmetically in `lib/data/catalog/resolver.ts`: a GTIN
match plus a brand match plus a title match totals 70, below the 75 acceptance
threshold, so no combination lacking a part number can be accepted.

A related trap, also fixed: sellers paste the EAN into the **MPN** field. Left
unchecked, a barcode would sneak in through the one field permitted to
establish identity alone. `usableMpn` now rejects bare 8/12/13/14-digit
values. Genuine numeric part codes of exactly those lengths are lost with
them, which is the right trade — the cost is a missed match, the alternative
is a wrong one.

### 10.2 Brand + MPN agreement is *still* not sufficient

The most important single finding. From the 225-listing measurement:

```
listing:  "LG OLED 65" TV Stand Base for OLED65C3PUA"
product:  LG OLED65C3PUA  (the television)

brand:    LG          == LG           ✓
mpn:      OLED65C3PUA == OLED65C3PUA  ✓
```

A seller listed a **television stand** and put the **television's** part
number on it. Both identifiers agreed. A resolver checking only brand and MPN
would have attached a $2,000 OLED TV's specifications, images, reviews and
BuyWise score to a $50 bracket.

> **Rule: identifier agreement is necessary but not sufficient. A match must
> also survive guards that ask what is actually being sold.**

Enforced in `lib/data/catalog/resolver.ts` by an accessory guard — an
accessory lexicon (`stand`, `case`, `mount`, `replacement`, `compatible
with`, …) and a `for <model>` pattern — and pinned by
`scripts/test-resolver.mjs`. If that test ever starts passing this match,
the bug is back.

A price-band sanity check (a $50 listing for a $2,000 product) is an obvious
additional guard and is **not yet implemented** — it needs offer context the
resolver doesn't currently receive.

---

## 11. Summary

| Source | Role | Status | Deciding measurement |
| --- | --- | --- | --- |
| eBay Browse | Offers | **Accepted** | Working; but only 19.6% of listings carry brand + MPN |
| eBay Catalog | Canonical identity | **Rejected** | Limited Release; invitation + signed contracts |
| Icecat Open | Canonical identity | **Rejected as backbone** | 2/225 end to end; 1 of 2 matches wrong |
| UPCitemdb | Canonical identity | **Rejected** | 20% precision; 4 of 5 matches unrelated products |
| Go-UPC | Canonical identity | **Deferred** | Untested — no free tier, no key |
| Amazon PA-API | Products + prices | **Rejected** | Retired 15 May 2026 |
| Amazon Creators | Products + prices | **Rejected** | Requires 10 sales/30 days |
| Best Buy | Products + reviews | **Deferred** | US-only; needs a market decision |
| Keepa | Price history | **Deferred** | €49/mo; BuyWise can accumulate its own |

**The conclusion is not "these sources are bad." It is that no free source
measured so far can supply canonical product identity for Australian consumer
electronics, and that eBay's own listing data caps identification at ~20%
regardless.** The architecture is sound; the catalogue is missing.
