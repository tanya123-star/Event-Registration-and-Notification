/**
 * PATCH /api/v1/attendance/[attendanceId]/correction — the audited data-fix path.
 *
 * Requires a verified identity (401 otherwise). Attendance Staff and
 * Administrators correct with a reason (FR-ATT-014); an Event Officer is
 * refused (FR-ATT-016), as is every other non-permitted role. This route plus
 * its operation is the only correction surface: in-app corrections are
 * prohibited (MVP story 36).
 */

import { requirePool } from "../../../../_lib/pool.js";
import { resolveRequestIdentity } from "../../../../_lib/identity.js";
import { requestIdOf, unauthenticated } from "../../../../_lib/responses.js";
import { correctAttendanceOperation } from "../../../../_lib/operations.js";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ attendanceId: string }> },
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
  const { attendanceId } = await context.params;
  return correctAttendanceOperation(resolved.pool, identity, request, attendanceId);
}
