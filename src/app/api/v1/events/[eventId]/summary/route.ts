/**
 * GET /api/v1/events/[eventId]/summary — registered count, capacity, available slots.
 *
 * Requires a verified identity (401 otherwise). Officer-owns-event scoping (FR-REG-030) is the
 * session layer's job once roles exist; this route reports the event named.
 */

import { requirePool } from "../../../../_lib/pool.js";
import { resolveRequestIdentity } from "../../../../_lib/identity.js";
import { requestIdOf, unauthenticated } from "../../../../_lib/responses.js";
import { eventSummaryOperation } from "../../../../_lib/operations.js";

export const dynamic = "force-dynamic";

export async function GET(
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
  return eventSummaryOperation(resolved.pool, identity, request, eventId);
}
