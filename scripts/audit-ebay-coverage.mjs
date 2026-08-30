/**
 * Phase 0 audit — can any product catalogue actually enrich eBay AU listings?
 *
 * BuyWise only enriches a listing when it can identify the product with
 * certainty: a GTIN, or a brand *and* an MPN. Title matching is banned,
 * because attaching a manufacturer's datasheet to a listing that merely looks
 * like that product would be fabricating product information.
 *
 * That makes one number decisive: how often does eBay AU actually supply those
 * identifiers? This script measures it against the live API rather than
 * guessing, and separately for the two call shapes, because they cost
 * different amounts of quota:
 *
 *   search  (item_summary/search) — 1 call returns ~50 listings
 *   getItem (item/{id})           — 1 call returns 1 listing, but more fields
 *
 * If identifiers only appear on getItem, enrichment costs one extra API call
 * per card and the feed's quota maths changes completely. That is the finding
 * this script exists to produce.
 *
 * It then puts the GTINs it found to each candidate catalogue in turn, so the
 * end-to-end hit rate, the fields returned and the per-card request cost are
 * all measured rather than assumed. Icecat was measured first and resolved
 * 0 of 14 against a control that returned HTTP 200 — a real coverage gap, not
 * a broken integration.
 *
 * Reads EBAY_CLIENT_ID / EBAY_CLIENT_SECRET from the environment, plus an
 * optional GOUPC_API_KEY. Never prints them.
 */

import { productRefsFor, usableBrand, usableMpn } from "../lib/data/catalog/ref.ts";

const EBAY_OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_BROWSE_URL = "https://api.ebay.com/buy/browse/v1";
const EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope";


const MARKETPLACE = process.env.EBAY_MARKETPLACE || "EBAY_AU";
const CATEGORY_ID = process.env.EBAY_CATEGORY_ID || "293";

/** The real queries BuyWise browses with, plus a few to widen the sample. */
const QUERIES = [
  "wireless headphones",
  "noise cancelling headphones",
  "4k smart tv",
  "smartphone unlocked",
  "laptop",
  "computer monitor",
  "bluetooth speaker",
  "smart watch",
];

const SEARCH_LIMIT = Number(process.env.AUDIT_SEARCH_LIMIT || 50);
/** How many listings to re-fetch via getItem. Each is one more API call. */
const ITEM_SAMPLE = Number(process.env.AUDIT_ITEM_SAMPLE || 80);
/**
 * How many valid GTINs to try against each catalogue candidate.
 *
 * Kept small deliberately. The binding constraint is the catalogue's rate
 * limit, not eBay's quota, and a dozen clean answers say more than thirty
 * mostly-rate-limited ones.
 */
const CATALOGUE_SAMPLE = Number(process.env.AUDIT_CATALOGUE_SAMPLE || 12);

/** How long to wait out a 429 before the single retry. */
const RATE_LIMIT_BACKOFF_MS = Number(process.env.AUDIT_BACKOFF_MS || 20000);

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return v;
}

async function getToken() {
  const id = requireEnv("EBAY_CLIENT_ID");
  const secret = requireEnv("EBAY_CLIENT_SECRET");
  const res = await fetch(EBAY_OAUTH_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: EBAY_SCOPE }),
  });
  if (!res.ok) {
    console.error(`eBay OAuth failed: ${res.status}`);
    process.exit(1);
  }
  const data = await res.json();
  if (!data.access_token) {
    console.error("eBay returned no access token.");
    process.exit(1);
  }
  return data.access_token;
}

