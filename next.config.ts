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
  images: { unoptimized: true },
};

export default nextConfig;
