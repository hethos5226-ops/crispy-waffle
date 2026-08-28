# BuyWise API Worker

A Cloudflare Worker that proxies the [eBay Browse API](https://developer.ebay.com/api-docs/buy/browse/overview.html)
for the BuyWise frontend.

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

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | the token from step 2.4 |
| `CLOUDFLARE_ACCOUNT_ID` | the account id from step 2.3 |
| `EBAY_CLIENT_ID` | eBay App ID |
| `EBAY_CLIENT_SECRET` | eBay Cert ID |

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
| `GET /search?q=<query>&limit=<n>` | eBay `item_summary/search`, `fieldgroups=EXTENDED` |
| `GET /item/<itemId>` | eBay `getItem` |
| `GET /health` | Reports whether credentials are configured (never their values) |

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