async function ebay(path, token) {
  const res = await fetch(`${EBAY_BROWSE_URL}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE,
      accept: "application/json",
    },
  });
  if (!res.ok) return { error: res.status };
  return { data: await res.json() };
}

/** Mirrors lib/data/ebay/map.ts: a dedicated field, else a matching aspect. */
function aspectValue(item, names) {
  for (const aspect of item.localizedAspects ?? []) {
    const name = aspect.localizedName?.toLowerCase();
    if (name && names.includes(name)) {
      const value = aspect.localizedValues?.[0];
      if (value) return value;
    }
  }
  return null;
}

/** Raw contents of eBay's gtin field, whatever the seller typed into it. */
function rawGtin(item) {
  const direct = Array.isArray(item.gtin) ? item.gtin[0] : item.gtin;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  return aspectValue(item, ["ean", "gtin", "upc"]);
}

/**
 * Mirrors normalizeGtin() in lib/data/ebay/map.ts.
 *
 * The first run of this audit did not do this, and reported 77.5% GTIN
 * coverage — because sellers type "Does not apply" into the barcode field and
 * the raw string was counted as a barcode. Measuring the field's *presence*
 * rather than its *validity* overstated the one number the whole integration
 * depends on.
 */
function normalizeGtin(raw) {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  if (![8, 12, 13, 14].includes(digits.length)) return null;
  if (/^0+$/.test(digits)) return null;
  return digits;
}

function extract(item) {
  const rawBrand = item.brand ?? aspectValue(item, ["brand"]) ?? null;
  const rawMpn =
    item.mpn ?? aspectValue(item, ["model", "mpn", "manufacturer part number"]) ?? null;
  const raw = rawGtin(item);
  const gtin = normalizeGtin(raw);

  // The real gate the app applies, imported rather than reimplemented.
  const brand = usableBrand(rawBrand);
  const mpn = usableMpn(rawMpn, brand);
  const refs = productRefsFor({ gtin, brand: rawBrand, model: rawMpn });

  return {
    epid: item.epid ?? null,
    rawBrand,
    rawMpn,
    rawGtin: raw,
    brand,
    mpn,
    gtin,
    refs,
    hasAspects: Array.isArray(item.localizedAspects) && item.localizedAspects.length > 0,
    itemId: item.itemId,
    title: item.title,
  };
}

function pct(n, total) {
  return total === 0 ? 0 : Math.round((n / total) * 1000) / 10;
}

function tally(records) {
  const t = {
    total: records.length,
    epid: 0,
    rawBrand: 0, brand: 0,
    rawMpn: 0, mpn: 0,
    rawGtin: 0, gtin: 0,
    brandAndMpn: 0,
    aspects: 0,
    enrichable: 0, // what productRefsFor() actually permits
  };
  for (const r of records) {
    if (r.epid) t.epid++;
    if (r.rawBrand) t.rawBrand++;
    if (r.brand) t.brand++;
    if (r.rawMpn) t.rawMpn++;
    if (r.mpn) t.mpn++;
    if (r.rawGtin) t.rawGtin++;
    if (r.gtin) t.gtin++;
    if (r.hasAspects) t.aspects++;
    if (r.brand && r.mpn) t.brandAndMpn++;
    if (r.refs.length > 0) t.enrichable++;
  }
  return t;
}

/**
 * Two columns per identifier: how often eBay sends the field at all, and how
 * often what it sends is actually an identifier. The gap between them is the
 * seller-typed junk ("Does not apply", "N/A", a whole title in the MPN box)
 * that BuyWise must refuse to match on.
 */
function table(label, t) {
  const row = (name, raw, valid) =>
    `| ${name} | ${raw == null ? "—" : `${pct(raw, t.total)}%`} | **${pct(valid, t.total)}%** | ${valid} / ${t.total} |`;
  return [
    `### ${label}`,
    "",
    `Sample size: **${t.total}** listings`,
    "",
    "| Field | Field present | Actually usable | Count |",
    "| --- | --- | --- | --- |",
    row("ePID (catalog product id)", null, t.epid),
    row("Brand", t.rawBrand, t.brand),
    row("MPN / model", t.rawMpn, t.mpn),
    row("GTIN / EAN / UPC", t.rawGtin, t.gtin),
    row("localizedAspects present", null, t.aspects),
    row("**Brand + MPN** (Icecat-matchable)", null, t.brandAndMpn),
    row("**Enrichable** (GTIN or Brand+MPN)", null, t.enrichable),
    "",
  ].join("\n");
}

/* ------------------------------------------------------------------ *
 * Catalogue candidates
 * ------------------------------------------------------------------ */

/**
 * GTIN-only. There is deliberately no name or title lookup here: matching a
 * datasheet to a listing by wording would attach one product's specifications
 * to another, which is the failure mode the whole identifier gate exists to
 * prevent. A barcode either resolves or it doesn't.
 *
 * Icecat was measured first and resolved 0 of 14 real eBay AU identifiers
 * against a control that returned HTTP 200 — a genuine coverage gap, not a
 * broken integration. These two are the follow-up candidates.
 */

