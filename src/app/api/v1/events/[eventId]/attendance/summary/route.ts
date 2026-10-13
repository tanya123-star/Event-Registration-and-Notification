/**
 * GET /api/v1/events/[eventId]/attendance/summary — the four live counts.
 *
 * Requires a verified identity (401 otherwise). Registered, present, absent and
 * walk-ins, with walk-ins never merged into present (FR-ATT-017, ATT-13).
 */

import { requirePool } from "../../../../../_lib/pool.js";
import { resolveRequestIdentity } from "../../../../../_lib/identity.js";
import { requestIdOf, unauthenticated } from "../../../../../_lib/responses.js";
import { attendanceSummaryOperation } from "../../../../../_lib/operations.js";

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
  return attendanceSummaryOperation(resolved.pool, identity, request, eventId);
}
