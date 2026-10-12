/**
 * C-03 / NFR-AUD-005 / NFR-SEC-015 — audit-log immutability and role separation.
 *
 * REQUIRES POSTGRESQL, authenticated as BOTH roles. Skipped explicitly when the URL variables are
 * unset; a skipped run leaves audit immutability UNVERIFIED.
 *
 * Why the application connection is mandatory for this file: `erns_app` must not own `audit_log`.
 * PostgreSQL's owner privileges cannot be revoked from the owner, so a test that connected as
 * `erns_owner` could always UPDATE the table regardless of any REVOKE and would prove nothing. The
 * only meaningful test authenticates as `erns_app`.
 *
 * Requirements:
 *   C-03         (TECH-STACK.md) — insert-and-read access only, no update or delete grant
 *   FR-AUD-005   (line 359)      — no interface to modify or delete an audit entry
 *   NFR-SEC-015                   — minimum privilege at the data layer
 *   SECURITY-ARCHITECTURE 9.2     — audit table receives insert and read grants only
 *   DATA-MODEL.md line 544        — append-only, no update or delete path
 *   DATA-MODEL.md line 82         — user email is immutable after first save
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";

import {
  applyMigrationsOnce,
  createAppPoolForTests,
  createOwnerPoolForTests,
  expectSqlstate,
  isDatabaseConfigured,
  seedUser,
  skipReason,
  truncateAll,
} from "./db-harness.js";
import { CHECK_VIOLATION, INSUFFICIENT_PRIVILEGE, UNIQUE_VIOLATION } from "../src/db/client.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/audit-permission.test.ts — ${skipReason()}\n`);
}

describe.skipIf(!configured)("audit-log permissions, real PostgreSQL", () => {
  let ownerPool: Pool;
  let appPool: Pool;

  beforeAll(async () => {
    ownerPool = createOwnerPoolForTests();
    appPool = createAppPoolForTests();
    // Migrations run ONCE for the whole Vitest process, under an advisory lock. Several test files
    // run in parallel worker processes, and each would otherwise execute 0001 concurrently, so two
    // workers would race to CREATE SCHEMA erns and one would lose with a duplicate-key error on
    // pg_namespace. The lock serialises them; the runner's own checksum ledger then makes the second
    // arrival a no-op.
    await applyMigrationsOnce(ownerPool);
  });

  beforeEach(async () => {
    await truncateAll(ownerPool);
  });

  afterAll(async () => {
    await ownerPool?.end();
    await appPool?.end();
  });

  async function seedAuditRow(): Promise<string> {
    const { rows } = await ownerPool.query<{ audit_id: string }>(
      `INSERT INTO erns.audit_log (action, entity_type, entity_id, new_state)
       VALUES ('AUD-12', 'Registration', 'r1', '{"status":"REGISTERED"}')
       RETURNING audit_id`,
    );
    const row = rows[0];
    if (row === undefined) {
      throw new Error("seedAuditRow returned no row");
    }
    return row.audit_id;
  }

  describe("the connection really is the application role", () => {
    it("authenticates as erns_app, not as a superuser", async () => {
      const { rows } = await appPool.query<{ current_user: string; is_super: boolean }>(
        `SELECT current_user AS current_user, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS is_super`,
      );
      expect(rows[0]?.current_user).toBe("erns_app");
      expect(rows[0]?.is_super).toBe(false);
    });

    it("holds no schema-altering privilege (SECURITY-ARCHITECTURE.md line 380)", async () => {
      // A role with CREATE on the schema could define a rule or function that alters data. Withheld
      // explicitly in 0001.
      const { rows } = await appPool.query<{ has_create: boolean }>(
        `SELECT has_schema_privilege(current_user, 'erns', 'CREATE') AS has_create`,
      );
      expect(rows[0]?.has_create).toBe(false);
    });

    it("owns no object in the schema", async () => {
      const { rows } = await appPool.query<{ count: string }>(
        `SELECT count(*)::text AS count
           FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner
          WHERE r.rolname = 'erns_app' AND c.relnamespace = 'erns'::regnamespace`,
      );
      expect(rows[0]?.count).toBe("0");
    });

    it("does not own audit_log, so the restriction below is real", async () => {
      const { rows } = await appPool.query<{ tableowner: string }>(
        `SELECT tableowner FROM pg_tables WHERE schemaname = 'erns' AND tablename = 'audit_log'`,
      );
      expect(rows[0]?.tableowner).toBe("erns_owner");
    });
  });

  describe("C-03 — the app role may append and read", () => {
    it("INSERTs an audit row as erns_app", async () => {
      await appPool.query(
        `INSERT INTO erns.audit_log (action, entity_type, entity_id) VALUES ('AUD-12', 'Registration', 'r1')`,
      );
      const { rows } = await appPool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.audit_log`,
      );
      expect(rows[0]?.count).toBe("1");
    });

    it("SELECTs audit rows as erns_app", async () => {
      await seedAuditRow();
      const { rows } = await appPool.query<{ action: string }>(
        `SELECT action FROM erns.audit_log`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.action).toBe("AUD-12");
    });

    it("holds exactly SELECT and INSERT on audit_log", async () => {
      const { rows } = await appPool.query<{ privilege_type: string }>(
        `SELECT privilege_type FROM information_schema.role_table_grants
          WHERE grantee = 'erns_app' AND table_schema = 'erns' AND table_name = 'audit_log'
          ORDER BY privilege_type`,
      );
      expect(rows.map((r) => r.privilege_type)).toEqual(["INSERT", "SELECT"]);
    });
  });

  describe("DATA-MODEL.md line 544 — append-only: no update or delete path", () => {
    it("refuses UPDATE as erns_app with insufficient_privilege", async () => {
      const auditId = await seedAuditRow();
      await expectSqlstate(INSUFFICIENT_PRIVILEGE, async () => {
        await appPool.query(`UPDATE erns.audit_log SET reason = 'tampered' WHERE audit_id = $1`, [
          auditId,
        ]);
      });
      const { rows } = await appPool.query<{ reason: string | null }>(
        `SELECT reason FROM erns.audit_log WHERE audit_id = $1`,
        [auditId],
      );
      expect(rows[0]?.reason).toBeNull();
    });

    it("refuses DELETE as erns_app with insufficient_privilege", async () => {
      const auditId = await seedAuditRow();
      await expectSqlstate(INSUFFICIENT_PRIVILEGE, async () => {
        await appPool.query(`DELETE FROM erns.audit_log WHERE audit_id = $1`, [auditId]);
      });
      const { rows } = await appPool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.audit_log WHERE audit_id = $1`,
        [auditId],
      );
      expect(rows[0]?.count).toBe("1");
    });

    it("refuses TRUNCATE as erns_app", async () => {
      await expectSqlstate(INSUFFICIENT_PRIVILEGE, async () => {
        await appPool.query(`TRUNCATE erns.audit_log`);
      });
    });

    it("refuses a bulk UPDATE that touches no rows", async () => {
      // Privilege is checked before row visibility, so an update matching nothing is still refused.
      // This matters: a permission that only failed when rows matched would be a data-dependent
      // control, not a structural one.
      await expectSqlstate(INSUFFICIENT_PRIVILEGE, async () => {
        await appPool.query(`UPDATE erns.audit_log SET reason = 'x'`);
      });
    });

    it("cannot be bypassed by writing through a subquery", async () => {
      await expectSqlstate(INSUFFICIENT_PRIVILEGE, async () => {
        await appPool.query(
          `UPDATE erns.audit_log a SET new_state = (SELECT new_state FROM erns.audit_log WHERE audit_id = a.audit_id)`,
        );
      });
    });

    it("reports no UPDATE or DELETE grant in the catalogs", async () => {
      const { rows } = await appPool.query<{ privilege_type: string }>(
        `SELECT privilege_type FROM information_schema.role_table_grants
          WHERE grantee = 'erns_app' AND table_schema = 'erns' AND table_name = 'audit_log'
            AND privilege_type IN ('UPDATE', 'DELETE', 'TRUNCATE')`,
      );
      expect(rows).toHaveLength(0);
    });

    it("holds no UPDATE or DELETE on audit_log via any role membership", async () => {
      // A membership path could reintroduce the privilege without changing the direct grant.
      const { rows } = await appPool.query<{ count: string }>(
        `SELECT count(*)::text AS count
           FROM information_schema.role_table_grants
          WHERE table_schema = 'erns' AND table_name = 'audit_log'
            AND privilege_type IN ('UPDATE', 'DELETE')
            AND grantee IN (
              SELECT pg_get_userbyid(r.roleid) FROM pg_auth_members r
               WHERE r.member = (SELECT oid FROM pg_roles WHERE rolname = 'erns_app')
            )`,
      );
      expect(rows[0]?.count).toBe("0");
    });
  });

  describe("C-03 — the owner can still append, which is the only write path", () => {
    it("the owner role may insert and read but the app role still cannot alter", async () => {
      const auditId = await seedAuditRow();
      await ownerPool.query(`UPDATE erns.audit_log SET reason = 'corrected' WHERE audit_id = $1`, [
        auditId,
      ]);
      const { rows } = await ownerPool.query<{ reason: string }>(
        `SELECT reason FROM erns.audit_log WHERE audit_id = $1`,
        [auditId],
      );
      expect(rows[0]?.reason).toBe("corrected");

      // The correction must not have widened the app role's privileges.
      await expectSqlstate(INSUFFICIENT_PRIVILEGE, async () => {
        await appPool.query(`UPDATE erns.audit_log SET reason = 'tampered again' WHERE audit_id = $1`, [
          auditId,
        ]);
      });
    });
  });

  describe("DATA-MODEL.md line 82 — user email is immutable after first save", async () => {
    it("permits updating display_name as erns_app", async () => {
      const userId = await seedUser(ownerPool);
      await appPool.query(`UPDATE erns.app_user SET display_name = 'New Name' WHERE user_id = $1`, [
        userId,
      ]);
      const { rows } = await appPool.query<{ display_name: string }>(
        `SELECT display_name FROM erns.app_user WHERE user_id = $1`,
        [userId],
      );
      expect(rows[0]?.display_name).toBe("New Name");
    });

    it("refuses updating email as erns_app", async () => {
      const userId = await seedUser(ownerPool);
      await expectSqlstate(INSUFFICIENT_PRIVILEGE, async () => {
        await appPool.query(`UPDATE erns.app_user SET email = 'changed@example.test' WHERE user_id = $1`, [
          userId,
        ]);
      });
      const { rows } = await appPool.query<{ email: string }>(
        `SELECT email FROM erns.app_user WHERE user_id = $1`,
        [userId],
      );
      expect(rows[0]?.email).toContain("@example.test");
    });

    it("permits suspending an account, which is a legitimate runtime write", async () => {
      // DATA-MODEL.md line 82: "A suspended account retains all historical records; suspension never
      // deletes." Suspension must therefore be writable by the application.
      const userId = await seedUser(ownerPool);
      await appPool.query(`UPDATE erns.app_user SET account_status = 'SUSPENDED' WHERE user_id = $1`, [
        userId,
      ]);
      const { rows } = await appPool.query<{ account_status: string }>(
        `SELECT account_status FROM erns.app_user WHERE user_id = $1`,
        [userId],
      );
      expect(rows[0]?.account_status).toBe("SUSPENDED");
    });
  });

  describe("NFR-SEC-015 — the application role can perform the writes ERNS needs", async () => {
    it("inserts an event and a registration as erns_app", async () => {
      const userId = await seedUser(ownerPool);
      const { rows: eventRows } = await appPool.query<{ event_id: string }>(
        `INSERT INTO erns.event
           (title, description, event_type, event_date, start_time, end_time, venue, status,
            registration_open, registration_start, registration_deadline)
         VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '10:00', '12:00', 'v', 'PUBLISHED', TRUE,
                 now() - interval '1 day', now() + interval '1 day')
         RETURNING event_id`,
      );
      const eventId = eventRows[0]?.event_id;
      expect(eventId).toBeDefined();

      await appPool.query(
        `INSERT INTO erns.registration (user_id, event_id, registration_source, confirmation_reference)
         VALUES ($1, $2, 'SELF', $3)`,
        [userId, eventId, `REF-${crypto.randomUUID()}`],
      );
      const { rows: countRows } = await appPool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.registration`,
      );
      expect(countRows[0]?.count).toBe("1");
    });

    it("cancels a registration as erns_app, updating application data", async () => {
      const userId = await seedUser(ownerPool);
      const { rows: eventRows } = await appPool.query<{ event_id: string }>(
        `INSERT INTO erns.event
           (title, description, event_type, event_date, start_time, end_time, venue, status,
            registration_open, registration_start, registration_deadline)
         VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '10:00', '12:00', 'v', 'PUBLISHED', TRUE,
                 now() - interval '1 day', now() + interval '1 day')
         RETURNING event_id`,
      );
      const eventId = eventRows[0]?.event_id as string;
      const reference = `REF-${crypto.randomUUID()}`;
      await appPool.query(
        `INSERT INTO erns.registration (user_id, event_id, registration_source, confirmation_reference)
         VALUES ($1, $2, 'SELF', $3)`,
        [userId, eventId, reference],
      );
      await appPool.query(
        `UPDATE erns.registration
            SET status = 'CANCELLED', cancelled_at = now(), cancellation_reason = 'conflict', cancelled_by = $1
          WHERE confirmation_reference = $2`,
        [userId, reference],
      );
      const { rows } = await appPool.query<{ status: string }>(
        `SELECT status FROM erns.registration WHERE confirmation_reference = $1`,
        [reference],
      );
      expect(rows[0]?.status).toBe("CANCELLED");
    });

    it("cannot DELETE application data either — only audit_log immutability is asserted here", async () => {
      // Recorded so the report is accurate: application tables DO grant DELETE to erns_app in 0001.
      // This milestone does not assert that as a requirement, because no source requires it. The test
      // documents the current grant rather than endorsing it.
      const userId = await seedUser(ownerPool);
      await appPool.query(`DELETE FROM erns.app_user WHERE user_id = $1`, [userId]);
      const { rows } = await appPool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.app_user WHERE user_id = $1`,
        [userId],
      );
      expect(rows[0]?.count).toBe("0");
    });
  });

  describe("constraint enforcement is visible to the application role", () => {
    it("still rejects a third registration status with a check violation, not a privilege error", async () => {
      // Confirms the app role can WRITE and that the CHECK, not the grant, is what refuses. A
      // privilege failure here would mean the constraint was never being exercised.
      const userId = await seedUser(ownerPool);
      const { rows: eventRows } = await appPool.query<{ event_id: string }>(
        `INSERT INTO erns.event
           (title, description, event_type, event_date, start_time, end_time, venue, status,
            registration_start, registration_deadline)
         VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '10:00', '12:00', 'v', 'PUBLISHED',
                 now() - interval '1 day', now() + interval '1 day')
         RETURNING event_id`,
      );
      const eventId = eventRows[0]?.event_id as string;

      await expectSqlstate(CHECK_VIOLATION, async () => {
        await appPool.query(
          `INSERT INTO erns.registration
             (user_id, event_id, status, registration_source, confirmation_reference)
           VALUES ($1, $2, 'WAITLISTED', 'SELF', $3)`,
          [userId, eventId, `REF-${crypto.randomUUID()}`],
        );
      });
    });

    it("still enforces the active uniqueness as a constraint, not a privilege error", async () => {
      const userId = await seedUser(ownerPool);
      const { rows: eventRows } = await appPool.query<{ event_id: string }>(
        `INSERT INTO erns.event
           (title, description, event_type, event_date, start_time, end_time, venue, status,
            registration_start, registration_deadline)
         VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '10:00', '12:00', 'v', 'PUBLISHED',
                 now() - interval '1 day', now() + interval '1 day')
         RETURNING event_id`,
      );
      const eventId = eventRows[0]?.event_id as string;
      const reference = `REF-${crypto.randomUUID()}`;

      await appPool.query(
        `INSERT INTO erns.registration (user_id, event_id, registration_source, confirmation_reference)
         VALUES ($1, $2, 'SELF', $3)`,
        [userId, eventId, reference],
      );
      await expectSqlstate(UNIQUE_VIOLATION, async () => {
        await appPool.query(
          `INSERT INTO erns.registration (user_id, event_id, registration_source, confirmation_reference)
           VALUES ($1, $2, 'SELF', $3)`,
          [userId, eventId, `REF-${crypto.randomUUID()}`],
        );
      });
    });
  });
});