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

const EBAY_OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_BROWSE_URL = "https://api.ebay.com/buy/browse/v1";
const EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope";
const ICECAT_URL = "https://live.icecat.biz/api";

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

function firstGtin(item) {
  // getItem exposes gtin; some payloads carry an array of identifiers instead.
  if (typeof item.gtin === "string" && item.gtin.trim()) return item.gtin.trim();
  if (Array.isArray(item.gtin) && item.gtin.length) return String(item.gtin[0]);
  const ean = aspectValue(item, ["ean", "gtin", "upc"]);
  return ean && /^\d{8,14}$/.test(ean.replace(/\s/g, "")) ? ean.replace(/\s/g, "") : null;
}

function extract(item) {
  const brand = item.brand ?? aspectValue(item, ["brand"]);
  const mpn =
    item.mpn ?? aspectValue(item, ["model", "mpn", "manufacturer part number"]);
  return {
    epid: item.epid ?? null,
    brand: brand || null,
    mpn: mpn || null,
    gtin: firstGtin(item),
    hasAspects: Array.isArray(item.localizedAspects) && item.localizedAspects.length > 0,
  };
}

function pct(n, total) {
  return total === 0 ? 0 : Math.round((n / total) * 1000) / 10;
}

function tally(records) {
  const t = {
    total: records.length,
    epid: 0,
    brand: 0,
    mpn: 0,
    gtin: 0,
    brandAndMpn: 0,
    aspects: 0,
    enrichable: 0, // gtin OR (brand AND mpn) — the only matches BuyWise permits
  };
  for (const r of records) {
    if (r.epid) t.epid++;
    if (r.brand) t.brand++;
    if (r.mpn) t.mpn++;
    if (r.gtin) t.gtin++;
    if (r.hasAspects) t.aspects++;
    const bm = Boolean(r.brand && r.mpn);
    if (bm) t.brandAndMpn++;
    if (r.gtin || bm) t.enrichable++;
  }
  return t;
}

function table(label, t) {
  const row = (name, n) => `| ${name} | ${n} / ${t.total} | **${pct(n, t.total)}%** |`;
  return [
    `### ${label}`,
    "",
    `Sample size: **${t.total}** listings`,
    "",
    "| Field | Present | Coverage |",
    "| --- | --- | --- |",
    row("ePID (catalog product id)", t.epid),
    row("Brand", t.brand),
    row("MPN / model", t.mpn),
    row("GTIN / EAN / UPC", t.gtin),
    row("localizedAspects present", t.aspects),
    row("**Brand + MPN** (Icecat-matchable)", t.brandAndMpn),
    row("**Enrichable** (GTIN or Brand+MPN)", t.enrichable),
    "",
  ].join("\n");
}

async function icecatLookup(ref, username) {
  const params = new URLSearchParams({ UserName: username, Language: "en" });
  if (ref.gtin) params.set("GTIN", ref.gtin);
  else {
    params.set("Brand", ref.brand);
    params.set("ProductCode", ref.mpn);
  }
  try {
    const res = await fetch(`${ICECAT_URL}?${params}`, { headers: { accept: "application/json" } });
    const text = await res.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, status: res.status, note: "non-JSON response" };
    }
    const hit = res.ok && body && body.data && !body.StatusCode;
    return { ok: Boolean(hit), status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, note: String(e && e.message) };
  }
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
  if (!icecatUser) {
    icecatSection = "### Icecat\n\n`ICECAT_USERNAME` is not set — skipped.\n";
  } else {
    const refs = [];
    for (const r of items) {
      if (r.gtin) refs.push({ gtin: r.gtin, title: r.title });
      else if (r.brand && r.mpn) refs.push({ brand: r.brand, mpn: r.mpn, title: r.title });
      if (refs.length >= ICECAT_SAMPLE) break;
    }

    let hits = 0;
    let firstHitBody = null;
    const attempts = [];
    for (const ref of refs) {
      const out = await icecatLookup(ref, icecatUser);
      if (out.ok) {
        hits++;
        if (!firstHitBody) firstHitBody = out.body;
      }
      attempts.push({
        by: ref.gtin ? "GTIN" : "Brand+MPN",
        key: ref.gtin ?? `${ref.brand} / ${ref.mpn}`,
        ok: out.ok,
        status: out.status,
      });
    }

    icecatStats = { attempted: refs.length, hits };
    const parts = [
      "### Icecat resolution",
      "",
      `Attempted **${refs.length}** lookups using only GTIN or Brand+MPN (no title matching).`,
      "",
      `| Result | Count | Rate |`,
      `| --- | --- | --- |`,
      `| Datasheet found | ${hits} / ${refs.length} | **${pct(hits, refs.length)}%** |`,
      "",
    ];
    if (attempts.length) {
      parts.push("<details><summary>Per-lookup detail</summary>", "");
      parts.push("| Matched by | Key | Found | HTTP |", "| --- | --- | --- | --- |");
      for (const a of attempts) {
        parts.push(`| ${a.by} | \`${String(a.key).slice(0, 48)}\` | ${a.ok ? "yes" : "no"} | ${a.status} |`);
      }
      parts.push("", "</details>", "");
    }
    if (firstHitBody) {
      parts.push(
        "<details><summary>Live Icecat response shape (for the mapper)</summary>",
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
  const best = Math.max(searchTally.enrichable / (searchTally.total || 1), itemTally.enrichable / (itemTally.total || 1));
  const viability =
    best >= 0.5
      ? "**Viable.** Enough listings carry hard identifiers to make catalogue enrichment worthwhile."
      : best >= 0.25
        ? "**Partially viable.** Enrichment will land on a minority of listings — useful as a bonus layer and as a ranking signal, but it cannot be the backbone."
        : "**Weak.** Too few listings carry hard identifiers. Enrichment is best used as a quality signal (identified vs unidentified) rather than a content source.";

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
    `Search-only enrichable: **${pct(searchTally.enrichable, searchTally.total)}%** · getItem enrichable: **${pct(itemTally.enrichable, itemTally.total)}%**`,
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
