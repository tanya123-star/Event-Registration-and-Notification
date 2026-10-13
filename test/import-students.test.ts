/**
 * MVP T8 (issue #9) — Administrator CSV student import.
 *
 * Seams under test (per the tdd skill; agreed via the directive):
 *   - L4 importStudents (real storage): per-row results with valid rows
 *     applied, duplicates never double-provisioned, AUD-01 under the
 *     Administrator identity.
 *   - handler-core importStudentsOperation (real storage): the
 *     Administrator-only gate and the row-number-only response shape.
 *
 * Vocabulary per GLOSSARY.md: Student, Administrator.
 *
 * Requirements covered:
 *   - MVP story 33, MVP gap 7, FR-USR-004, USER-ROLES.md line 328, AUD-01.
 *   - ADR-0001 / RA 10173: per-row results carry row numbers, never
 *     addresses or names.
 *
 * Issue #9 acceptance criteria:
 *   - malformed rows reported per row without blocking valid rows silently
 *   - duplicates reported, never double-provisioned
 *   - audit entry under the Administrator identity
 *   - non-Administrator denied (handler core)
 *   - no account-creation path outside this import (static test)
 *
 * REQUIRES POSTGRESQL. Skipped explicitly when the URL variables are unset.
 */

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
import { importStudents } from "../src/l4/import-students.js";
import type { AuthenticatedActor } from "../src/app/api/_lib/operations.js";
import { importStudentsOperation } from "../src/app/api/_lib/operations.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/import-students.test.ts — ${skipReason()}\n`);
}

const HEADER = "email,display_name,programme,year_level,organization_id";

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

describe.skipIf(!configured)("administrator CSV student import, real PostgreSQL", () => {
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

  function actor(userId: string, roles: AuthenticatedActor["roles"]): AuthenticatedActor {
    return { userId, accountStatus: "ACTIVE", roles };
  }

  it("provisions account, profile and Student role with an AUD-01 audit row", async () => {
    const adminId = await seedUser(ownerPool);

    const outcome = await importStudents(appPool, {
      csvText: csv("ana@example.test,Ana Reyes,BSIT,3,"),
      adminUserId: adminId,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.summary.importedCount).toBe(1);
    expect(outcome.summary.rows).toEqual([{ rowNumber: 2, ok: true }]);

    const { rows: users } = await appPool.query<{ email: string; display_name: string }>(
      `SELECT email, display_name FROM erns.app_user WHERE email = 'ana@example.test'`,
    );
    expect(users).toHaveLength(1);

    const { rows: profiles } = await appPool.query<{
      programme: string;
      year_level: number;
      organization_id: string | null;
      is_eligible: boolean;
    }>(
      `SELECT programme, year_level, organization_id, is_eligible FROM erns.student_profile`,
    );
    expect(profiles).toEqual([
      { programme: "BSIT", year_level: 3, organization_id: null, is_eligible: true },
    ]);

    const { rows: roles } = await appPool.query<{ role: string }>(
      `SELECT role FROM erns.user_role`,
    );
    expect(roles).toEqual([{ role: "STUDENT" }]);

    const { rows: audits } = await appPool.query<{ actor_user_id: string; action: string }>(
      `SELECT actor_user_id, action FROM erns.audit_log WHERE action = 'AUD-01'`,
    );
    expect(audits).toEqual([{ actor_user_id: adminId, action: "AUD-01" }]);
  });

  it("reports a malformed row per row without blocking valid rows silently", async () => {
    const adminId = await seedUser(ownerPool);

    const outcome = await importStudents(appPool, {
      csvText: csv(
        "ana@example.test,Ana Reyes,BSIT,3,",
        "broken-row",
        "ben@example.test,Ben Cruz,BSCS,2,KASAMA",
      ),
      adminUserId: adminId,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.summary.importedCount).toBe(2);
    expect(outcome.summary.rows).toEqual([
      { rowNumber: 2, ok: true },
      {
        rowNumber: 3,
        ok: false,
        reason: "MALFORMED_ROW",
        message: "Row 3 does not have 5 fields",
      },
      { rowNumber: 4, ok: true },
    ]);

    const { rows } = await appPool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM erns.app_user WHERE user_id <> $1`,
      [adminId],
    );
    expect(rows[0]?.count).toBe("2");
  });

  it("reports an in-file duplicate and an existing account without double-provisioning", async () => {
    const adminId = await seedUser(ownerPool);
    const existingId = await seedUser(ownerPool, { email: "old@example.test" });

    const outcome = await importStudents(appPool, {
      csvText: csv(
        "ana@example.test,Ana Reyes,BSIT,3,",
        "ANA@example.test,Ana Twice,BSIT,3,",
        "old@example.test,Old Account,BSCS,1,",
      ),
      adminUserId: adminId,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.summary.importedCount).toBe(1);
    expect(outcome.summary.rows).toEqual([
      { rowNumber: 2, ok: true },
      { rowNumber: 3, ok: false, reason: "DUPLICATE_ROW", message: "Row 3 repeats an email from this file" },
      { rowNumber: 4, ok: false, reason: "DUPLICATE_ACCOUNT", message: "Row 4 matches an existing account" },
    ]);

    const { rows } = await appPool.query<{ email: string }>(
      `SELECT email FROM erns.app_user WHERE lower(email) IN ('ana@example.test', 'old@example.test') ORDER BY email`,
    );
    expect(rows.map((row) => row.email)).toEqual(["ana@example.test", "old@example.test"]);
    void existingId;
  });

  it("exposes no address or name in per-row results (ADR-0001)", async () => {
    const adminId = await seedUser(ownerPool);

    const outcome = await importStudents(appPool, {
      csvText: csv("not-an-email,Ana,BSIT,3,"),
      adminUserId: adminId,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(JSON.stringify(outcome.summary)).not.toMatch(/ana|example\.test|Reyes/i);
  });

  it("denies a non-Administrator import over the handler core with 403 and writes nothing", async () => {
    const staffId = await seedUser(ownerPool);

    const response = await importStudentsOperation(
      appPool,
      actor(staffId, ["ATTENDANCE_STAFF"]),
      new Request("http://test/api/v1/admin/students/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv: csv("ana@example.test,Ana Reyes,BSIT,3,") }),
      }),
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("ROLE_NOT_PERMITTED");

    const { rows } = await appPool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM erns.app_user WHERE user_id <> $1`,
      [staffId],
    );
    expect(rows[0]?.count).toBe("0");
  });

  it("admits an Administrator import over the handler core with per-row results", async () => {
    const adminId = await seedUser(ownerPool);

    const response = await importStudentsOperation(
      appPool,
      actor(adminId, ["ADMINISTRATOR"]),
      new Request("http://test/api/v1/admin/students/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv: csv("ana@example.test,Ana Reyes,BSIT,3,") }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      importedCount: 1,
      rows: [{ rowNumber: 2, ok: true }],
    });
  });
});
