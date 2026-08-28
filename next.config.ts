import type { NextConfig } from "next";

// Set only by the GitHub Pages deploy workflow (see .github/workflows/deploy-pages.yml).
// Local `next dev` / `next build` / `next start` are unaffected and keep full
// server capabilities (API routes, per-request rendering, etc.).
const isGithubPagesBuild = process.env.GITHUB_PAGES === "true";

// Project page, served at https://hethos5226-ops.github.io/crispy-waffle/ —
// every asset/link needs this prefix, which Next applies automatically via
// basePath/assetPrefix (no per-component changes needed).
const basePath = isGithubPagesBuild ? "/crispy-waffle" : "";

const nextConfig: NextConfig = {
  ...(isGithubPagesBuild ? { output: "export" } : {}),
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
    // Real listing photography is served from eBay's own image CDN.
    remotePatterns: [
      { protocol: "https", hostname: "i.ebayimg.com" },
      { protocol: "https", hostname: "**.ebayimg.com" },
    ],
  },
  // Next does not rewrite `src` on unoptimized <Image>/<img>, so anything
  // pointing at /public needs the prefix applied by hand — see lib/asset.ts.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
