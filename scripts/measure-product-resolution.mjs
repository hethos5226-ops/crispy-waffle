/**
 * Can BuyWise start from a real canonical product and use eBay to find offers?
 *
 * That is the single question this script answers, with measurements rather
 * than estimates. It is the go/no-go for the product-first architecture.
 *
 * The method, in order:
 *
 *   A. Download the Open Icecat index (the canonical product table).
 *   B. Resolve its Supplier_id / Catid codes to brand and category names.
 *   C. Filter to the consumer electronics BuyWise covers, and measure the
 *      size of the static asset that would ship with the app.
 *   D. Sample real eBay AU listings per category, via getItem — identifiers
 *      are not present in search results.
 *   E. Resolve those listings against the index under the strict rules:
 *      genuine brand + MPN only, GTIN never identity on its own, a barcode in
 *      the MPN field rejected, title never sufficient.
 *   F. For matched products, fetch the datasheet and measure whether the
 *      product-level data BuyWise needs is actually there.
 *
 * Every endpoint here is probed rather than assumed. An earlier audit in this
 * repo reported a working integration that was in fact malformed, so anything
 * uncertain is reported as what it returned, not as what it should return.
 *
 * Reads EBAY_CLIENT_ID / EBAY_CLIENT_SECRET / ICECAT_USERNAME, plus an
 * optional ICECAT_PASSWORD. Never prints them.
 */

import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { createInterface } from "node:readline";
import { writeFileSync, appendFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

import { usableBrand, usableMpn } from "../lib/data/catalog/ref.ts";

const EBAY_OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_BROWSE_URL = "https://api.ebay.com/buy/browse/v1";
const EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope";
const ICECAT_LIVE = "https://live.icecat.biz/api/";

const MARKETPLACE = process.env.EBAY_MARKETPLACE || "EBAY_AU";
const SEARCH_LIMIT = Number(process.env.MEASURE_SEARCH_LIMIT || 50);
const PER_CATEGORY_ITEMS = Number(process.env.MEASURE_ITEMS_PER_CATEGORY || 25);
const DATASHEET_SAMPLE = Number(process.env.MEASURE_DATASHEET_SAMPLE || 25);

/** The categories BuyWise covers, each with the eBay searches that populate it. */
const CATEGORIES = [
  { id: "phones",     label: "Phones",     queries: ["smartphone unlocked", "iphone", "samsung galaxy phone"] },
  { id: "tvs",        label: "TVs",        queries: ["4k smart tv", "oled tv", "led television"] },
  { id: "headphones", label: "Headphones", queries: ["noise cancelling headphones", "wireless earbuds", "over ear headphones"] },
  { id: "laptops",    label: "Laptops",    queries: ["laptop", "notebook computer", "gaming laptop"] },
  { id: "monitors",   label: "Monitors",   queries: ["computer monitor", "gaming monitor", "4k monitor"] },
  { id: "cameras",    label: "Cameras",    queries: ["digital camera", "mirrorless camera", "dslr camera"] },
  { id: "tablets",    label: "Tablets",    queries: ["tablet android", "ipad"] },
  { id: "audio",      label: "Speakers",   queries: ["bluetooth speaker", "soundbar"] },
  { id: "wearables",  label: "Wearables",  queries: ["smart watch", "fitness tracker"] },
];

/**
 * Icecat category names BuyWise keeps. Matched case-insensitively as
 * substrings against the English category name, then reported so the mapping
 * can be checked rather than trusted.
 */
const CATEGORY_KEYWORDS = [
  "smartphone", "mobile phone", "cellphone",
  "television", "tv",
  "headphone", "headset", "earphone", "earbud",
  "notebook", "laptop",
  "monitor",
  "camera",
  "tablet",
  "speaker", "soundbar",
  "smartwatch", "watch", "activity tracker",
];

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const out = [];
function say(...lines) {
  for (const l of lines) out.push(l);
}
function pct(n, d) {
  return d === 0 ? "—" : `${Math.round((n / d) * 1000) / 10}%`;
}
function bytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Normalised part-code form used for index keys and comparison. */
function normMpn(v) {
  return String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function normBrand(v) {
  return String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/* ------------------------------------------------------------------ *
 * A. Acquire the Icecat index
 * ------------------------------------------------------------------ */

const ICECAT_USER = process.env.ICECAT_USERNAME || "";
const ICECAT_PASS = process.env.ICECAT_PASSWORD || "";

function authHeaders() {
  if (!ICECAT_USER) return {};
  const basic = Buffer.from(`${ICECAT_USER}:${ICECAT_PASS}`).toString("base64");
  return { authorization: `Basic ${basic}` };
}

/** Index and reference files, most useful first. Each is probed in turn. */
const INDEX_CANDIDATES = [
  "https://data.icecat.biz/export/freexml.int/INT/files.index.csv",
  "https://data.icecat.biz/export/freexml.int/EN/files.index.csv",
  "https://data.icecat.biz/export/freexml.int/EN/files.index.xml.gz",
  "https://data.icecat.biz/export/freexml/EN/files.index.xml.gz",
  "https://data.icecat.biz/export/freexml.int/EN/daily.index.xml",
];
const SUPPLIERS_URL = "https://data.icecat.biz/export/freexml/refs/SuppliersList.xml.gz";
const CATEGORIES_URL = "https://data.icecat.biz/export/freexml/refs/CategoriesList.xml.gz";

async function probe(url) {
  try {
    const res = await fetch(url, { headers: { ...authHeaders(), accept: "*/*" } });
    return { url, status: res.status, ok: res.ok, res, length: res.headers.get("content-length") };
  } catch (e) {
    return { url, status: 0, ok: false, note: String(e && e.message).slice(0, 120) };
  }
}

/** Streams a possibly-gzipped response line by line. */
async function* lines(res, url) {
  let stream = Readable.fromWeb(res.body);
  if (url.endsWith(".gz")) stream = stream.pipe(createGunzip());
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) yield line;
}

/** Reference lists map numeric ids to names. Both are XML attribute rows. */
async function loadRefs(url, idAttr, nameAttrs) {
  const p = await probe(url);
  if (!p.ok) return { map: new Map(), status: p.status };
  const map = new Map();
  let raw = 0;
  try {
    for await (const line of lines(p.res, url)) {
      raw++;
      const id = line.match(new RegExp(`${idAttr}="([^"]+)"`))?.[1];
      if (!id) continue;
      let name = null;
      for (const attr of nameAttrs) {
        const m = line.match(new RegExp(`${attr}="([^"]*)"`));
        if (m && m[1]) { name = m[1]; break; }
      }
      if (name) map.set(id, name);
    }
  } catch (e) {
    return { map, status: p.status, note: String(e && e.message).slice(0, 120) };
  }
  return { map, status: p.status, raw };
}

/* ------------------------------------------------------------------ *
 * eBay
 * ------------------------------------------------------------------ */

async function ebayToken() {
  const id = process.env.EBAY_CLIENT_ID;
  const secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Missing eBay credentials");
  const res = await fetch(EBAY_OAUTH_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: EBAY_SCOPE }),
  });
  if (!res.ok) throw new Error(`eBay OAuth ${res.status}`);
  return (await res.json()).access_token;
}

