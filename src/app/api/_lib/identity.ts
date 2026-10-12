/**
 * The server-side identity boundary.
 *
 * Every protected route resolves the caller through this module and nothing else. The return is
 * either an authenticated actor the handlers may trust, or null, which every route maps to 401.
 * Client-supplied user ids, role names, and identity headers are NEVER read here: forged identity
 * material is listed in the threat model as an attack to resist, so the only acceptable input is a
 * session the server can verify.
 *
 * MECHANISM (MVP T1, issue #2): opaque bearer session. The `Authorization: Bearer <token>` value is
 * hashed (SHA-256) and looked up in the session store; a row that is present, unrevoked and
 * unexpired resolves to the user's CURRENT account status and roles, read from storage on every
 * request. Status and role changes therefore take effect on the next request with no session
 * invalidation step (AUTH-12, AUTH-13). The token itself is never stored and never logged.
 *
 * WHAT THIS IS NOT: session issuance (login) and revocation endpoints are future work. Until they
 * land, rows are written by the owner (or test fixtures acting as the owner); the application role
 * holds SELECT only, so resolution is the only runtime path.
 *
 * ERRORS: a database failure propagates rather than returning null. Null means "no verifiable
 * credential", which routes report as 401; an outage is a deployment defect and must surface as a
 * 500, never masquerade as an unauthenticated caller.
 *
 * The pool is optional so routes stay thin: production callers omit it and the process pool is
 * used; tests pass an explicit pool and never touch process state.
 */

import { createHash } from "node:crypto";

import type { Role } from "../../../domain/lifecycle.js";
import { getAppPool } from "./pool.js";

export interface RequestIdentity {
  readonly userId: string;
  /** Read from storage at request time, never trusted from the client. */
  readonly accountStatus: "ACTIVE" | "SUSPENDED" | null;
  /** Read from storage at request time: revocation applies on the next request. */
  readonly roles: readonly Role[];
}

type QueryablePool = {
  query(text: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
};

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header === null) {
    return null;
  }
  const match = /^Bearer (.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  if (token === undefined || token === "") {
    return null;
  }
  return token;
}

export async function resolveRequestIdentity(
  request: Request,
  pool?: QueryablePool,
): Promise<RequestIdentity | null> {
  const token = bearerToken(request);
  if (token === null) {
    return null;
  }
  const store: QueryablePool = pool ?? getAppPool();
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
  const { rows } = await store.query(
    `SELECT u.user_id AS user_id, u.account_status AS account_status,
            COALESCE(array_agg(r.role ORDER BY r.role) FILTER (WHERE r.role IS NOT NULL), '{}') AS roles
       FROM erns.session AS s
       JOIN erns.app_user AS u ON u.user_id = s.user_id
       LEFT JOIN erns.user_role AS r ON r.user_id = u.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
      GROUP BY u.user_id, u.account_status`,
    [tokenHash],
  );
  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  const status = row["account_status"];
  if (status !== "ACTIVE" && status !== "SUSPENDED") {
    return null;
  }
  const roles = row["roles"];
  if (!Array.isArray(roles) || !roles.every((role): role is Role => typeof role === "string")) {
    return null;
  }
  const userId = row["user_id"];
  if (typeof userId !== "string") {
    return null;
  }
  return { userId, accountStatus: status, roles };
}
