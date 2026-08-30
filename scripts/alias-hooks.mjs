/**
 * Teaches Node the `@/` path alias that tsconfig defines.
 *
 * The test scripts run TypeScript modules directly via
 * --experimental-strip-types, which erases types but does not read tsconfig,
 * so a runtime `import … from "@/lib/…"` fails to resolve. Registering this
 * hook lets tests exercise the real application modules rather than copies of
 * them — the same reason the catalogue audit imports the app's identifier gate
 * instead of reimplementing it.
 *
 * Used as: node --import ./scripts/alias-hooks.mjs --experimental-strip-types …
 */
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);

    let target = path.join(root, specifier.slice(2));
    // tsconfig-style imports omit the extension; try the ones we author in.
    if (!path.extname(target)) {
      for (const ext of [".ts", ".tsx", ".mjs", ".js"]) {
        if (existsSync(target + ext)) {
          target += ext;
          break;
        }
      }
    }
    return nextResolve(pathToFileURL(target).href, context);
  },
});