async function ebay(path, token) {
  const res = await fetch(`${EBAY_BROWSE_URL}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE,
      accept: "application/json",
    },
  });
  if (!res.ok) return null;
  return res.json();
}

function aspect(item, names) {
  for (const a of item.localizedAspects ?? []) {
    const n = a.localizedName?.toLowerCase();
    if (n && names.includes(n)) {
      const v = a.localizedValues?.[0];
      if (v) return v;
    }
  }
  return null;
}

/** Applies the app's own gate, so measurement and behaviour cannot diverge. */
function identify(item) {
  const rawBrand = item.brand ?? aspect(item, ["brand"]) ?? null;
  const rawMpn =
    item.mpn ??
    aspect(item, ["mpn", "manufacturer part number", "model", "model number"]) ??
    null;
  const brand = usableBrand(rawBrand);
  const mpn = usableMpn(rawMpn, brand);
  const gtinRaw = Array.isArray(item.gtin) ? item.gtin[0] : item.gtin;
  const gtinDigits = String(gtinRaw ?? "").replace(/[\s-]/g, "");
  const gtin = /^\d{8,14}$/.test(gtinDigits) && !/^0+$/.test(gtinDigits) ? gtinDigits : null;
  return { rawBrand, rawMpn, brand, mpn, gtin, title: item.title ?? "", epid: item.epid ?? null };
}

/**
 * Resolves brand + MPN through Icecat's live JSON API.
 *
 * Used when the bulk index is unavailable. Same identity rule as the local
 * index path — brand and part code together, never a barcode — but one HTTP
 * request per listing rather than a hash lookup. Returns the datasheet too,
 * so product-level coverage can be measured without fetching twice.
 */
async function resolveLive(brand, mpn) {
  const params = new URLSearchParams({
    shopname: ICECAT_USER, lang: "en", content: "", Brand: brand, ProductCode: mpn,
  });
  let body = null;
  let status = 0;
  try {
    const res = await fetch(`${ICECAT_LIVE}?${params}`, { headers: { accept: "application/json" } });
    status = res.status;
    body = await res.json();
  } catch {
    return { hit: null, status };
  }
  if (!body || body.StatusCode != null || !body.data) return { hit: null, status };
  const gi = body.data.GeneralInfo ?? {};
  const icecatId = gi.IcecatId != null ? String(gi.IcecatId) : null;
  if (!icecatId) return { hit: null, status };
  return {
    status,
    body,
    hit: {
      p: icecatId,
      b: gi.Brand || gi.BrandInfo?.BrandName || brand,
      m: gi.BrandPartCode || gi.ProductCode || mpn,
      n: gi.ProductName || gi.Title || null,
      c: null,
      k: 1,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function main() {
  say("# Can BuyWise start from a canonical product?", "");
  say(`Marketplace \`${MARKETPLACE}\` · ${new Date().toISOString()}`, "");

  /* ---- A. Index acquisition ---- */
  say("## A. Icecat index acquisition", "");
  say("| Candidate | HTTP | Content-Length |", "| --- | --- | --- |");
  let index = null;
  for (const url of INDEX_CANDIDATES) {
    const p = await probe(url);
    say(`| \`${url.replace("https://data.icecat.biz/export/", "…/")}\` | ${p.status} | ${p.length ? bytes(Number(p.length)) : "—"} |`);
    if (p.ok && !index) index = p;
    else if (p.res) try { await p.res.body?.cancel(); } catch { /* ignore */ }
  }
  say("");
  if (!index) {
    say(
      "**No index could be downloaded.** Open Icecat's bulk index is HTTP Basic and",
      "needs a password; the JSON product API accepts the username alone, which is why",
      "product lookups work while the index does not. Add an `ICECAT_PASSWORD` secret",
      "to measure the static asset size.",
      "",
      "Matching is measured anyway, via the live JSON API by **Brand + ProductCode** —",
      "the same brand+MPN identity rule, one request per listing instead of a local",
      "lookup. That answers whether canonical resolution works; only the index size",
      "question waits on the password.",
      ""
    );
  } else {
    say(`Using **${index.url}** (HTTP ${index.status}).`, "");
  }

  /* ---- B. Reference lists ---- */
  const suppliers = index ? await loadRefs(SUPPLIERS_URL, "ID", ["Name"]) : { map: new Map(), status: "skipped" };
  const cats = index ? await loadRefs(CATEGORIES_URL, "ID", ["Value", "Name"]) : { map: new Map(), status: "skipped" };
  say("## B. Reference lists", "");
  say("| List | HTTP | Entries |", "| --- | --- | --- |");
  say(`| Suppliers (brands) | ${suppliers.status} | ${suppliers.map.size} |`);
  say(`| Categories | ${cats.status} | ${cats.map.size} |`);
  say("");

  const keptCatIds = new Set();
  for (const [id, name] of cats.map) {
    const n = name.toLowerCase();
    if (CATEGORY_KEYWORDS.some((k) => n.includes(k))) keptCatIds.add(id);
  }
  say(`Category keywords matched **${keptCatIds.size}** Icecat categories.`, "");

  /* ---- C. Filter the index ---- */
  const kept = [];
  const mpnIndex = new Map();
  let rows = 0;
  let rawBytes = 0;
  const catCounts = new Map();

  if (index) for await (const line of lines(index.res, index.url)) {
    rows++;
    rawBytes += line.length + 1;
    const productId = line.match(/Product_ID="([^"]+)"/)?.[1];
    const prodId = line.match(/Prod_ID="([^"]*)"/)?.[1];
    const supplierId = line.match(/Supplier_id="([^"]+)"/)?.[1];
    const catid = line.match(/Catid="([^"]+)"/)?.[1];
    const model = line.match(/Model_Name="([^"]*)"/)?.[1];
    const onMarket = line.match(/On_Market="([^"]*)"/)?.[1];
    if (!productId || !prodId || !supplierId) continue;
    // Category filter, when the reference list resolved. Without it we cannot
    // tell a TV from a toaster, so the filter is reported as unapplied rather
    // than silently skipped.
    if (keptCatIds.size > 0 && catid && !keptCatIds.has(catid)) continue;

    const brandName = suppliers.map.get(supplierId) ?? null;
    if (!brandName) continue;

    const entry = {
      p: productId,
      b: brandName,
      m: prodId,
      n: model || null,
      c: catid ?? null,
      k: onMarket === "1" ? 1 : 0,
    };
    kept.push(entry);
    catCounts.set(catid, (catCounts.get(catid) ?? 0) + 1);

    const key = `${normBrand(brandName)}|${normMpn(prodId)}`;
    if (!mpnIndex.has(key)) mpnIndex.set(key, entry);
  }

  const json = JSON.stringify(kept);
  const gz = gzipSync(Buffer.from(json));
  say("## C. Filtered index size", "");
  if (!index) {
    say("**Pending** — requires `ICECAT_PASSWORD`. Everything below is unaffected.", "");
  } else {
  say("| Measure | Value |", "| --- | --- |");
  say(`| Index rows scanned | ${rows.toLocaleString()} |`);
  say(`| Raw index streamed | ${bytes(rawBytes)} |`);
  say(`| Rows kept after category + brand filter | **${kept.length.toLocaleString()}** |`);
  say(`| Unique brand+MPN keys | ${mpnIndex.size.toLocaleString()} |`);
  say(`| Static asset, JSON | ${bytes(json.length)} |`);
  say(`| **Static asset, gzipped** | **${bytes(gz.length)}** |`);
  say("");
  writeFileSync("icecat-index-sample.json", JSON.stringify(kept.slice(0, 50), null, 2));
  }

  /* ---- D + E. eBay sample and resolution ---- */
  const token = await ebayToken();
  say("## D/E. eBay AU listings resolved to canonical products", "");
  say(
    index
      ? "Resolved against the local filtered index."
      : "Resolved via Icecat's live JSON API by Brand + ProductCode (index unavailable).",
    ""
  );

  const overall = { seen: 0, brand: 0, mpn: 0, both: 0, matched: 0, brandAgree: 0, gtinOnly: 0 };
  const perCategory = [];
  const matchedEntries = [];

  for (const category of CATEGORIES) {
    const stat = { label: category.label, seen: 0, brand: 0, mpn: 0, both: 0, matched: 0, brandAgree: 0 };
    const ids = [];
    for (const q of category.queries) {
      const params = new URLSearchParams({
        q, limit: String(SEARCH_LIMIT), fieldgroups: "EXTENDED", category_ids: "293",
      });
      const data = await ebay(`/item_summary/search?${params}`, token);
      for (const s of data?.itemSummaries ?? []) if (s.itemId) ids.push(s.itemId);
    }
    // Spread the sample across the queries rather than taking the first page.
    const step = Math.max(1, Math.floor(ids.length / PER_CATEGORY_ITEMS));
    const sample = ids.filter((_, i) => i % step === 0).slice(0, PER_CATEGORY_ITEMS);

    for (const id of sample) {
      const item = await ebay(`/item/${encodeURIComponent(id)}`, token);
      if (!item) continue;
      const info = identify(item);
      stat.seen++;
      overall.seen++;
      if (info.brand) { stat.brand++; overall.brand++; }
      if (info.mpn) { stat.mpn++; overall.mpn++; }
      if (info.gtin && !(info.brand && info.mpn)) overall.gtinOnly++;
      if (!(info.brand && info.mpn)) continue;
      stat.both++; overall.both++;

      let hit = null;
      let sheet = null;
      if (mpnIndex.size > 0) {
        hit = mpnIndex.get(`${normBrand(info.brand)}|${normMpn(info.mpn)}`) ?? null;
      } else {
        await sleep(250);
        const live = await resolveLive(info.brand, info.mpn);
        hit = live.hit;
        sheet = live.body ?? null;
      }
      if (!hit) continue;
      stat.matched++; overall.matched++;
      // Brand equality is implied by the key, but recorded explicitly so the
      // rule is visible in the output rather than assumed from the lookup.
      const agree = normBrand(hit.b) === normBrand(info.brand);
      if (agree) { stat.brandAgree++; overall.brandAgree++; }
      matchedEntries.push({ ...hit, sheet, ebayTitle: info.title, ebayBrand: info.brand, ebayMpn: info.mpn });
    }
    perCategory.push(stat);
  }

  const row = (s) =>
    `| ${s.label} | ${s.seen} | ${pct(s.brand, s.seen)} | ${pct(s.mpn, s.seen)} | ${pct(s.both, s.seen)} | ${pct(s.matched, s.both)} | ${pct(s.brandAgree, s.matched)} |`;
  say(
    "| Category | Listings | Usable brand | Genuine MPN | Brand + MPN | Found in Icecat | Brand agrees |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...perCategory.map(row),
    row({ ...overall, label: "**Overall**" }),
    ""
  );
  say(
    `A further ${overall.gtinOnly} listing(s) carried a GTIN but no usable brand+MPN.`,
    "Under these rules those cannot be identified — a barcode alone never establishes identity.",
    ""
  );

  /* ---- F. Product-level data on matched products ---- */
  say("## F. Product data available for matched products", "");
  if (matchedEntries.length === 0) {
    say("No products matched, so there was nothing to inspect.", "");
  } else {
    const sample = matchedEntries.slice(0, DATASHEET_SAMPLE);
    let ok = 0, withRelease = 0, withSpecs = 0, withImages = 0, specTotal = 0;
    for (const [i, entry] of sample.entries()) {
      if (i > 0 && !entry.sheet) await sleep(300);
      const params = new URLSearchParams({
        shopname: ICECAT_USER, lang: "en", content: "", icecat_id: entry.p,
      });
      let body = entry.sheet ?? null;
      if (!body) {
        try {
          const res = await fetch(`${ICECAT_LIVE}?${params}`, { headers: { accept: "application/json" } });
          body = await res.json();
        } catch { /* counted as a miss below */ }
      }
      const d = body?.data;
      if (!d || body?.StatusCode != null) continue;
      ok++;
      if (d.GeneralInfo?.ReleaseDate && !String(d.GeneralInfo.ReleaseDate).startsWith("0000")) withRelease++;
      const specs = (d.FeaturesGroups ?? []).reduce((n, g) => n + (g.Features?.length ?? 0), 0);
      specTotal += specs;
      if (specs >= 5) withSpecs++;
      if (d.Image?.HighPic || (d.Gallery ?? []).length) withImages++;
    }
    say("| Measure | Value |", "| --- | --- |");
    say(`| Datasheets fetched | ${sample.length} |`);
    say(`| Datasheets returned | ${ok} |`);
    say(`| With release date | ${pct(withRelease, ok)} |`);
    say(`| With ≥5 specifications | ${pct(withSpecs, ok)} |`);
    say(`| With official images | ${pct(withImages, ok)} |`);
    say(`| Mean specifications per product | ${ok ? Math.round(specTotal / ok) : "—"} |`);
    say("");
    say("<details><summary>Sample of matched products</summary>", "");
    say("| eBay listing | Matched product | Brand | MPN |", "| --- | --- | --- | --- |");
    for (const m of matchedEntries.slice(0, 20)) {
      say(`| ${m.ebayTitle.slice(0, 44)} | ${(m.n ?? "").slice(0, 34)} | ${m.b} | \`${m.m}\` |`);
    }
    say("", "</details>", "");
  }

  /* ---- Verdict ---- */
  const identifiable = overall.seen ? overall.both / overall.seen : 0;
  const matchRate = overall.both ? overall.matched / overall.both : 0;
  const endToEnd = identifiable * matchRate;
  say("## Verdict", "");
  say(
    `Listings with a genuine brand + MPN: **${pct(overall.both, overall.seen)}**. ` +
      `Of those, found in the filtered Icecat index: **${pct(overall.matched, overall.both)}**. ` +
      `End to end: **${pct(overall.matched, overall.seen)}** of eBay AU listings resolve to a canonical product.`,
    ""
  );
  say(
    endToEnd >= 0.25
      ? "**Product-first is viable.** Enough listings resolve to seed a canonical catalogue and attach offers to it."
      : endToEnd >= 0.1
        ? "**Marginal.** Resolution works but covers a minority of listings — viable if the feed is driven from the product side (search *for* known products) rather than from arbitrary listings."
        : "**Not viable as designed.** Too few listings resolve; the product-first feed would have very little to show.",
    ""
  );
  say(
    "Note the direction of travel: this measures listing → product, which is the harder direction.",
    "The architecture drives product → listing, searching eBay for a product BuyWise already knows,",
    "so the practical hit rate should exceed the figure above.",
    ""
  );
  finish();
}

function finish() {
  const md = out.join("\n");
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
}

main().catch((e) => {
  say("", `**Measurement failed:** ${e && e.message}`, "");
  finish();
  process.exit(1);
});
