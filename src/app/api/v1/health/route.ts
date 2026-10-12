/**
 * GET /api/v1/health — HTTP liveness.
 *
 * SCOPE, deliberately narrow: this proves the HTTP application is running and can serve a request.
 * It proves NOTHING about PostgreSQL. It opens no connection, imports no pool, reads no environment
 * variable, and consults no schema. That is the point — a liveness probe that depends on a
 * dependency cannot distinguish "this process is dead" from "that dependency is degraded", and
 * collapsing the two makes a restart the wrong response to a database blip.
 *
 * No readiness or dependency-health endpoint exists yet, and none is added here. That would need a
 * real database probe, which is out of scope for Stage 2 and would require the pg access that this
 * route is specified not to have.
 *
 * Layering (docs/architecture/SYSTEM-ARCHITECTURE.md section 2.1, enforced by lint):
 *   L5 Presentation MUST NOT decide whether an action is permitted, hold business rules, or write
 *   data. This handler holds no rule and writes nothing — it maps a request to a fixed response.
 *
 * eslint.config.mjs excludes `src/app/api/**` from the L5 import restriction, so this file is not
 * forbidden from importing pg. It simply does not, and must not grow a dependency on src/db/.
 */

/**
 * A liveness response must reflect the current moment, never a value captured at build time or
 * served from a cache. Next.js 15 no longer caches GET Route Handlers by default, but stating it
 * keeps the intent explicit and survives any future change to that default.
 */
export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json(
    {
      status: "ok",
      service: "erns-http",
      check: "http-liveness",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}