/**
 * POST /api/v1/admin/students/import — Administrator CSV student import.
 *
 * Requires a verified identity (401 otherwise). Administrator only; every
 * other role is refused with 403 before any row is read (MVP story 33). The
 * CSV travels as the `csv` field of a JSON body, following the handler-core
 * JSON contract; per-row results carry row numbers, never addresses
 * (ADR-0001).
 */

import { requirePool } from "../../../../_lib/pool.js";
import { resolveRequestIdentity } from "../../../../_lib/identity.js";
import { requestIdOf, unauthenticated } from "../../../../_lib/responses.js";
import { importStudentsOperation } from "../../../../_lib/operations.js";

export const dynamic = "force-dynamic";

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
  return importStudentsOperation(resolved.pool, identity, request);
}
