/**
 * POST /api/v1/events/[eventId]/registrations — register the calling student.
 *
 * The registering user is always the verified identity: the route never accepts a user id from
 * the client. Requires a verified identity (401 otherwise).
 */

import { requirePool } from "../../../../_lib/pool.js";
import { resolveRequestIdentity } from "../../../../_lib/identity.js";
import { requestIdOf, unauthenticated } from "../../../../_lib/responses.js";
import { registerOperation } from "../../../../_lib/operations.js";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
): Promise<Response> {
  const requestId = requestIdOf(request);
  const identity = await resolveRequestIdentity(request);
  if (identity === null) {
    return unauthenticated(requestId);
  }
  const resolved = requirePool(requestId);
  if (!resolved.ok) {
    return resolved.response;
  }
  const { eventId } = await context.params;
  return registerOperation(resolved.pool, identity, request, eventId);
}
