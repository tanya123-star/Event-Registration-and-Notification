/**
 * GET /api/v1/events — published events with live counts.
 * POST /api/v1/events — create an event in DRAFT.
 *
 * Both require a verified identity (401 otherwise). The bodies of the work live in
 * `src/app/api/_lib/operations.ts`, which is where they can be tested without a server.
 */

import { requirePool } from "../../_lib/pool.js";
import { resolveRequestIdentity } from "../../_lib/identity.js";
import { requestIdOf, unauthenticated } from "../../_lib/responses.js";
import { createEventOperation, listEventsOperation } from "../../_lib/operations.js";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const requestId = requestIdOf(request);
  const identity = await resolveRequestIdentity(request);
  if (identity === null) {
    return unauthenticated(requestId);
  }
  const resolved = requirePool(requestId);
  if (!resolved.ok) {
    return resolved.response;
  }
  return listEventsOperation(resolved.pool, identity, request);
}

export async function POST(request: Request): Promise<Response> {
  const requestId = requestIdOf(request);
  const identity = await resolveRequestIdentity(request);
  if (identity === null) {
    return unauthenticated(requestId);
  }
  const resolved = requirePool(requestId);
  if (!resolved.ok) {
    return resolved.response;
  }
  return createEventOperation(resolved.pool, identity, request);
}
