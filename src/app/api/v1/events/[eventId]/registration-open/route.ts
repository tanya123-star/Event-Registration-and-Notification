/**
 * PATCH /api/v1/events/[eventId]/registration-open — close or reopen registration.
 *
 * Requires a verified identity (401 otherwise). Who may close or reopen (FR-REG-032/033) is the
 * session layer's job once roles exist; the actor is recorded as the verified identity.
 */

import { requirePool } from "../../../../_lib/pool.js";
import { resolveRequestIdentity } from "../../../../_lib/identity.js";
import { requestIdOf, unauthenticated } from "../../../../_lib/responses.js";
import { setRegistrationOpenOperation } from "../../../../_lib/operations.js";

export const dynamic = "force-dynamic";

export async function PATCH(
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
  return setRegistrationOpenOperation(resolved.pool, identity, request, eventId);
}
