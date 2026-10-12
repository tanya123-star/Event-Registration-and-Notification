import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * ERNS Next.js foundation — Stage 1 (framework only, no route handlers).
 *
 * A-7 in docs/architecture/PROJECT-OWNER-DECISIONS.md records:
 *
 *     "Next.js 15 Route Handlers in the same application. One deployable"
 *
 * A-7 is satisfied as written. Version 15.5.27 is pinned exactly rather than with a caret range:
 * a `^15.5.27` range would float to 16.x on the next major release, which would silently change the
 * framework version an owner decision names. Section 14 of that file records why version
 * conclusions are treated as the fastest aging content in it.
 *
 * FILE EXTENSION: this is `.mjs`, not `.ts`, and not `.mts`. Two verified constraints forced it.
 * Next.js 15 hard-rejects `next.config.mts` — config.js:1248 throws
 * "Configuring Next.js via 'next.config.mts' is not supported" — so only `.js`, `.mjs` and `.ts`
 * are accepted. And Next.js 15 documents `next.config.ts` as having module resolution "currently
 * limited to CommonJS". This package sets `"type": "module"`, so a plain `next.config.js` would be
 * interpreted as ESM. `.mjs` is therefore the only extension that is both accepted and unambiguous.
 *
 * 1. `tsconfigPath` points Next.js at `tsconfig.next.json`, NOT at `tsconfig.json`.
 *
 *    Next.js reads `tsconfig.json` by default and writes recommended config options into whichever
 *    file it manages. `tsconfig.json` is NOT expendable here:
 *
 *      - "build"        = tsc -p tsconfig.json          emits dist/
 *      - "typecheck"    = tsc -p tsconfig.json --noEmit
 *      - "db:migrate"   = pnpm build && node dist/db/cli.js
 *      - "db:rollback"  = pnpm build && node dist/db/cli.js --rollback
 *
 *    and src/db/migrate.ts line 92 resolves the SQL directory as
 *    `join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "db", "schema")` — a hard
 *    coded two-levels-up hop from `dist/db/`. If Next.js rewrote `tsconfig.json`, that emit could
 *    stop producing `dist/`, and migrations would fail at EXECUTION time rather than build time.
 *    The custom path confines Next.js's rewrites to a file nothing else reads.
 *
 * 2. `pg` is deliberately absent from `serverExternalPackages`.
 *
 *    `pg` is already in Next.js's built-in opt-out list (server-external-packages.json), so Route
 *    Handlers will require it natively rather than bundle it. Adding it again would be redundant.
 *    Explicit SQL through `pg` remains mandatory per section 4.2; this setting does not affect
 *    that, and no ORM is introduced.
 *
 * `output: "standalone"` produces a self-contained server bundle, matching A-7's "one deployable".
 * The target host is unresolved under OQ-30, so this is provisional and reversible.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "standalone",
  // `output: "standalone"` traces every file reachable from the server bundle. With no explicit
  // root, Next.js walks UPWARD looking for lockfiles and, on this machine, finds
  // C:\Users\Tanya Mae\package-lock.json and C:\Users\Tanya Mae\yarn.lock — outside the repository
  // entirely. Next.js warns about exactly this and advises setting this option. Pinning the trace to
  // this file's own directory keeps the traced dependency set a function of this repo alone, so the
  // standalone bundle cannot absorb files from a sibling project or the home directory.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  typescript: {
    tsconfigPath: "tsconfig.next.json",
  },
  // Module resolution for the repository's NodeNext-style imports.
  //
  // Every TypeScript source in this repository imports its siblings with an explicit `.js`
  // suffix (`../db/client.js` for `../db/client.ts`). That is mandatory under
  // `moduleResolution: NodeNext`, which both `tsconfig.json` (the CLI build) and
  // `tsconfig.next.json` (the Next.js build) use — and it is why `tsc` and Vitest resolve these
  // imports without complaint.
  //
  // Webpack does not. A request for `./sibling.js` probes for a literal `sibling.js` and never
  // for `sibling.ts`, so every route-file import failed `next build` and `next dev` with
  // "Module not found" while both typecheck programs stayed green (root-caused 2026-10-10: an
  // extensionless probe route compiled and returned 200 while every `.js`-suffixed import
  // failed). `resolve.extensionAlias` teaches webpack the same `.js` -> `.ts` substitution the
  // TypeScript compiler performs. Only `.js` is mapped: the repository has no `.mjs`/`.cjs`
  // sources, and mapping those too is known to break deep imports of packages that publish
  // them (the substituted path fails the package's `exports` map).
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;