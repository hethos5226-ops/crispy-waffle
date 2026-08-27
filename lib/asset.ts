/**
 * Builds a URL for a file in /public.
 *
 * Next applies `basePath` to routes and to its own build output, but not to
 * the `src` of an unoptimized <Image>/<img>. On GitHub Pages the app is served
 * from /crispy-waffle/, so a bare "/wiz/head.png" would 404 — every public
 * asset reference has to go through here.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
