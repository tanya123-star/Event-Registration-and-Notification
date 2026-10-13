/**
 * GET /api/v1/events/[eventId]/attendance/lookup — staff participant lookup.
 *
 * Requires a verified identity (401 otherwise). Query by name or Confirmation
 * reference via `?query=`; scoped to the event named (the session layer's
 * assigned-event context). Rows carry name plus Confirmation reference only
 * (ADR-0001).
 */

import { requirePool } from "../../../../../_lib/pool.js";
import { resolveRequestIdentity } from "../../../../../_lib/identity.js";
import { requestIdOf, unauthenticated } from "../../../../../_lib/responses.js";
import { lookupParticipantsOperation } from "../../../../../_lib/operations.js";

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
  return lookupParticipantsOperation(resolved.pool, identity, request, eventId);
}
