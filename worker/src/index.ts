/**
 * BuyWise → eBay Browse API proxy.
 *
 * The single place eBay credentials exist at runtime. The static BuyWise
 * frontend has no server of its own, so it calls this Worker instead of
 * eBay: the client secret never leaves Cloudflare, and the browser never
 * sees anything but ordinary JSON.
 *
 * Endpoints
 *   GET /search?q=<query>&limit=<n>   → eBay item_summary/search
 *   GET /item/<itemId>                → eBay getItem
 *   GET /catalog?gtin=…               → Icecat datasheet by barcode
 *   GET /catalog?brand=…&mpn=…        → Icecat datasheet by brand + part code
 *   GET /health                       → readiness, without revealing config
 *
 * The two data families are kept apart on purpose. /search and /item return
 * *offers* — what one seller is charging today. /catalog returns a *product* —
 * what the manufacturer says the thing is. BuyWise never merges them into a
 * single response, so the frontend can always tell the user which is which.
 */

export interface Env {
  /** eBay App ID (Client ID). Set with: wrangler secret put EBAY_CLIENT_ID */
  EBAY_CLIENT_ID: string;
  /** eBay Cert ID (Client Secret). Set with: wrangler secret put EBAY_CLIENT_SECRET */
  EBAY_CLIENT_SECRET: string;
  /** Comma-separated origins permitted to call this Worker. */
  ALLOWED_ORIGINS: string;
  /** eBay marketplace, e.g. EBAY_AU. */
  EBAY_MARKETPLACE: string;
  /**
   * Open Icecat username. Set with: wrangler secret put ICECAT_USERNAME
   *
   * Open Icecat needs no password for JSON requests — the username alone
   * authorises access to brand-sponsored datasheets. It is still held here
   * rather than in the frontend so it can't be lifted from the bundle and
   * spent against our rate limit.
   */
  ICECAT_USERNAME: string;
}

const EBAY_OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_BROWSE_URL = "https://api.ebay.com/buy/browse/v1";
const EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope";
const ICECAT_URL = "https://live.icecat.biz/api";

/** Cache search results this long at the edge. Prices move slowly; the 5k/day quota does not. */
const SEARCH_CACHE_SECONDS = 600;
const ITEM_CACHE_SECONDS = 900;
/**
 * Datasheets are effectively static — a manufacturer's spec sheet doesn't
 * change once published — so they are cached far longer than any price.
 * "Not found" is cached too, and for the same length: a product Icecat
 * doesn't cover today won't be covered an hour from now either.
 */
const CATALOG_CACHE_SECONDS = 86_400;

const MAX_QUERY_LENGTH = 120;
/** eBay permits 200. 50 keeps one call worth roughly one screenful of feed. */
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;
/** eBay caps pagination at 10,000 results. */
const MAX_OFFSET = 9_999;

/** The only sort values eBay Browse accepts. Anything else is dropped. */
const ALLOWED_SORTS = new Set(["price", "-price", "newlyListed", "endingSoonest"]);

/* ------------------------------------------------------------------ *
 * OAuth
 * ------------------------------------------------------------------ */

interface CachedToken {
  token: string;
  expiresAt: number;
}

// Per-isolate cache. Cloudflare may run many isolates, so this is a
// best-effort saving rather than a guarantee of one token globally —
// worst case each isolate mints its own, which eBay permits.
let cachedToken: CachedToken | null = null;

async function getAccessToken(env: Env): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.token;

  const basic = btoa(`${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`);
  const response = await fetch(EBAY_OAUTH_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: EBAY_SCOPE }),
  });

  if (!response.ok) {
    // Deliberately does not echo eBay's body — it can restate the client id.
    throw new UpstreamError("Could not authenticate with eBay.", response.status === 401 ? 500 : 502);
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new UpstreamError("eBay returned no access token.", 502);

  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 7200) * 1000,
  };
  return cachedToken.token;
}

class UpstreamError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/* ------------------------------------------------------------------ *
 * CORS
 * ------------------------------------------------------------------ */

function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const allowed = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "accept",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function json(body: unknown, init: { status?: number; origin: string | null; cacheSeconds?: number }): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.cacheSeconds ? { "cache-control": `public, max-age=${init.cacheSeconds}` } : {}),
      ...corsHeaders(init.origin),
    },
  });
}

/* ------------------------------------------------------------------ *
 * eBay calls
 * ------------------------------------------------------------------ */

