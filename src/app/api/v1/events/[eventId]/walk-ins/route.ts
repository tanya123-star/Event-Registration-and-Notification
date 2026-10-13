/**
 * POST /api/v1/events/[eventId]/walk-ins — record one walk-in exception.
 *
 * Requires a verified identity (401 otherwise); the recorder is always the identity,
 * never a client-supplied user id. A reason is required (ATT-12); a reasonless
 * walk-in is refused with 400 by the operation.
 */

import { requirePool } from "../../../../_lib/pool.js";
import { resolveRequestIdentity } from "../../../../_lib/identity.js";
import { requestIdOf, unauthenticated } from "../../../../_lib/responses.js";
import { recordWalkInOperation } from "../../../../_lib/operations.js";

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
  return recordWalkInOperation(resolved.pool, identity, request, eventId);
}
