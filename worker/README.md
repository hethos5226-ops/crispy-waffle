# BuyWise API Worker

A Cloudflare Worker that proxies the [eBay Browse API](https://developer.ebay.com/api-docs/buy/browse/overview.html)
for the BuyWise frontend.

## Why this exists

BuyWise deploys to GitHub Pages, which serves static files and cannot run
server-side code. eBay's API requires a client secret and does not permit
browser calls. This Worker is the server: it holds the credentials, calls
eBay, and returns plain JSON to the static frontend.

**No eBay credential is ever present in the BuyWise repository, its build
output, or anything sent to a browser.**

## Setup

You need an eBay developer account with a **Production** keyset. Sandbox
keys return synthetic listings, not real products.

1. Sign up at [developer.ebay.com](https://developer.ebay.com) and create an
   application.
2. Generate a **Production** keyset and note the **App ID (Client ID)** and
   **Cert ID (Client Secret)**.
3. Complete the one-time Marketplace Account Deletion compliance step. BuyWise
   stores no eBay user data, so you can **opt out** — production keys stay
   inactive until this is resolved either way.

Then deploy:

```bash
npm install -g wrangler
wrangler login

cd worker
npm install

# Uploads encrypted to Cloudflare. Never written to disk or committed.
wrangler secret put EBAY_CLIENT_ID
wrangler secret put EBAY_CLIENT_SECRET

wrangler deploy
```

Deploy prints a URL like `https://buywise-api.<subdomain>.workers.dev`.

Finally, point the frontend at it by adding a **repository variable** (not a
secret — this URL is public by design) in GitHub:

*Settings → Secrets and variables → Actions → Variables → New variable*

```
NEXT_PUBLIC_BUYWISE_API_URL = https://buywise-api.<subdomain>.workers.dev
```

## Endpoints

| Route | Purpose |
| --- | --- |
| `GET /search?q=<query>&limit=<n>` | eBay `item_summary/search`, `fieldgroups=EXTENDED` |
| `GET /item/<itemId>` | eBay `getItem` |
| `GET /health` | Reports whether credentials are configured (no values) |

## Configuration

Non-secret settings live in `wrangler.toml`:

- `EBAY_MARKETPLACE` — defaults to `EBAY_AU`.
- `ALLOWED_ORIGINS` — comma-separated origins allowed to call this from a
  browser. Update if the Pages URL changes.

## Quota protection

eBay's free tier allows 5,000 calls/day. To keep a public endpoint from
draining it:

- Successful responses are cached at Cloudflare's edge (10 min for searches,
  15 min for items), so repeat queries cost no eBay quota.
- `limit` is clamped to 24 and query length to 120 characters.
- Browser requests from origins outside `ALLOWED_ORIGINS` are rejected.

For a public deployment, also add a **Rate limiting rule** in the Cloudflare
dashboard (Security → WAF → Rate limiting rules) — for example 30 requests
per minute per IP. The edge cache reduces load but does not by itself stop a
determined caller.

## Local development

```bash
cd worker
wrangler dev          # http://localhost:8787
```

`wrangler dev` prompts for secrets, or reads them from a local `.dev.vars`
file — which is gitignored and must never be committed.