async function callEbay(path: string, env: Env, marketplace?: string): Promise<unknown> {
  const token = await getAccessToken(env);
  const response = await fetch(`${EBAY_BROWSE_URL}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": marketplace || env.EBAY_MARKETPLACE || "EBAY_AU",
      accept: "application/json",
    },
  });

  if (response.status === 404) throw new UpstreamError("Not found.", 404);
  if (response.status === 429) throw new UpstreamError("eBay rate limit reached.", 429);
  if (!response.ok) throw new UpstreamError("eBay request failed.", 502);

  return response.json();
}

/* ------------------------------------------------------------------ *
 * Icecat (product catalogue)
 * ------------------------------------------------------------------ */

/** A GTIN is 8, 12, 13 or 14 digits. Anything else is not a barcode. */
function validGtin(value: string): boolean {
  return /^\d{8,14}$/.test(value) && !/^0+$/.test(value);
}

/**
 * Fetches one datasheet.
 *
 * Returns null for "Icecat has no such product", which is an ordinary answer
 * rather than an error: Open Icecat only covers brands that sponsor their own
 * content, so plenty of legitimate identifiers simply aren't in it. Icecat
 * signals this inconsistently — sometimes a 4xx, sometimes a 200 carrying a
 * StatusCode — so both are normalised to the same null here.
 */
async function callIcecat(
  params: { gtin?: string; brand?: string; mpn?: string },
  env: Env
): Promise<unknown | null> {
  const query = new URLSearchParams({
    UserName: env.ICECAT_USERNAME,
    Language: "en",
  });
  if (params.gtin) {
    query.set("GTIN", params.gtin);
  } else if (params.brand && params.mpn) {
    query.set("Brand", params.brand);
    query.set("ProductCode", params.mpn);
  } else {
    return null;
  }

  const response = await fetch(`${ICECAT_URL}?${query}`, {
    headers: { accept: "application/json" },
  });

  if (response.status === 404 || response.status === 400) return null;
  if (response.status === 401 || response.status === 403) {
    // Our credentials, not the user's problem — but don't echo Icecat's body,
    // which restates the username.
    throw new UpstreamError("Product catalogue rejected our credentials.", 502);
  }
  if (response.status === 429) throw new UpstreamError("Product catalogue rate limit reached.", 429);
  if (!response.ok) throw new UpstreamError("Product catalogue request failed.", 502);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new UpstreamError("Product catalogue returned an unreadable response.", 502);
  }

  // A 200 with a StatusCode, or with no data block, means "no product".
  if (body && typeof body === "object") {
    const b = body as { StatusCode?: unknown; data?: unknown };
    if (b.StatusCode != null) return null;
    if (b.data == null) return null;
  }

  return body;
}

/* ------------------------------------------------------------------ *
 * Handler
 * ------------------------------------------------------------------ */

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = allowedOrigin(request, env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, { status: 405, origin });
    }

    // A browser request from an unlisted origin gets no data. Requests with
    // no Origin header at all (curl, monitoring) are allowed through.
    if (request.headers.get("origin") && !origin) {
      return json({ error: "Origin not allowed" }, { status: 403, origin: null });
    }

    if (url.pathname === "/health") {
      return json(
        {
          ok: true,
          // `configured` stays eBay-only so the existing deploy workflow's
          // check keeps meaning what it always meant.
          configured: Boolean(env.EBAY_CLIENT_ID && env.EBAY_CLIENT_SECRET),
          catalogConfigured: Boolean(env.ICECAT_USERNAME),
          marketplace: env.EBAY_MARKETPLACE || "EBAY_AU",
        },
        { origin }
      );
    }

    // The catalogue is an independent integration: it has its own credential
    // and stays available even if eBay's are missing, so it is checked on its
    // own route rather than behind the eBay gate below.
    if (url.pathname === "/catalog") {
      if (!env.ICECAT_USERNAME) {
        return json({ error: "Product catalogue is not configured." }, { status: 503, origin });
      }

      const gtin = (url.searchParams.get("gtin") ?? "").trim();
      const brand = (url.searchParams.get("brand") ?? "").trim().slice(0, 60);
      const mpn = (url.searchParams.get("mpn") ?? "").trim().slice(0, 60);

      // Exactly the two identifier shapes BuyWise permits. There is no
      // title parameter here by design — see lib/data/catalog/ref.ts.
      let lookup: { gtin?: string; brand?: string; mpn?: string };
      if (gtin) {
        if (!validGtin(gtin)) {
          return json({ error: "Malformed gtin." }, { status: 400, origin });
        }
        lookup = { gtin };
      } else if (brand && mpn) {
        lookup = { brand, mpn };
      } else {
        return json(
          { error: "Provide either gtin, or both brand and mpn." },
          { status: 400, origin }
        );
      }

      const cache = caches.default;
      const cacheKey = new Request(url.toString(), { method: "GET" });
      const hit = await cache.match(cacheKey);
      if (hit) {
        const withCors = new Response(hit.body, hit);
        for (const [k, v] of Object.entries(corsHeaders(origin))) withCors.headers.set(k, v);
        return withCors;
      }

      try {
        const data = await callIcecat(lookup, env);
        const response =
          data === null
            ? json({ error: "No catalogue entry for that identifier." }, {
                status: 404,
                origin,
                cacheSeconds: CATALOG_CACHE_SECONDS,
              })
            : json(data, { origin, cacheSeconds: CATALOG_CACHE_SECONDS });

        // Negative answers are cached too — they're stable, and re-asking
        // Icecat for a product it has never heard of helps nobody.
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      } catch (error) {
        if (error instanceof UpstreamError) {
          return json({ error: error.message }, { status: error.status, origin });
        }
        return json({ error: "Unexpected error." }, { status: 500, origin });
      }
    }

    if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET) {
      return json({ error: "Server is not configured." }, { status: 503, origin });
    }

    // Serve from the edge cache before spending any eBay quota.
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: "GET" });
    const cached = await cache.match(cacheKey);
    if (cached) {
      const withCors = new Response(cached.body, cached);
      for (const [k, v] of Object.entries(corsHeaders(origin))) withCors.headers.set(k, v);
      return withCors;
    }

    // A market may ask for its own eBay marketplace (the AU build never does,
    // but a future US build will). Constrained to eBay's own id shape because
    // it is forwarded as a request header.
    const requestedMarketplace = url.searchParams.get("marketplace");
    const marketplace =
      requestedMarketplace && /^EBAY_[A-Z]{2,4}$/.test(requestedMarketplace)
        ? requestedMarketplace
        : undefined;

    try {
      let response: Response;

      if (url.pathname === "/search") {
        const q = (url.searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY_LENGTH);
        if (!q) return json({ error: "Missing q parameter" }, { status: 400, origin });

        const requested = Number(url.searchParams.get("limit"));
        const limit = Number.isFinite(requested)
          ? Math.min(Math.max(Math.trunc(requested), 1), MAX_LIMIT)
          : DEFAULT_LIMIT;

        const params = new URLSearchParams({
          q,
          limit: String(limit),
          // EXTENDED is what surfaces primaryProductReviewRating.
          fieldgroups: "EXTENDED",
          // Consumer electronics; keeps results relevant to what BuyWise covers.
          category_ids: "293",
        });

        // Optional pass-through, each validated rather than forwarded blind —
        // these end up in an upstream URL and an upstream header.
        const sort = url.searchParams.get("sort");
        if (sort && ALLOWED_SORTS.has(sort)) params.set("sort", sort);

        const offset = Number(url.searchParams.get("offset"));
        if (Number.isFinite(offset) && offset > 0) {
          params.set("offset", String(Math.min(Math.trunc(offset), MAX_OFFSET)));
        }

        const filter = url.searchParams.get("filter");
        // eBay's filter grammar is commas, colons, braces, brackets and pipes.
        // Anything outside that charset is not a filter we wrote.
        if (filter && filter.length <= 200 && /^[A-Za-z0-9_,:|.\[\]{}+\-\s]+$/.test(filter)) {
          params.set("filter", filter);
        }

        const data = await callEbay(`/item_summary/search?${params}`, env, marketplace);
        response = json(data, { origin, cacheSeconds: SEARCH_CACHE_SECONDS });
      } else if (url.pathname.startsWith("/item/")) {
        const itemId = decodeURIComponent(url.pathname.slice("/item/".length));
        if (!itemId) return json({ error: "Missing item id" }, { status: 400, origin });

        const data = await callEbay(`/item/${encodeURIComponent(itemId)}`, env, marketplace);
        response = json(data, { origin, cacheSeconds: ITEM_CACHE_SECONDS });
      } else {
        return json({ error: "Not found" }, { status: 404, origin });
      }

      // Cache the successful body (without the per-origin CORS headers).
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (error) {
      if (error instanceof UpstreamError) {
        return json({ error: error.message }, { status: error.status, origin });
      }
      // Never surface the raw error: it can contain request details.
      return json({ error: "Unexpected error." }, { status: 500, origin });
    }
  },
};

export default worker;
