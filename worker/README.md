# BuyWise API Worker

A Cloudflare Worker that proxies two upstreams for the BuyWise frontend:

- the [eBay Browse API](https://developer.ebay.com/api-docs/buy/browse/overview.html) — **offers**: what a
  seller is charging for one item, right now
- [Open Icecat](https://icecat.com/) — **products**: what the manufacturer says the thing is

They are served on separate routes and never merged into one response, so the
app can always tell a user which of the two it is showing them.

## Why this exists

BuyWise deploys to GitHub Pages, which serves static files and cannot run
server-side code. eBay's API requires a client secret and does not permit
browser calls. This Worker is the server: it holds the credentials, calls
eBay, and returns plain JSON to the static frontend.

**No eBay credential is ever present in this repository, its build output, or
anything sent to a browser.** They travel from GitHub's encrypted secret store
directly into Cloudflare's, and live nowhere else.

## Deploying — no local tooling required

Everything happens in a browser plus the GitHub Actions tab. You do not need
Wrangler, Node, or a terminal on your own machine.

### 1. eBay (one-time)

1. Sign up at [developer.ebay.com](https://developer.ebay.com) and create an
   application.
2. Generate a **Production** keyset. Sandbox keys return synthetic test
   listings, not real products.
3. Complete the one-time Marketplace Account Deletion compliance step. BuyWise
   stores no eBay user data, so you can **opt out** — production keys stay
   inactive until this is resolved either way.
4. Note the **App ID (Client ID)** and **Cert ID (Client Secret)**.

### 2. Cloudflare (one-time, in the dashboard)

1. Create a free account at [dash.cloudflare.com](https://dash.cloudflare.com).
2. Open **Workers & Pages** once. If prompted, choose a `workers.dev`
   subdomain — the Worker's public URL is built from it.
3. Copy your **Account ID**: it is shown on the Workers & Pages overview, and
   in the URL as `dash.cloudflare.com/<account-id>/…`.
4. Create an API token: **My Profile → API Tokens → Create Token →** use the
   **Edit Cloudflare Workers** template. Copy the token — Cloudflare shows it
   only once.

### 3. GitHub (add four secrets)

*Repository → Settings → Secrets and variables → Actions → Secrets → New
repository secret*

| Secret | Value | Required |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | the token from step 2.4 | yes |
| `CLOUDFLARE_ACCOUNT_ID` | the account id from step 2.3 | yes |
| `EBAY_CLIENT_ID` | eBay App ID | yes |
| `EBAY_CLIENT_SECRET` | eBay Cert ID | yes |
| `ICECAT_USERNAME` | Open Icecat username | optional |

`ICECAT_USERNAME` is the login from a free [Open Icecat](https://icecat.com/structured-data-content-users/)
registration — email confirmation, no card. Open Icecat needs no password for
JSON requests, so the username is the whole credential; it lives here rather
than in the frontend so it can't be lifted from the bundle and spent against
our rate limit. Leave it unset and the Worker still serves eBay normally,
`/catalog` returns 503, and the app simply shows offer data with no product
datasheets.

### 4. Run the deployment

*Actions → **Deploy eBay proxy Worker** → Run workflow*, leaving **Also upload
the eBay credentials** ticked.

The run checks all four secrets are present, typechecks the Worker, deploys
it, and uploads the eBay credentials to Cloudflare's encrypted store. Its
summary prints the assigned `https://buywise-api.<subdomain>.workers.dev` URL.

### 5. Point the frontend at it

*Settings → Secrets and variables → Actions → **Variables** → New variable*

```
NEXT_PUBLIC_BUYWISE_API_URL = https://buywise-api.<your-subdomain>.workers.dev
```

This is a **variable, not a secret** — the URL is public by design, since it
is the endpoint the browser calls. The eBay credentials remain only in
Cloudflare.

Then run *Actions → **Deploy to GitHub Pages** → Run workflow* so the frontend
is rebuilt with the URL baked in. Live eBay results will appear in the app.

Re-running the Worker deployment afterwards will confirm the endpoint is
healthy and reports `"configured": true`.

## Everyday use after setup

- **Changed the Worker code?** Pushing to the branch redeploys it
  automatically; stored credentials are left alone.
- **Rotated your eBay keys?** Update the GitHub secrets, then run the workflow
  with **Also upload the eBay credentials** ticked.
- **Redeploy without touching credentials?** Run it with that box unticked.

## Endpoints

| Route | Purpose |
| --- | --- |
| `GET /search?q=<query>&limit=<n>` | eBay `item_summary/search`, `fieldgroups=EXTENDED`. Optional `sort`, `offset`, `filter`, `marketplace` — each validated, never forwarded blind |
| `GET /item/<itemId>` | eBay `getItem` |
| `GET /catalog?gtin=<gtin>` | Icecat datasheet by barcode |
| `GET /catalog?brand=<brand>&mpn=<mpn>` | Icecat datasheet by brand + part number |
| `GET /health` | Reports whether credentials are configured (never their values) |

`/catalog` accepts **only** those two identifier shapes. There is deliberately
no title or keyword parameter: matching a manufacturer's datasheet to a listing
by how similar their wording looks would attach official specifications to a
product that might not be the one being sold. A 404 means "no datasheet for
that identifier", which is an ordinary answer rather than an error — Open
Icecat covers brands that sponsor their own content, so plenty of legitimate
identifiers simply aren't in it.

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
- Datasheets are cached for 24 hours, as are catalogue misses — a product
  Icecat has never heard of won't be in it an hour from now either.
- The frontend debounces typing, so a search costs one call rather than one
  per keystroke.
- `limit` is clamped to 24 and query length to 120 characters.
- Browser requests from origins outside `ALLOWED_ORIGINS` are rejected.

Before sharing the app widely, also add a **Rate limiting rule** in the
Cloudflare dashboard (Security → WAF → Rate limiting rules) — for example 30
requests per minute per IP. Edge caching reduces load but does not by itself
stop a determined caller.

## Local development (optional)

Only relevant if you can install tooling; it is not required to deploy.

```bash
cd worker
npm install
npx wrangler dev          # http://localhost:8787
```

`wrangler dev` reads secrets from a local `.dev.vars` file, which is gitignored
and must never be committed.
