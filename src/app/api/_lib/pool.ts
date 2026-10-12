/**
 * The application database pool, constructed once per server process.
 *
 * Lives under `src/app/api/_lib/` — a private folder, opted out of routing — inside the
 * `src/app/api/**` ESLint carve-out, so importing the L2 factory is permitted here and nowhere
 * else under `src/app/`.
 *
 * LAZY singleton, deliberately. A module-scope `new Pool()` would read `ERNS_APP_URL` at import
 * time, which runs during `next build`'s route collection — failing a build in an environment that
 * legitimately has no database URL. Reading the variable on first USE fails fast at request time
 * instead, with a 500 the error contract can express. Missing configuration is a deployment defect,
 * not a request defect, so it throws rather than returning a refusal.
 *
 * No `pg` import appears in this file: the pool's type is inferred from the L2 factory, so no
 * module outside `src/db/` names the driver.
 */

import { createAppPool } from "../../../db/client.js";
import { internalError } from "./responses.js";

type AppPool = ReturnType<typeof createAppPool>;

let cached: AppPool | null = null;

export function getAppPool(): AppPool {
  if (cached !== null) {
    return cached;
  }
  const url = process.env["ERNS_APP_URL"];
  if (url === undefined || url === "") {
    throw new Error(
      "ERNS_APP_URL is not set. The application role URL is required for every runtime query; " +
        "see .env.example. Refusing to serve without it rather than connecting nowhere.",
    );
  }
  cached = createAppPool(url);
  return cached;
}

/**
 * Resolve the pool for a route, expressing a missing configuration as a 500 through the error
 * contract rather than an uncaught throw. The message names the missing variable, never a value.
 */
export function requirePool(
  requestId: string | null,
): { readonly ok: true; readonly pool: AppPool } | { readonly ok: false; readonly response: Response } {
  try {
    return { ok: true, pool: getAppPool() };
  } catch {
    return { ok: false, response: internalError(requestId) };
  }
}