/** Normalises a source's response into the fields BuyWise would actually use. */
function emptyProduct() {
  return { name: null, brand: null, model: null, images: [], specs: 0, category: null, description: null };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CATALOGUE_CANDIDATES = [
  {
    id: "upcitemdb",
    // The trial endpoint enforces a burst limit as well as the daily cap and
    // answers TOO_FAST (429) when it is exceeded. An unthrottled first run
    // lost 3 of 9 lookups that way, which would have been miscounted as
    // misses rather than as unknowns.
    throttleMs: 4000,
    label: "UPCitemdb (free trial tier)",
    keyEnv: null,
    limits:
      "100 lookups/day per IP. No signup and no key on the trial endpoint; the keyed plan raises the cap. Returns HTTP 429 once exhausted.",
    async lookup(gtin) {
      const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(gtin)}`, {
        headers: { accept: "application/json" },
      });
      const text = await res.text();
      let body = null;
      try { body = JSON.parse(text); } catch { /* not JSON */ }
      if (!body) return { ok: false, status: res.status, note: text.slice(0, 100).replace(/\s+/g, " "), product: emptyProduct() };

      const item = Array.isArray(body.items) && body.items.length ? body.items[0] : null;
      if (!item) {
        return { ok: false, status: res.status, note: String(body.code ?? body.message ?? "no items").slice(0, 80), product: emptyProduct(), raw: body };
      }
      return {
        ok: true,
        status: res.status,
        raw: body,
        product: {
          name: item.title?.trim() || null,
          brand: item.brand?.trim() || null,
          model: item.model?.trim() || null,
          images: Array.isArray(item.images) ? item.images.filter(Boolean) : [],
          // UPCitemdb has no structured spec table; count the loose attributes.
          specs: ["color", "size", "dimension", "weight"].filter((k) => item[k]).length,
          category: item.category?.trim() || null,
          description: item.description?.trim() || null,
        },
      };
    },
  },
  {
    id: "go-upc",
    label: "Go-UPC",
    throttleMs: 600, // documented cap: 2 requests/second

    keyEnv: "GOUPC_API_KEY",
    limits:
      "No documented free API tier — paid plans only, max 2 requests/second. Untestable without a key.",
    async lookup(gtin, key) {
      const res = await fetch(`https://go-upc.com/api/v1/code/${encodeURIComponent(gtin)}`, {
        headers: { accept: "application/json", authorization: `Bearer ${key}` },
      });
      const text = await res.text();
      let body = null;
      try { body = JSON.parse(text); } catch { /* not JSON */ }
      if (!body) return { ok: false, status: res.status, note: text.slice(0, 100).replace(/\s+/g, " "), product: emptyProduct() };

      const prod = body.product;
      if (!prod) {
        return { ok: false, status: res.status, note: String(body.error ?? body.message ?? "no product").slice(0, 80), product: emptyProduct(), raw: body };
      }
      // Go-UPC ships specs as [[name, value], …].
      const specs = Array.isArray(prod.specs) ? prod.specs.length : 0;
      return {
        ok: true,
        status: res.status,
        raw: body,
        product: {
          name: prod.name?.trim() || null,
          brand: prod.brand?.trim() || null,
          model: null, // not a documented field
          images: prod.imageUrl ? [prod.imageUrl] : [],
          specs,
          category: prod.category?.trim() || null,
          description: prod.description?.trim() || null,
        },
      };
    },
  },
];

