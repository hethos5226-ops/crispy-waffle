/**
 * Phase 0 audit — how much of eBay AU's data can actually drive Icecat enrichment?
 *
 * BuyWise can only enrich a listing when it can identify the product with
 * certainty: a GTIN, or a brand *and* an MPN. Fuzzy title matching is banned,
 * because attaching Sony's official datasheet to a listing that merely looks
 * like a Sony would be fabricating product information.
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
 * It then attempts real Icecat lookups with the identifiers it found, so the
 * end-to-end hit rate is measured, not assumed.
 *
 * Reads EBAY_CLIENT_ID / EBAY_CLIENT_SECRET / ICECAT_USERNAME from the
 * environment. Never prints them.
 */

import { productRefsFor, usableBrand, usableMpn } from "../lib/data/catalog/ref.ts";

const EBAY_OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_BROWSE_URL = "https://api.ebay.com/buy/browse/v1";
const EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope";
/**
 * Note the trailing slash and the mandatory `content` parameter — Icecat's
 * own published example is:
 *   https://live.icecat.biz/api/?content=&icecat_id=13842019&lang=en&shopname=openIcecat-json
 */
const ICECAT_URL = "https://live.icecat.biz/api/";

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
const ITEM_SAMPLE = Number(process.env.AUDIT_ITEM_SAMPLE || 40);
/** How many identified products to actually try against Icecat. */
const ICECAT_SAMPLE = Number(process.env.AUDIT_ICECAT_SAMPLE || 30);

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

/**
 * Candidate request formats.
 *
 * The first run used `UserName` + `Language` and no `content`, and every
 * lookup came back 400 — including ones with perfectly valid barcodes, which
 * is the giveaway that the request itself was malformed rather than the
 * product being absent. Icecat's own published example is:
 *
 *   live.icecat.biz/api/?content=&icecat_id=…&lang=en&shopname=openIcecat-json
 *
 * so `shopname`, `lang` and a mandatory (possibly empty) `content` are the
 * documented shape. The old form is kept as a control: this environment can't
 * reach Icecat to test, so the audit determines which works rather than
 * assuming.
 */
const ICECAT_VARIANTS = [
  {
    name: "shopname + lang + content (documented)",
    build: (ref, user) => {
      const p = new URLSearchParams({ shopname: user, lang: "en", content: "" });
      if (ref.kind === "gtin") p.set("GTIN", ref.gtin);
      else { p.set("Brand", ref.brand); p.set("ProductCode", ref.mpn); }
      return p;
    },
  },
  {
    name: "UserName + Language (first attempt, control)",
    build: (ref, user) => {
      const p = new URLSearchParams({ UserName: user, Language: "en" });
      if (ref.kind === "gtin") p.set("GTIN", ref.gtin);
      else { p.set("Brand", ref.brand); p.set("ProductCode", ref.mpn); }
      return p;
    },
  },
];

async function icecatCall(variant, ref, username) {
  const params = variant.build(ref, username);
  try {
    const res = await fetch(`${ICECAT_URL}?${params}`, { headers: { accept: "application/json" } });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* not JSON */ }
    if (!body) {
      return { ok: false, status: res.status, note: text.slice(0, 120).replace(/\s+/g, " ") };
    }
    const hit = res.ok && body.data && body.StatusCode == null;
    return {
      ok: Boolean(hit),
      status: res.status,
      body,
      note: hit ? "" : String(body.Message ?? body.msg ?? body.StatusCode ?? "").slice(0, 120),
    };
  } catch (e) {
    return { ok: false, status: 0, note: String(e && e.message).slice(0, 120) };
  }
}

/** Tries each request format against real identifiers and reports which works. */
async function probeIcecat(refs, username) {
  const rows = [];
  let best = ICECAT_VARIANTS[0];
  let bestScore = -1;

  for (const variant of ICECAT_VARIANTS) {
    let hits = 0;
    let notFound = 0;
    let malformed = 0;
    for (const ref of refs.slice(0, 4)) {
      const out = await icecatCall(variant, ref, username);
      if (out.ok) hits++;
      else if (out.status === 404) notFound++;
      else if (out.status === 400) malformed++;
      rows.push({
        variant: variant.name,
        key: ref.kind === "gtin" ? ref.gtin : `${ref.brand} / ${ref.mpn}`,
        ok: out.ok,
        status: out.status,
        note: out.note ?? "",
      });
    }
    // A hit is decisive; failing that, 404 ("no such product") still proves
    // the request was understood, whereas 400 means it was not.
    const score = hits * 100 + notFound * 10 - malformed;
    if (score > bestScore) { bestScore = score; best = variant; }
  }

  return { rows, best };
}

