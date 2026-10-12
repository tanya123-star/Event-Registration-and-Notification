/**
 * Session and identity resolution — MVP T1 (issue #2).
 *
 * REQUIRES POSTGRESQL. Skipped explicitly when the URL variables are unset.
 *
 * A Student session is an opaque bearer token. The server resolves it per request
 * against storage: session row (unrevoked, unexpired) plus the Student's CURRENT
 * account status and roles. Nothing about identity is trusted from the client.
 *
 * Covered: missing/unknown/expired/revoked session denied, ACTIVE Student resolved
 * with roles from storage, SUSPENDED Student resolved as suspended (registration
 * then refuses with the contact-the-office message), revoked role effective on the
 * next resolution, forged identity headers ignored, and a resolved identity admitted
 * at the route seam with handler cores unchanged.
 */

import { createHash, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";

import {
  applyMigrationsOnce,
  createAppPoolForTests,
  createOwnerPoolForTests,
  isDatabaseConfigured,
  seedUser,
  skipReason,
  truncateAll,
} from "./db-harness.js";
import { resolveRequestIdentity } from "../src/app/api/_lib/identity.js";
import { listEventsOperation } from "../src/app/api/_lib/operations.js";
import { GET as listEventsRoute } from "../src/app/api/v1/events/route.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/session-identity.test.ts — ${skipReason()}\n`);
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

describe.skipIf(!configured)("Student session identity, real PostgreSQL", () => {
  let appPool: Pool;
  let ownerPool: Pool;

  beforeAll(async () => {
    appPool = createAppPoolForTests();
    ownerPool = createOwnerPoolForTests();
    await applyMigrationsOnce(ownerPool);
  });

  beforeEach(async () => {
    await truncateAll(ownerPool);
  });

  afterAll(async () => {
    await appPool?.end();
    await ownerPool?.end();
  });

  async function mintSession(
    userId: string,
    overrides: { readonly expiresInMinutes?: number; readonly revoked?: boolean } = {},
  ): Promise<string> {
    const token = randomUUID();
    const expiresAt =
      overrides.expiresInMinutes === undefined
        ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + overrides.expiresInMinutes * 60 * 1000).toISOString();
    await ownerPool.query(
      `INSERT INTO erns.session (token_hash, user_id, expires_at, revoked_at)
       VALUES ($1, $2, $3::timestamptz, $4::timestamptz)`,
      [tokenHash(token), userId, expiresAt, overrides.revoked === true ? new Date().toISOString() : null],
    );
    return token;
  }

  async function grantRole(userId: string, role: string): Promise<void> {
    await ownerPool.query(`INSERT INTO erns.user_role (user_id, role) VALUES ($1, $2)`, [userId, role]);
  }

  function requestWith(token: string | null, extraHeaders: Record<string, string> = {}): Request {
    const headers: Record<string, string> = { ...extraHeaders };
    if (token !== null) {
      headers["authorization"] = `Bearer ${token}`;
    }
    return new Request("http://test/api/v1/events", { headers });
  }

  it("denies a route with no Student session as unauthenticated", async () => {
    const response = await listEventsRoute(requestWith(null));
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.error.message).toBe("Sign in to use this resource");
  });

  it("resolves an ACTIVE Student session with roles read from storage", async () => {
    const userId = await seedUser(ownerPool);
    await grantRole(userId, "STUDENT");
    const token = await mintSession(userId);

    const identity = await resolveRequestIdentity(requestWith(token), appPool);

    expect(identity).not.toBeNull();
    expect(identity?.userId).toBe(userId);
    expect(identity?.accountStatus).toBe("ACTIVE");
    expect(identity?.roles).toEqual(["STUDENT"]);
  });

  it("denies an unknown session token", async () => {
    const identity = await resolveRequestIdentity(requestWith(randomUUID()), appPool);
    expect(identity).toBeNull();
  });

  it("denies an expired Student session", async () => {
    const userId = await seedUser(ownerPool);
    await grantRole(userId, "STUDENT");
    const token = await mintSession(userId, { expiresInMinutes: -5 });

    const identity = await resolveRequestIdentity(requestWith(token), appPool);
    expect(identity).toBeNull();
  });

  it("denies a revoked Student session", async () => {
    const userId = await seedUser(ownerPool);
    await grantRole(userId, "STUDENT");
    const token = await mintSession(userId, { revoked: true });

    const identity = await resolveRequestIdentity(requestWith(token), appPool);
    expect(identity).toBeNull();
  });

  it("resolves a SUSPENDED Student as suspended so registration refuses", async () => {
    const userId = await seedUser(ownerPool);
    await grantRole(userId, "STUDENT");
    await ownerPool.query(`UPDATE erns.app_user SET account_status = 'SUSPENDED' WHERE user_id = $1`, [userId]);
    const token = await mintSession(userId);

    const identity = await resolveRequestIdentity(requestWith(token), appPool);

    expect(identity).not.toBeNull();
    expect(identity?.accountStatus).toBe("SUSPENDED");

    const response = await listEventsOperation(
      appPool,
      { userId: identity?.userId ?? "", accountStatus: "SUSPENDED" },
      new Request("http://test/api/v1/events"),
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("ACCOUNT_SUSPENDED");
    expect(body.error.message).toBe("Account suspended, contact the office");
  });

  it("applies a revoked role on the next resolution, never from a client payload", async () => {
    const userId = await seedUser(ownerPool);
    await grantRole(userId, "STUDENT");
    await grantRole(userId, "EVENT_OFFICER");
    const token = await mintSession(userId);

    const before = await resolveRequestIdentity(requestWith(token), appPool);
    expect(before?.roles).toEqual(["EVENT_OFFICER", "STUDENT"]);

    await ownerPool.query(`DELETE FROM erns.user_role WHERE user_id = $1 AND role = 'EVENT_OFFICER'`, [userId]);

    const after = await resolveRequestIdentity(requestWith(token), appPool);
    expect(after?.roles).toEqual(["STUDENT"]);
  });

  it("ignores a forged Student identity header", async () => {
    const userId = await seedUser(ownerPool);
    const otherId = await seedUser(ownerPool);
    await grantRole(userId, "STUDENT");
    const token = await mintSession(userId);

    const identity = await resolveRequestIdentity(
      requestWith(token, { "x-user-id": otherId }),
      appPool,
    );
    expect(identity?.userId).toBe(userId);
  });

  it("admits a resolved Student identity at the route seam", async () => {
    const userId = await seedUser(ownerPool);
    await grantRole(userId, "STUDENT");
    const token = await mintSession(userId);

    const response = await listEventsRoute(requestWith(token));
    expect(response.status).not.toBe(401);
  });
});
