/**
 * POST /api/v1/registrations/[registrationId]/cancel — cancel with a reason.
 *
 * A POST to a cancel action rather than DELETE with a body: intermediaries are permitted to drop
 * DELETE bodies, and the reason is required (FR-REG-025, migration 0003), so it must travel
 * reliably. Requires a verified identity (401 otherwise); the canceller is always the identity,
 * never a client-supplied user id.
 */

import { requirePool } from "../../../../_lib/pool.js";
import { resolveRequestIdentity } from "../../../../_lib/identity.js";
import { requestIdOf, unauthenticated } from "../../../../_lib/responses.js";
import { cancelRegistrationOperation } from "../../../../_lib/operations.js";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ registrationId: string }> },
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
  const { registrationId } = await context.params;
  return cancelRegistrationOperation(resolved.pool, identity, request, registrationId);
}