/** Loose token compare, used only to check a returned brand against eBay's. */
function norm(v) {
  return String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Can the returned product be trusted as *this* listing's product?
 *
 * The GTIN already guarantees identity, so this is a cross-check rather than
 * the match itself: if the catalogue's brand contradicts the brand eBay's
 * seller stated, something is wrong with one of them and the match shouldn't
 * be shown. Comparing brands is safe; comparing titles would not be, which is
 * why titles are never used here.
 */
function brandAgreement(catalogueBrand, ebayBrand) {
  const a = norm(catalogueBrand);
  const b = norm(ebayBrand);
  if (!a || !b) return "unverifiable";
  if (a === b || a.includes(b) || b.includes(a)) return "agrees";
  return "conflicts";
}

/**
 * One lookup, retried once through a 429.
 *
 * UPCitemdb's trial endpoint answers TOO_FAST well before its documented
 * daily cap — on GitHub's shared runner IPs the quota appears to be consumed
 * by other callers too, so spacing requests alone does not avoid it. A single
 * backoff turns most of those unknowns into real answers; whatever still
 * comes back 429 is reported as an unknown rather than counted as a miss.
 */
async function lookupWithBackoff(candidate, gtin, key) {
  let out;
  try {
    out = await candidate.lookup(gtin, key);
  } catch (e) {
    return { ok: false, status: 0, note: String(e && e.message).slice(0, 80), product: emptyProduct() };
  }
  if (out.status !== 429) return out;

  await sleep(RATE_LIMIT_BACKOFF_MS);
  try {
    return await candidate.lookup(gtin, key);
  } catch (e) {
    return { ok: false, status: 0, note: String(e && e.message).slice(0, 80), product: emptyProduct() };
  }
}

async function probeCatalogue(candidate, refs, ebayByGtin) {
  const key = candidate.keyEnv ? process.env[candidate.keyEnv] : null;
  if (candidate.keyEnv && !key) {
    return { skipped: `\`${candidate.keyEnv}\` is not set — ${candidate.label} could not be tested.` };
  }

  const rows = [];
  let hits = 0;
  let rateLimited = 0;
  const fieldCounts = { name: 0, brand: 0, model: 0, images: 0, specs: 0, category: 0, description: 0 };
  const agreement = { agrees: 0, conflicts: 0, unverifiable: 0 };
  let sample = null;

  for (const [index, ref] of refs.entries()) {
    if (index > 0 && candidate.throttleMs) await sleep(candidate.throttleMs);
    const out = await lookupWithBackoff(candidate, ref.gtin, key);
    if (out.status === 429) rateLimited++;

    let agree = "unverifiable";
    if (out.ok) {
      hits++;
      const p = out.product;
      if (p.name) fieldCounts.name++;
      if (p.brand) fieldCounts.brand++;
      if (p.model) fieldCounts.model++;
      if (p.images.length) fieldCounts.images++;
      if (p.specs > 0) fieldCounts.specs++;
      if (p.category) fieldCounts.category++;
      if (p.description) fieldCounts.description++;
      agree = brandAgreement(p.brand, ebayByGtin.get(ref.gtin)?.rawBrand);
      agreement[agree]++;
      if (!sample) sample = out.raw;
    }

    rows.push({
      gtin: ref.gtin,
      ok: out.ok,
      status: out.status,
      name: out.product.name,
      brand: out.product.brand,
      // eBay's own title, so a barcode that resolves to an unrelated product
      // is visible rather than counted as a clean match.
      ebayTitle: ebayByGtin.get(ref.gtin)?.title ?? "",
      agree: out.ok ? agree : "",
      note: out.ok ? "" : String(out.note ?? "").slice(0, 50),
    });
  }

  return { rows, hits, attempted: refs.length, fieldCounts, agreement, rateLimited, sample };
}

/** Records a real response shape, so a mapper is never written blind. */
function describeShape(body, depth = 0, prefix = "") {
  if (depth > 2 || body == null || typeof body !== "object") return [];
  const out = [];
  for (const key of Object.keys(body).slice(0, 24)) {
    const v = body[key];
    const path = prefix ? `${prefix}.${key}` : key;
    const kind = Array.isArray(v) ? `array[${v.length}]` : typeof v;
    out.push(`${"  ".repeat(depth)}- \`${path}\` — ${kind}`);
    if (!Array.isArray(v) && typeof v === "object" && v !== null) {
      out.push(...describeShape(v, depth + 1, path));
    } else if (Array.isArray(v) && v.length && typeof v[0] === "object") {
      out.push(...describeShape(v[0], depth + 1, `${path}[0]`));
    }
  }
  return out;
}

async function main() {
  const lines = [];
  const token = await getToken();

  // ---- Pass 1: what search results alone give us ----
  const summaries = [];
  const searchErrors = [];
  for (const q of QUERIES) {
    const params = new URLSearchParams({
      q,
      limit: String(SEARCH_LIMIT),
      fieldgroups: "EXTENDED",
      category_ids: CATEGORY_ID,
    });
    const { data, error } = await ebay(`/item_summary/search?${params}`, token);
    if (error) {
      searchErrors.push(`${q} → HTTP ${error}`);
      continue;
    }
    for (const item of data.itemSummaries ?? []) {
      summaries.push({ ...extract(item), itemId: item.itemId, title: item.title });
    }
  }

  if (summaries.length === 0) {
    console.error("No listings returned — cannot audit.");
    lines.push("## Audit failed", "", "eBay returned no listings for any query.", "");
    if (searchErrors.length) lines.push("Errors:", ...searchErrors.map((e) => `- ${e}`));
    await emit(lines.join("\n"), null);
    process.exit(1);
  }

  const searchTally = tally(summaries);

  // ---- Pass 2: what getItem adds, on an evenly-spread sample ----
  const step = Math.max(1, Math.floor(summaries.length / ITEM_SAMPLE));
  const sample = summaries.filter((_, i) => i % step === 0).slice(0, ITEM_SAMPLE);
  const items = [];
  for (const s of sample) {
    if (!s.itemId) continue;
    const { data, error } = await ebay(`/item/${encodeURIComponent(s.itemId)}`, token);
    if (error || !data) continue;
    items.push({ ...extract(data), itemId: data.itemId, title: data.title });
  }
  const itemTally = tally(items);

  // ---- Pass 3: which catalogue can resolve those GTINs? ----
  //
  // GTIN only, per the identifier rule. Brand+MPN is not used here because
  // neither candidate indexes by part number.
  const gtinRefs = [];
  const ebayByGtin = new Map();
  for (const r of items) {
    if (!r.gtin || ebayByGtin.has(r.gtin)) continue;
    ebayByGtin.set(r.gtin, r);
    gtinRefs.push({ gtin: r.gtin });
    if (gtinRefs.length >= CATALOGUE_SAMPLE) break;
  }

  const catalogueParts = ["## Catalogue candidates", ""];
  const catalogueStats = {};

  if (gtinRefs.length === 0) {
    catalogueParts.push("No listing in the sample carried a valid GTIN, so there was nothing to test.", "");
  } else {
    catalogueParts.push(
      `Tested against the **${gtinRefs.length} valid GTINs** found in the \`getItem\` sample. `
        + "Every lookup is by barcode alone — no titles, no keywords.",
      ""
    );

    for (const candidate of CATALOGUE_CANDIDATES) {
      const result = await probeCatalogue(candidate, gtinRefs, ebayByGtin);
      catalogueParts.push(`### ${candidate.label}`, "");

      if (result.skipped) {
        catalogueParts.push(`**Not tested.** ${result.skipped}`, "", `Limits: ${candidate.limits}`, "");
        catalogueStats[candidate.id] = { tested: false };
        continue;
      }

      const { rows, hits, attempted, fieldCounts, agreement, rateLimited, sample } = result;
      catalogueStats[candidate.id] = { tested: true, attempted, hits, rateLimited, fieldCounts, agreement };

      catalogueParts.push(
        "| Measure | Value |",
        "| --- | --- |",
        `| GTINs tested | ${attempted} |`,
        `| Successful matches | ${hits} |`,
        `| **Match rate** | **${pct(hits, attempted)}%** |`,
        `| Free-tier limits | ${candidate.limits} |`,
        ""
      );
      if (rateLimited > 0) {
        catalogueParts.push(
          `> **${rateLimited} of ${attempted} lookups were rate limited (HTTP 429)** — those are unknowns, not misses, so the match rate above is a floor rather than a measurement.`,
          ""
        );
      }

      if (hits > 0) {
        catalogueParts.push(
          "**Fields returned**, as a share of successful matches:",
          "",
          "| Field | Present |",
          "| --- | --- |",
          `| Product name | ${pct(fieldCounts.name, hits)}% |`,
          `| Brand | ${pct(fieldCounts.brand, hits)}% |`,
          `| Model / part number | ${pct(fieldCounts.model, hits)}% |`,
          `| Image(s) | ${pct(fieldCounts.images, hits)}% |`,
          `| Specifications | ${pct(fieldCounts.specs, hits)}% |`,
          `| Category | ${pct(fieldCounts.category, hits)}% |`,
          `| Description | ${pct(fieldCounts.description, hits)}% |`,
          "",
          "**Confidence that the returned product is this listing's product** — the GTIN",
          "already establishes identity, so this cross-checks the catalogue's brand against",
          "the brand eBay's seller stated:",
          "",
          "| Cross-check | Count |",
          "| --- | --- |",
          `| Brand agrees | ${agreement.agrees} / ${hits} |`,
          `| Brand conflicts | ${agreement.conflicts} / ${hits} |`,
          `| Can't verify (one side blank) | ${agreement.unverifiable} / ${hits} |`,
          ""
        );
      }

      catalogueParts.push(
        "<details><summary>Per-GTIN detail</summary>",
        "",
        "| GTIN | Found | HTTP | eBay listing says | Catalogue says | Brand | Cross-check | Note |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
        ...rows.map(
          (r) =>
            `| \`${r.gtin}\` | ${r.ok ? "**yes**" : "no"} | ${r.status} | ${String(r.ebayTitle).slice(0, 40)} | ${(r.name ?? "").slice(0, 40)} | ${r.brand ?? ""} | ${r.agree} | ${r.note} |`
        ),
        "",
        "</details>",
        ""
      );

      if (sample) {
        catalogueParts.push(
          "<details><summary>Live response shape</summary>",
          "",
          ...describeShape(sample),
          "",
          "</details>",
          ""
        );
      }
    }
  }

  const catalogueSection = catalogueParts.join("\n");


  // ---- Verdict ----
  //
  // Judged end to end, not on identifier coverage. A listing carrying a
  // barcode no catalogue recognises is not enriched, so counting it as a win
  // overstates the result — which is how an earlier version of this audit
  // reached "viable" while resolving zero datasheets.
  const gtinRate = itemTally.gtin / (itemTally.total || 1);

  const verdictRows = [];
  let bestSource = null;
  for (const candidate of CATALOGUE_CANDIDATES) {
    const st = catalogueStats[candidate.id];
    if (!st || !st.tested) {
      verdictRows.push(`| ${candidate.label} | not tested | — |`);
      continue;
    }
    const matchRate = st.attempted ? st.hits / st.attempted : 0;
    const endToEnd = gtinRate * matchRate;
    verdictRows.push(
      `| ${candidate.label} | ${pct(matchRate, 1)}% of GTINs | **${pct(endToEnd, 1)}% of listings** |`
    );
    if (!bestSource || endToEnd > bestSource.endToEnd) {
      bestSource = { label: candidate.label, matchRate, endToEnd };
    }
  }

  let viability;
  if (!bestSource) {
    viability = "**Unproven.** No catalogue could be tested in this run.";
  } else if (bestSource.endToEnd >= 0.3) {
    viability = `**Viable.** ${bestSource.label} enriches about ${pct(bestSource.endToEnd, 1)}% of listings end to end — enough to carry real product content.`;
  } else if (bestSource.endToEnd >= 0.12) {
    viability = `**Partially viable.** ${bestSource.label} enriches about ${pct(bestSource.endToEnd, 1)}% of listings end to end — a useful bonus layer and a ranking signal, but not a backbone.`;
  } else {
    viability = `**Weak.** The best source (${bestSource.label}) enriches only about ${pct(bestSource.endToEnd, 1)}% of listings end to end. Drop catalogue enrichment and keep identification as a ranking signal.`;
  }

  // Request cost per feed card, which decides the feed's economics.
  const costNote =
    searchTally.enrichable === 0
      ? [
          "**Request cost per feed card**",
          "",
          "Identifiers appear only on `getItem`, never in search results, so enrichment costs:",
          "",
          "| Step | Calls per card |",
          "| --- | --- |",
          "| Search (amortised over ~" + SEARCH_LIMIT + " listings) | ~0.02 |",
          "| `getItem` — the only source of GTIN | **1** |",
          "| Catalogue lookup | **1** |",
          "| **Total additional vs. search alone** | **2** |",
          "",
          "That is a 100× increase in eBay calls per card versus browsing search",
          "results alone, before the catalogue's own quota is counted.",
          "",
        ]
      : ["Search results carry usable identifiers, so enrichment needs no extra `getItem` call.", ""];

  lines.push(
    "# eBay AU catalogue-enrichment audit",
    "",
    `Marketplace \`${MARKETPLACE}\` · category \`${CATEGORY_ID}\` · ${QUERIES.length} queries · ${new Date().toISOString()}`,
    "",
    table("Pass 1 — `item_summary/search` (1 call ≈ 50 listings)", searchTally),
    table("Pass 2 — `getItem` (1 call per listing)", itemTally),
    catalogueSection,
    "## Verdict",
    "",
    viability,
    "",
    `Listings carrying a valid GTIN: **${pct(itemTally.gtin, itemTally.total)}%** (via \`getItem\`)`,
    "",
    "| Source | GTIN match rate | End-to-end enrichment |",
    "| --- | --- | --- |",
    ...verdictRows,
    "",
    ...costNote
  );
  if (searchErrors.length) {
    lines.push("### Search errors", "", ...searchErrors.map((e) => `- ${e}`), "");
  }

  await emit(lines.join("\n"), {
    marketplace: MARKETPLACE,
    generatedAt: new Date().toISOString(),
    search: searchTally,
    getItem: itemTally,
    catalogues: catalogueStats,
    gtinRate,
  });
}

async function emit(markdown, json) {
  console.log(markdown);
  const { appendFileSync, writeFileSync } = await import("node:fs");
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + "\n");
  }
  if (json) writeFileSync("audit-results.json", JSON.stringify(json, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
