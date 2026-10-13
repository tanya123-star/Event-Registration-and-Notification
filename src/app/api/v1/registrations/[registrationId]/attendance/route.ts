/**
 * POST /api/v1/registrations/[registrationId]/attendance — record one attendance.
 *
 * Requires a verified identity (401 otherwise); the recorder is always the identity,
 * never a client-supplied user id. Attendance Staff and Administrators record
 * (USER-ROLES.md section 4); every other role is refused by the operation.
 */

import { requirePool } from "../../../../_lib/pool.js";
import { resolveRequestIdentity } from "../../../../_lib/identity.js";
import { requestIdOf, unauthenticated } from "../../../../_lib/responses.js";
import { recordAttendanceOperation } from "../../../../_lib/operations.js";

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
  return recordAttendanceOperation(resolved.pool, identity, request, registrationId);
}