/** Records the shape of one real Icecat payload, so the mapper isn't written blind. */
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

  // ---- Pass 3: do those identifiers actually resolve in Icecat? ----
  const icecatUser = process.env.ICECAT_USERNAME || "";
  let icecatSection = "";
  let icecatStats = null;

  // Only refs the app itself would produce — never a title, never a guess.
  const allRefs = [];
  for (const r of items) {
    for (const ref of r.refs) {
      allRefs.push(ref);
      break; // strongest identifier per listing is enough
    }
    if (allRefs.length >= ICECAT_SAMPLE) break;
  }

  if (!icecatUser) {
    icecatSection = "### Icecat\n\n`ICECAT_USERNAME` is not set — skipped.\n";
  } else if (allRefs.length === 0) {
    icecatSection =
      "### Icecat\n\nNo listing in the sample carried a usable identifier, so there was nothing to look up.\n";
  } else {
    const { rows, best } = await probeIcecat(allRefs, icecatUser);

    const parts = [
      "### Icecat request-format probe",
      "",
      "Each candidate request shape tried against real identifiers. A 400 means the",
      "request was malformed; a 404 means it was understood but the product is absent.",
      "",
      "| Request format | Key | Found | HTTP | Note |",
      "| --- | --- | --- | --- | --- |",
      ...rows.map(
        (r) =>
          `| ${r.variant} | \`${String(r.key).slice(0, 32)}\` | ${r.ok ? "**yes**" : "no"} | ${r.status} | ${String(r.note).slice(0, 60)} |`
      ),
      "",
      `Best format: **${best.name}**`,
      "",
    ];

    // Full run using whichever format the probe found works.
    let hits = 0;
    let firstHitBody = null;
    const attempts = [];
    for (const ref of allRefs) {
      const out = await icecatCall(best, ref, icecatUser);
      if (out.ok) {
        hits++;
        if (!firstHitBody) firstHitBody = out.body;
      }
      attempts.push({
        by: ref.kind === "gtin" ? "GTIN" : "Brand+MPN",
        key: ref.kind === "gtin" ? ref.gtin : `${ref.brand} / ${ref.mpn}`,
        ok: out.ok,
        status: out.status,
        note: out.note ?? "",
      });
    }

    icecatStats = { attempted: allRefs.length, hits, format: best.name };

    parts.push(
      "### Icecat resolution",
      "",
      `Attempted **${allRefs.length}** lookups using only GTIN or Brand+MPN (no title matching).`,
      "",
      "| Result | Count | Rate |",
      "| --- | --- | --- |",
      `| Datasheet found | ${hits} / ${allRefs.length} | **${pct(hits, allRefs.length)}%** |`,
      "",
      "<details><summary>Per-lookup detail</summary>",
      "",
      "| Matched by | Key | Found | HTTP | Note |",
      "| --- | --- | --- | --- | --- |",
      ...attempts.map(
        (a) =>
          `| ${a.by} | \`${String(a.key).slice(0, 40)}\` | ${a.ok ? "yes" : "no"} | ${a.status} | ${String(a.note).slice(0, 60)} |`
      ),
      "",
      "</details>",
      ""
    );

    if (firstHitBody) {
      parts.push(
        "<details><summary>Live Icecat response shape (verifies the mapper's field paths)</summary>",
        "",
        ...describeShape(firstHitBody),
        "",
        "</details>",
        ""
      );
    }

    icecatSection = parts.join("\n");
  }


  // ---- Verdict ----
  //
  // Judged on end-to-end success, not on identifier coverage. A listing that
  // carries a barcode no catalogue recognises is not enriched, so counting it
  // as a win would overstate the result — which is exactly how the first run
  // of this audit reached "viable" while resolving zero datasheets.
  const identifiable = itemTally.enrichable / (itemTally.total || 1);
  const resolved = icecatStats && icecatStats.attempted > 0 ? icecatStats.hits / icecatStats.attempted : null;
  const effective = resolved == null ? null : identifiable * resolved;

  let viability;
  if (effective == null) {
    viability = "**Unproven.** No Icecat lookups completed, so end-to-end enrichment is untested.";
  } else if (effective >= 0.4) {
    viability = `**Viable.** About ${pct(effective, 1)}% of listings end up with a real manufacturer datasheet — enough for catalogue data to be a backbone.`;
  } else if (effective >= 0.15) {
    viability = `**Partially viable.** About ${pct(effective, 1)}% of listings resolve end to end — a useful bonus layer and a strong ranking signal, but not a backbone.`;
  } else {
    viability = `**Weak.** Only about ${pct(effective, 1)}% of listings resolve end to end. Identification is still worth keeping as a quality signal (identified vs unidentified), but not as a content source.`;
  }

  // The quota finding, which decides the feed's economics.
  const costNote =
    searchTally.enrichable === 0 && itemTally.enrichable > 0
      ? "**Search results alone cannot be enriched** — identifiers appear only on `getItem`, so enrichment costs one extra API call per listing."
      : `Search-only enrichable: **${pct(searchTally.enrichable, searchTally.total)}%**, so some enrichment is possible without a per-listing call.`;

  lines.push(
    "# eBay AU → Icecat enrichment audit",
    "",
    `Marketplace \`${MARKETPLACE}\` · category \`${CATEGORY_ID}\` · ${QUERIES.length} queries · ${new Date().toISOString()}`,
    "",
    table("Pass 1 — `item_summary/search` (1 call ≈ 50 listings)", searchTally),
    table("Pass 2 — `getItem` (1 call per listing)", itemTally),
    icecatSection,
    "## Verdict",
    "",
    viability,
    "",
    `Identifiable via \`getItem\`: **${pct(itemTally.enrichable, itemTally.total)}%** · of those, resolved by Icecat: **${resolved == null ? "n/a" : pct(resolved, 1) + "%"}**`,
    "",
    costNote,
    ""
  );
  if (searchErrors.length) {
    lines.push("### Search errors", "", ...searchErrors.map((e) => `- ${e}`), "");
  }

  await emit(lines.join("\n"), {
    marketplace: MARKETPLACE,
    generatedAt: new Date().toISOString(),
    search: searchTally,
    getItem: itemTally,
    icecat: icecatStats,
    effectiveEnrichmentRate: effective,
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
