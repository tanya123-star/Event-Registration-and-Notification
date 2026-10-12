/**
 * Schema constraints, verified against a real PostgreSQL database.
 *
 * REQUIRES POSTGRESQL. Skipped explicitly, with a printed reason, when ERNS_DATABASE_URL or
 * ERNS_APP_URL is unset. A skipped run means these constraints are UNVERIFIED. It does not mean they
 * hold.
 *
 * Requirements covered:
 *   C-01 / DATA-MODEL.md line 399 — unique (user_id, event_id)
 *   OQ-10 project decision        — the uniqueness is PARTIAL on status = 'REGISTERED'
 *   C-05 / lines 405-407          — exactly two registration statuses, third unwritable
 *   line 401                      — cancellation fields required when CANCELLED
 *   line 211                      — capacity is a positive integer
 *   FR-REG-020                    — confirmation reference is unique
 *   AUDIT-PLAN.md lines 52-76     — action is one of exactly 25 classes
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";

import {
  applyMigrationsOnce,
  createOwnerPoolForTests,
  expectSqlstate,
  isDatabaseConfigured,
  seedEvent,
  seedRegistration,
  seedUser,
  skipReason,
  truncateAll,
} from "./db-harness.js";
import { CHECK_VIOLATION, UNIQUE_VIOLATION } from "../src/db/client.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/schema.test.ts — ${skipReason()}\n`);
}

describe.skipIf(!configured)("schema constraints, real PostgreSQL", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createOwnerPoolForTests();
    await applyMigrationsOnce(pool);
  });

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await pool?.end();
  });

  describe("migration ledger", () => {
    it("records every applied migration, derived from the schema directory", async () => {
      // Derived rather than listed. Hard-coding the names made this assertion fail whenever a migration
      // was added, reporting a ledger problem when the ledger was correct.
      const { readdir } = await import("node:fs/promises");
      const { schemaDirectory } = await import("../src/db/migrate.js");
      const expected = (await readdir(schemaDirectory())).filter((n) => n.endsWith(".sql")).sort();

      const { rows } = await pool.query<{ filename: string }>(
        `SELECT filename FROM erns.schema_migrations ORDER BY filename`,
      );
      expect(rows.map((r) => r.filename)).toEqual(expected);
    });
  });

  describe("C-01 and the OQ-10 decision — partial unique index on active registrations", () => {
    it("refuses two REGISTERED registrations for the same user and event", async () => {
      const userId = await seedUser(pool);
      const eventId = await seedEvent(pool);

      await seedRegistration(pool, { userId, eventId });

      await expectSqlstate(UNIQUE_VIOLATION, async () => {
        await seedRegistration(pool, { userId, eventId });
      });
    });

    it("permits re-registration after cancellation, because the index is PARTIAL", async () => {
      // This is the decision itself, at the store. If the index were not partial, or if the predicate
      // included CANCELLED rows, this insert would fail with 23505.
      const userId = await seedUser(pool);
      const eventId = await seedEvent(pool);

      await seedRegistration(pool, { userId, eventId, status: "CANCELLED" });
      await seedRegistration(pool, { userId, eventId, status: "REGISTERED" });

      const { rows } = await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.registration WHERE user_id = $1 AND event_id = $2`,
        [userId, eventId],
      );
      expect(rows[0]?.count).toBe("2");
    });

    it("permits two cancelled registrations, since neither is active", async () => {
      const userId = await seedUser(pool);
      const eventId = await seedEvent(pool);
      await seedRegistration(pool, { userId, eventId, status: "CANCELLED" });
      await seedRegistration(pool, { userId, eventId, status: "CANCELLED" });
      const { rows } = await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.registration WHERE user_id = $1`,
        [userId],
      );
      expect(rows[0]?.count).toBe("2");
    });

    it("permits two different users on the same event", async () => {
      const eventId = await seedEvent(pool);
      const firstUser = await seedUser(pool);
      const secondUser = await seedUser(pool);
      await seedRegistration(pool, { userId: firstUser, eventId });
      await seedRegistration(pool, { userId: secondUser, eventId });
      const { rows } = await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.registration WHERE event_id = $1`,
        [eventId],
      );
      expect(rows[0]?.count).toBe("2");
    });

    it("declares the index with the REGISTERED predicate", async () => {
      const { rows } = await pool.query<{ indexdef: string }>(
        `SELECT indexdef FROM pg_indexes
          WHERE schemaname = 'erns' AND indexname = 'registration_active_user_event_key'`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.indexdef).toContain("UNIQUE");
      expect(rows[0]?.indexdef).toContain("WHERE");
      expect(rows[0]?.indexdef).toContain("status = 'REGISTERED'::text");
    });
  });

  describe("C-05 — registration status domain", () => {
    it.each(["WAITLISTED", "ATTENDED", "ABSENT", "PENDING", "cancelled", ""])(
      "refuses %o, which DATA-MODEL.md lines 405-407 forbid or that is not a status at all",
      async (status) => {
        const userId = await seedUser(pool);
        const eventId = await seedEvent(pool);
        await expectSqlstate(CHECK_VIOLATION, async () => {
          await pool.query(
            `INSERT INTO erns.registration (user_id, event_id, status, registration_source, confirmation_reference)
             VALUES ($1, $2, $3, 'SELF', $4)`,
            [userId, eventId, status, `REF-${crypto.randomUUID()}`],
          );
        });
      },
    );

    it("admits exactly the two documented statuses", async () => {
      const userId = await seedUser(pool);
      const eventId = await seedEvent(pool);
      // CANCELLED requires cancellation fields, supplied here; REGISTERED requires none.
      await pool.query(
        `INSERT INTO erns.registration (user_id, event_id, status, registration_source, confirmation_reference)
         VALUES ($1, $2, 'REGISTERED', 'SELF', $3)`,
        [userId, eventId, `REF-${crypto.randomUUID()}`],
      );
      const secondUser = await seedUser(pool);
      await pool.query(
        `INSERT INTO erns.registration (user_id, event_id, status, registration_source, confirmation_reference,
                                        cancelled_at, cancellation_reason, cancelled_by)
         VALUES ($1, $2, 'CANCELLED', 'SELF', $3, now(), 'changed mind', $1)`,
        [secondUser, eventId, `REF-${crypto.randomUUID()}`],
      );
      const { rows } = await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.registration`,
      );
      expect(rows[0]?.count).toBe("2");
    });
  });

  describe("DATA-MODEL.md line 401 — cancellation field consistency", () => {
    it("refuses CANCELLED without cancelled_at", async () => {
      const userId = await seedUser(pool);
      const eventId = await seedEvent(pool);
      await expectSqlstate(CHECK_VIOLATION, async () => {
        await pool.query(
          `INSERT INTO erns.registration
             (user_id, event_id, status, registration_source, confirmation_reference, cancellation_reason, cancelled_by)
           VALUES ($1, $2, 'CANCELLED', 'SELF', $3, 'reason', $1)`,
          [userId, eventId, `REF-${crypto.randomUUID()}`],
        );
      });
    });

    it("refuses CANCELLED without a cancellation reason", async () => {
      const userId = await seedUser(pool);
      const eventId = await seedEvent(pool);
      await expectSqlstate(CHECK_VIOLATION, async () => {
        await pool.query(
          `INSERT INTO erns.registration
             (user_id, event_id, status, registration_source, confirmation_reference, cancelled_at, cancelled_by)
           VALUES ($1, $2, 'CANCELLED', 'SELF', $3, now(), $1)`,
          [userId, eventId, `REF-${crypto.randomUUID()}`],
        );
      });
    });

    it("refuses CANCELLED with a whitespace-only reason", async () => {
      const userId = await seedUser(pool);
      const eventId = await seedEvent(pool);
      await expectSqlstate(CHECK_VIOLATION, async () => {
        await pool.query(
          `INSERT INTO erns.registration
             (user_id, event_id, status, registration_source, confirmation_reference,
              cancelled_at, cancellation_reason, cancelled_by)
           VALUES ($1, $2, 'CANCELLED', 'SELF', $3, now(), '   ', $1)`,
          [userId, eventId, `REF-${crypto.randomUUID()}`],
        );
      });
    });

    it("refuses CANCELLED without cancelled_by", async () => {
      const userId = await seedUser(pool);
      const eventId = await seedEvent(pool);
      await expectSqlstate(CHECK_VIOLATION, async () => {
        await pool.query(
          `INSERT INTO erns.registration
             (user_id, event_id, status, registration_source, confirmation_reference,
              cancelled_at, cancellation_reason)
           VALUES ($1, $2, 'CANCELLED', 'SELF', $3, now(), 'reason')`,
          [userId, eventId, `REF-${crypto.randomUUID()}`],
        );
      });
    });

    it.each([
      ["cancelled_at", "now()"],
      ["cancelled_at, cancellation_reason", "now(), 'reason'"],
      ["cancellation_reason", "'reason'"],
      ["cancelled_by", `(SELECT user_id FROM erns.app_user WHERE user_id = $1)`],
    ])("refuses %s on an active registration, so a row cannot be half-cancelled", async (columns, values) => {
      // REGRESSION, FIXED IN 0003. The constraint in 0001 read `... OR (status = 'REGISTERED')`,
      // which is true for every active row regardless of its cancellation columns, so a half-cancelled
      // row satisfied it. Migration 0003 requires the cancellation state to agree with `status` in
      // both directions.
      const userId = await seedUser(pool);
      const eventId = await seedEvent(pool);
      await expectSqlstate(CHECK_VIOLATION, async () => {
        await pool.query(
          `INSERT INTO erns.registration
             (user_id, event_id, status, registration_source, confirmation_reference, ${columns})
           VALUES ($1, $2, 'REGISTERED', 'SELF', $3, ${values})`,
          [userId, eventId, `REF-${crypto.randomUUID()}`],
        );
      });
    });

    it("retains all other fields when cancelled, per line 402", async () => {
      const userId = await seedUser(pool);
      const eventId = await seedEvent(pool);
      const reference = `REF-${crypto.randomUUID()}`;
      await pool.query(
        `INSERT INTO erns.registration
           (user_id, event_id, status, registration_source, confirmation_reference, student_context)
         VALUES ($1, $2, 'REGISTERED', 'SELF', $3, '{"programme":"CS","year_level":3}')`,
        [userId, eventId, reference],
      );
      await pool.query(
        `UPDATE erns.registration
            SET status = 'CANCELLED', cancelled_at = now(), cancellation_reason = 'schedule', cancelled_by = $1
          WHERE confirmation_reference = $2`,
        [userId, reference],
      );

      const { rows } = await pool.query<{
        registration_source: string;
        confirmation_reference: string;
        student_context: { programme: string; year_level: number };
        registered_at: Date;
      }>(
        `SELECT registration_source, confirmation_reference, student_context, registered_at
           FROM erns.registration WHERE confirmation_reference = $1`,
        [reference],
      );
      const row = rows[0];
      expect(row?.registration_source).toBe("SELF");
      expect(row?.confirmation_reference).toBe(reference);
      expect(row?.student_context.programme).toBe("CS");
      expect(row?.registered_at).toBeInstanceOf(Date);
    });
  });

  describe("DATA-MODEL.md line 211 — capacity", () => {
    it.each([0, -1, -100])("refuses capacity %i", async (capacity) => {
      await expectSqlstate(CHECK_VIOLATION, async () => {
        await pool.query(
          `INSERT INTO erns.event
             (title, description, event_type, event_date, start_time, end_time, venue, capacity,
              registration_start, registration_deadline)
           VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '10:00', '12:00', 'v', $1,
                   now() - interval '1 day', now() + interval '1 day')`,
          [capacity],
        );
      });
    });

    it("admits capacity 1, the smallest legal value", async () => {
      await pool.query(
        `INSERT INTO erns.event
           (title, description, event_type, event_date, start_time, end_time, venue, capacity,
            registration_start, registration_deadline)
         VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '10:00', '12:00', 'v', 1,
                 now() - interval '1 day', now() + interval '1 day')`,
      );
      const { rows } = await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.event WHERE capacity = 1`,
      );
      expect(rows[0]?.count).toBe("1");
    });

    it("admits a NULL capacity, meaning uncapped", async () => {
      await pool.query(
        `INSERT INTO erns.event
           (title, description, event_type, event_date, start_time, end_time, venue,
            registration_start, registration_deadline)
         VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '10:00', '12:00', 'v',
                 now() - interval '1 day', now() + interval '1 day')`,
      );
      const { rows } = await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.event WHERE capacity IS NULL`,
      );
      expect(rows[0]?.count).toBe("1");
    });
  });

  describe("DATA-MODEL.md lines 208-210 — event time ordering", () => {
    it("refuses end_time at or before start_time", async () => {
      await expectSqlstate(CHECK_VIOLATION, async () => {
        await pool.query(
          `INSERT INTO erns.event
             (title, description, event_type, event_date, start_time, end_time, venue,
              registration_start, registration_deadline)
           VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '12:00', '12:00', 'v',
                   now() - interval '1 day', now() + interval '1 day')`,
        );
      });
    });

    it("refuses a registration window whose start is after its deadline", async () => {
      await expectSqlstate(CHECK_VIOLATION, async () => {
        await pool.query(
          `INSERT INTO erns.event
             (title, description, event_type, event_date, start_time, end_time, venue,
              registration_start, registration_deadline)
           VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '10:00', '12:00', 'v',
                   now() + interval '2 days', now() + interval '1 day')`,
        );
      });
    });
  });

  describe("DATA-MODEL.md line 199 — cancelled event requires a reason", () => {
    it("refuses status CANCELLED with no cancelled_reason", async () => {
      await expectSqlstate(CHECK_VIOLATION, async () => {
        await pool.query(
          `INSERT INTO erns.event
             (title, description, event_type, event_date, start_time, end_time, venue, status,
              registration_start, registration_deadline)
           VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '10:00', '12:00', 'v', 'CANCELLED',
                   now() - interval '1 day', now() + interval '1 day')`,
        );
      });
    });
  });

  describe("event status domain, twelve values from EVENT-LIFECYCLE.md", () => {
    it("refuses a thirteenth status", async () => {
      await expectSqlstate(CHECK_VIOLATION, async () => {
        await pool.query(
          `INSERT INTO erns.event
             (title, description, event_type, event_date, start_time, end_time, venue, status,
              registration_start, registration_deadline)
           VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '10:00', '12:00', 'v', 'PUBLISHED_PENDING',
                   now() - interval '1 day', now() + interval '1 day')`,
        );
      });
    });
  });

  describe("event_type is not constrained, because OQ-02 leaves it unenumerated", () => {
    it("accepts an arbitrary type string rather than inventing a domain", async () => {
      const eventId = await seedEvent(pool, { eventType: "SOMETHING_NOT_YET_ENUMERATED" });
      const { rows } = await pool.query<{ event_type: string }>(
        `SELECT event_type FROM erns.event WHERE event_id = $1`,
        [eventId],
      );
      expect(rows[0]?.event_type).toBe("SOMETHING_NOT_YET_ENUMERATED");
    });
  });

  describe("FR-REG-020 — confirmation reference uniqueness", () => {
    it("refuses two registrations sharing a confirmation reference", async () => {
      const firstUser = await seedUser(pool);
      const secondUser = await seedUser(pool);
      const eventId = await seedEvent(pool);
      const shared = `SHARED-${crypto.randomUUID()}`;

      await seedRegistration(pool, { userId: firstUser, eventId, confirmationReference: shared });
      await expectSqlstate(UNIQUE_VIOLATION, async () => {
        await seedRegistration(pool, { userId: secondUser, eventId, confirmationReference: shared });
      });
    });
  });

  describe("DATA-MODEL.md line 69 — user email uniqueness", () => {
    it("refuses two users with the same email", async () => {
      const email = `dup-${crypto.randomUUID()}@example.test`;
      await seedUser(pool, { email });
      await expectSqlstate(UNIQUE_VIOLATION, async () => {
        await seedUser(pool, { email });
      });
    });
  });

  describe("AUDIT-PLAN.md lines 52-76 — the 25 action classes", () => {
    it.each(["AUD-01", "AUD-12", "AUD-13", "AUD-25"])("admits %s", async (action) => {
      await pool.query(
        `INSERT INTO erns.audit_log (actor_user_id, action, entity_type, entity_id)
         VALUES (NULL, $1, 'Event', 'e1')`,
        [action],
      );
    });

    it("admits exactly 25 distinct action codes and nothing else", async () => {
      for (let n = 1; n <= 25; n += 1) {
        await pool.query(
          `INSERT INTO erns.audit_log (action, entity_type, entity_id) VALUES ($1, 'Event', $2)`,
          [`AUD-${String(n).padStart(2, "0")}`, `e${n}`],
        );
      }
      const { rows } = await pool.query<{ count: string }>(
        `SELECT count(DISTINCT action)::text AS count FROM erns.audit_log`,
      );
      expect(rows[0]?.count).toBe("25");
    });

    it.each(["AUD-00", "AUD-26", "AUD-99", "aud-01", "REGISTERED"])("refuses %o", async (action) => {
      await expectSqlstate(CHECK_VIOLATION, async () => {
        await pool.query(
          `INSERT INTO erns.audit_log (action, entity_type, entity_id) VALUES ($1, 'Event', 'e1')`,
          [action],
        );
      });
    });
  });

  describe("audit_log actor_user_id foreign key, per the project-owner decision", () => {
    it("admits a null actor for a system-initiated action", async () => {
      await pool.query(
        `INSERT INTO erns.audit_log (actor_user_id, action, entity_type, entity_id)
         VALUES (NULL, 'AUD-15', 'Event', 'e1')`,
      );
      const { rows } = await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.audit_log WHERE actor_user_id IS NULL`,
      );
      expect(rows[0]?.count).toBe("1");
    });

    it("refuses an actor that does not exist", async () => {
      await expectSqlstate("23503", async () => {
        await pool.query(
          `INSERT INTO erns.audit_log (actor_user_id, action, entity_type, entity_id)
           VALUES ($1, 'AUD-12', 'Registration', 'r1')`,
          [crypto.randomUUID()],
        );
      });
    });

    it("does not cascade-delete audit history when the user is deleted (FR-AUD-006)", async () => {
      // ON DELETE RESTRICT means the user deletion is REFUSED while audit rows reference it. That is
      // the documented behaviour: DATA-MODEL.md line 548 requires audit records never to be
      // cascade-deleted with their subject.
      const userId = await seedUser(pool);
      await pool.query(
        `INSERT INTO erns.audit_log (actor_user_id, action, entity_type, entity_id)
         VALUES ($1, 'AUD-12', 'Registration', 'r1')`,
        [userId],
      );

      await expectSqlstate("23503", async () => {
        await pool.query(`DELETE FROM erns.app_user WHERE user_id = $1`, [userId]);
      });

      const { rows } = await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.audit_log WHERE actor_user_id = $1`,
        [userId],
      );
      expect(rows[0]?.count).toBe("1");
    });

    it("no foreign key in the erns schema cascades, nulls, or defaults on delete (FR-AUD-006)", async () => {
      // The structural half of the guarantee above. The RESTRICT test proves what today's schema
      // does; this proves no later migration can silently introduce a CASCADE, SET NULL, or SET
      // DEFAULT that erases attribution or history. A migration that legitimately needs one must
      // change this test visibly first, per TESTING-STRATEGY.md rule 4.
      const { rows } = await pool.query<{ table_name: string; constraint_name: string; delete_rule: string }>(
        `SELECT tc.table_name, tc.constraint_name, rc.delete_rule
           FROM information_schema.referential_constraints rc
           JOIN information_schema.table_constraints tc
             ON tc.constraint_name = rc.constraint_name
            AND tc.constraint_schema = rc.constraint_schema
          WHERE tc.table_schema = 'erns'
            AND rc.delete_rule NOT IN ('NO ACTION', 'RESTRICT')
          ORDER BY tc.table_name, tc.constraint_name`,
      );
      expect(rows).toEqual([]);
    });
  });

  describe("student_context is JSONB with documented keys", () => {
    it("stores the documented snapshot fields", async () => {
      const userId = await seedUser(pool);
      const eventId = await seedEvent(pool);
      const registrationId = await seedRegistration(pool, {
        userId,
        eventId,
        studentContext: { programme: "Computer Science", year_level: 3, organization_id: null },
      });

      const { rows } = await pool.query<{
        student_context: { programme: string; year_level: number; organization_id: null };
      }>(`SELECT student_context FROM erns.registration WHERE registration_id = $1`, [
        registrationId,
      ]);
      expect(rows[0]?.student_context.programme).toBe("Computer Science");
      expect(rows[0]?.student_context.year_level).toBe(3);
      expect(rows[0]?.student_context.organization_id).toBeNull();
    });

    it("retains the snapshot when the underlying data would change", async () => {
      // DATA-MODEL.md line 403: the snapshot means a later change does not rewrite history. There is
      // no StudentProfile table yet, so this asserts the value is stored independently of any other
      // table rather than joined at read time.
      const userId = await seedUser(pool);
      const eventId = await seedEvent(pool);
      const registrationId = await seedRegistration(pool, {
        userId,
        eventId,
        studentContext: { programme: "Original Programme", year_level: 1, organization_id: null },
      });
      await pool.query(`UPDATE erns.app_user SET display_name = 'Changed Name' WHERE user_id = $1`, [
        userId,
      ]);
      const { rows } = await pool.query<{ student_context: { programme: string } }>(
        `SELECT student_context FROM erns.registration WHERE registration_id = $1`,
        [registrationId],
      );
      expect(rows[0]?.student_context.programme).toBe("Original Programme");
    });
  });
});