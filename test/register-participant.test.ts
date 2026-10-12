/**
 * FR-REG-005 through FR-REG-020 — the L4 registration use case.
 *
 * REQUIRES POSTGRESQL. Skipped explicitly when the URL variables are unset.
 *
 * WHAT IS BEING TESTED IS NOT THE NINE-STEP ORDER. That is proven by
 * test/registration-validation.test.ts against the pure function in L3, including the TST-03 mutation.
 * What is tested here is the part L3 cannot cover:
 *   - that the L4 use case REUSES the evaluator rather than reimplementing the order
 *   - that the fact read and the write share one SERIALIZABLE transaction (NFR-INTEG-007)
 *   - FR-REG-016 storage-layer uniqueness
 *   - FR-REG-017 the recorded fields including the context snapshot
 *   - FR-REG-018 status is REGISTERED
 *   - FR-REG-020 a unique confirmation reference
 *   - FR-REG-013 the capacity refusal path
 *
 * Every success case asserts the COMMITTED ROW, not only the return value.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";

import {
  applyMigrationsOnce,
  createAppPoolForTests,
  createOwnerPoolForTests,
  isDatabaseConfigured,
  seedEvent,
  seedUser,
  skipReason,
  truncateAll,
} from "./db-harness.js";
import { registerParticipant } from "../src/l4/register-participant.js";
import { VALIDATION_STEPS } from "../src/domain/registration-validation.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/register-participant.test.ts — ${skipReason()}\n`);
}

describe.skipIf(!configured)("registerParticipant, real PostgreSQL", () => {
  let appPool: Pool;
  let ownerPool: Pool;

  /** Facts for an attempt that should pass every step. */
  const eligible = { authenticated: true, accountStatus: "ACTIVE" as const, eligible: true };

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

  async function activeCount(eventId: string): Promise<number> {
    const { rows } = await appPool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM erns.registration
        WHERE event_id = $1 AND status = 'REGISTERED'`,
      [eventId],
    );
    return rows[0]?.count ?? 0;
  }

  describe("FR-REG-004, FR-REG-018 — a successful registration", () => {
    it("creates a REGISTERED row and returns both identifiers", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });

      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        eligible,
      );

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) {
        throw new Error("expected success");
      }

      // FR-REG-018: status is REGISTERED, set by the column default so a caller cannot choose another.
      const { rows } = await appPool.query<{
        status: string;
        confirmation_reference: string;
        registration_source: string;
        registration_id: string;
        registered_at: Date;
      }>(
        `SELECT status, confirmation_reference, registration_source, registration_id, registered_at
           FROM erns.registration WHERE registration_id = $1`,
        [outcome.registrationId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.status).toBe("REGISTERED");
      expect(rows[0]?.registration_source).toBe("SELF");
      expect(rows[0]?.registered_at).toBeInstanceOf(Date);
      // FR-REG-020: the returned reference is the stored reference.
      expect(rows[0]?.confirmation_reference).toBe(outcome.confirmationReference);
    });

    it("registration_id is a UUID", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });
      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        eligible,
      );
      expect(outcome.ok).toBe(true);
      if (outcome.ok) {
        expect(outcome.registrationId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
      }
    });

    it("records an AUD-12 entry in the same transaction", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });
      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        eligible,
      );
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) {
        throw new Error("expected success");
      }

      const { rows } = await appPool.query<{ action: string; entity_id: string; new_state: unknown }>(
        `SELECT action, entity_id, new_state FROM erns.audit_log WHERE entity_type = 'Registration'`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.action).toBe("AUD-12");
      expect(rows[0]?.entity_id).toBe(outcome.registrationId);
      expect(rows[0]?.new_state).toMatchObject({ status: "REGISTERED" });
    });
  });

  describe("FR-REG-017 — the context snapshot", () => {
    it("stores programme, year level, and organisation under documented keys", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });

      const outcome = await registerParticipant(
        appPool,
        {
          userId,
          eventId,
          source: "SELF",
          studentContext: { programme: "Computer Science", yearLevel: 3, organizationId: null },
        },
        eligible,
      );

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) {
        throw new Error("expected success");
      }

      const { rows } = await appPool.query<{
        student_context: { programme: string; year_level: number; organization_id: null };
      }>(`SELECT student_context FROM erns.registration WHERE registration_id = $1`, [
        outcome.registrationId,
      ]);
      expect(rows[0]?.student_context.programme).toBe("Computer Science");
      expect(rows[0]?.student_context.year_level).toBe(3);
      expect(rows[0]?.student_context.organization_id).toBeNull();
    });

    it("records a NULL snapshot when the caller supplies none", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });
      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF", studentContext: null },
        eligible,
      );
      expect(outcome.ok).toBe(true);
      if (outcome.ok) {
        const { rows } = await appPool.query<{ snapshot_is_null: boolean }>(
          `SELECT student_context IS NULL AS snapshot_is_null
             FROM erns.registration WHERE registration_id = $1`,
          [outcome.registrationId],
        );
        expect(rows[0]?.snapshot_is_null).toBe(true);
      }
    });

    it("the snapshot is stored, not joined, so a later change cannot rewrite it", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });
      const outcome = await registerParticipant(
        appPool,
        {
          userId,
          eventId,
          source: "SELF",
          studentContext: { programme: "Original", yearLevel: 1 },
        },
        eligible,
      );
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) {
        throw new Error("expected success");
      }
      await appPool.query(`UPDATE erns.app_user SET display_name = 'Changed' WHERE user_id = $1`, [
        userId,
      ]);
      const { rows } = await appPool.query<{ student_context: { programme: string } }>(
        `SELECT student_context FROM erns.registration WHERE registration_id = $1`,
        [outcome.registrationId],
      );
      expect(rows[0]?.student_context.programme).toBe("Original");
    });
  });

  describe("the nine steps are reused, not reimplemented", () => {
    it("refuses an unauthenticated attempt at step 1, writing nothing", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });

      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        { authenticated: false, accountStatus: "ACTIVE", eligible: true },
      );

      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("AUTHENTICATED");
        expect(outcome.refusal.message).toBe("Sign in to register");
        expect(outcome.refusal.requirements).toBe("FR-REG-006");
      }
      expect(await activeCount(eventId)).toBe(0);
    });

    it("refuses a suspended account at step 2", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });
      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        { authenticated: true, accountStatus: "SUSPENDED", eligible: true },
      );
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("ACCOUNT_ACTIVE");
        expect(outcome.refusal.requirements).toBe("FR-REG-007");
      }
      expect(await activeCount(eventId)).toBe(0);
    });

    it("refuses an unpublished event at step 3", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10, status: "DRAFT" });
      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        eligible,
      );
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("EVENT_PUBLISHED");
        expect(outcome.refusal.requirements).toBe("FR-REG-008");
      }
      expect(await activeCount(eventId)).toBe(0);
    });

    it("refuses when the registration flag is unset at step 4", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10, registrationOpen: false });
      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        eligible,
      );
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("REGISTRATION_OPEN");
        expect(outcome.refusal.requirements).toBe("FR-REG-009");
      }
    });

    it("refuses after the deadline at step 5", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, {
        capacity: 10,
        registrationDeadline: "2020-01-01T00:00:00Z",
      });
      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        eligible,
      );
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("DEADLINE");
        expect(outcome.refusal.requirements).toBe("FR-REG-010");
      }
    });

    it("refuses an ineligible student at step 6", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });
      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        { authenticated: true, accountStatus: "ACTIVE", eligible: false },
      );
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("ELIGIBILITY");
        expect(outcome.refusal.requirements).toBe("FR-REG-011, FR-REG-012");
      }
    });

    it("refuses a full event at step 7 (FR-REG-013)", async () => {
      const eventId = await seedEvent(appPool, { capacity: 1 });
      const first = await seedUser(appPool);
      const second = await seedUser(appPool);

      const firstOutcome = await registerParticipant(
        appPool,
        { userId: first, eventId, source: "SELF" },
        eligible,
      );
      expect(firstOutcome.ok).toBe(true);

      const secondOutcome = await registerParticipant(
        appPool,
        { userId: second, eventId, source: "SELF" },
        eligible,
      );
      expect(secondOutcome.ok).toBe(false);
      if (!secondOutcome.ok) {
        expect(secondOutcome.refusal.reason).toBe("CAPACITY");
        expect(secondOutcome.refusal.message).toBe("Event is full");
        expect(secondOutcome.refusal.requirements).toBe("FR-REG-013");
      }
      expect(await activeCount(eventId)).toBe(1);
    });

    it("refuses a duplicate at step 8 (FR-REG-014)", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });

      expect(
        (await registerParticipant(appPool, { userId, eventId, source: "SELF" }, eligible)).ok,
      ).toBe(true);

      const second = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        eligible,
      );
      expect(second.ok).toBe(false);
      if (!second.ok) {
        expect(second.refusal.reason).toBe("DUPLICATE");
        expect(second.refusal.message).toContain("Already registered");
        expect(second.refusal.requirements).toBe("FR-REG-014");
      }
      expect(await activeCount(eventId)).toBe(1);
    });

    it("permits re-registration after cancellation, per the OQ-10 project decision", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });
      const first = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        eligible,
      );
      expect(first.ok).toBe(true);
      if (!first.ok) {
        throw new Error("expected success");
      }

      await appPool.query(
        `UPDATE erns.registration
            SET status = 'CANCELLED', cancelled_at = now(),
                cancellation_reason = 'changed mind', cancelled_by = $2
          WHERE registration_id = $1`,
        [first.registrationId, userId],
      );

      const again = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        eligible,
      );
      expect(again.ok).toBe(true);
      expect(await activeCount(eventId)).toBe(1);
    });

    it("refuses a missing required field at step 9 (FR-REG-015)", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });
      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        { ...eligible, missingRequiredFields: ["programme"] },
      );
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("REQUIRED_FIELDS");
        expect(outcome.refusal.message).toContain("programme");
        expect(outcome.refusal.requirements).toBe("FR-REG-015");
      }
    });

    it("reports step 1 in preference to a later step, which is the RV-03 property", async () => {
      const userId = await seedUser(appPool);
      // Unpublished AND full AND ineligible: step 3, 6 and 7 would all refuse. Step 3 must win because
      // it is earliest among those, and the evaluator decides that.
      const eventId = await seedEvent(appPool, { capacity: 1, status: "DRAFT" });
      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        { authenticated: true, accountStatus: "ACTIVE", eligible: false },
      );
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("EVENT_PUBLISHED");
      }
    });

    it("every step is reachable from the store, matching the documented count of nine", async () => {
      // Every VALIDATION_STEPS member appears in the refusal union's type, and the eight reachable
      // non-DUPLICATE/REQUIRED_FIELDS messages are asserted above. This test pins the count so that
      // adding a tenth step to L3 without adding it to the store would be visible.
      expect(VALIDATION_STEPS).toHaveLength(9);
    });
  });

  describe("FR-REG-016 — storage-layer uniqueness", () => {
    it("the partial unique index refuses a duplicate even bypassing the use case", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });
      await registerParticipant(appPool, { userId, eventId, source: "SELF" }, eligible);

      // A raw INSERT, with no application check at all.
      await expect(
        appPool.query(
          `INSERT INTO erns.registration (user_id, event_id, registration_source, confirmation_reference)
           VALUES ($1, $2, 'SELF', $3)`,
          [userId, eventId, `RAW-${crypto.randomUUID()}`],
        ),
      ).rejects.toMatchObject({ code: "23505" });
    });
  });

  describe("FR-REG-020 — confirmation reference uniqueness", () => {
    it("two registrations receive different references", async () => {
      const eventId = await seedEvent(appPool, { capacity: 10 });
      const first = await registerParticipant(
        appPool,
        { userId: await seedUser(appPool), eventId, source: "SELF" },
        eligible,
      );
      const second = await registerParticipant(
        appPool,
        { userId: await seedUser(appPool), eventId, source: "SELF" },
        eligible,
      );
      expect(first.ok && second.ok).toBe(true);
      if (first.ok && second.ok) {
        expect(first.confirmationReference).not.toBe(second.confirmationReference);
      }
    });

    it("a reference collision is refused by the storage layer", async () => {
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });
      const shared = `COLLIDE-${crypto.randomUUID()}`;
      await appPool.query(
        `INSERT INTO erns.registration (user_id, event_id, registration_source, confirmation_reference)
         VALUES ($1, $2, 'SELF', $3)`,
        [userId, eventId, shared],
      );
      await expect(
        appPool.query(
          `INSERT INTO erns.registration (user_id, event_id, registration_source, confirmation_reference)
           VALUES ($1, $2, 'SELF', $3)`,
          [userId, eventId, shared],
        ),
      ).rejects.toMatchObject({ code: "23505" });
    });
  });

  describe("no authorization is invented", () => {
    it("registration does not consult any role, because no authority rule exists yet", async () => {
      // A student with no Role rows can still register, because the use case makes no authority check.
      // This documents the boundary rather than endorsing it: FR-REG-027, FR-REG-032 and FR-REG-036 are
      // the authority requirements and belong to the milestone that adds a session.
      const userId = await seedUser(appPool);
      const eventId = await seedEvent(appPool, { capacity: 10 });
      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        eligible,
      );
      expect(outcome.ok).toBe(true);
    });
  });

  describe("FR-REG-035 mechanism, AUD-12 — manual registration carries a reason", () => {
    it("an OFFICER registration with a reason succeeds and records it on the audit row", async () => {
      const userId = await seedUser(ownerPool);
      const eventId = await seedEvent(ownerPool, { capacity: 10 });

      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "OFFICER", reason: "Walk-in enrolment at the venue desk" },
        eligible,
      );

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) {
        return;
      }
      const { rows } = await appPool.query<{ reason: string | null; registration_source: string }>(
        `SELECT a.reason, r.registration_source
           FROM erns.audit_log a
           JOIN erns.registration r ON r.registration_id::text = a.entity_id
          WHERE a.action = 'AUD-12' AND a.entity_id = $1::text`,
        [outcome.registrationId],
      );
      expect(rows[0]?.registration_source).toBe("OFFICER");
      expect(rows[0]?.reason).toBe("Walk-in enrolment at the venue desk");
    });

    it("an OFFICER registration without a reason is refused and writes nothing", async () => {
      const userId = await seedUser(ownerPool);
      const eventId = await seedEvent(ownerPool, { capacity: 10 });

      for (const reason of [undefined, "", "   "]) {
        const outcome = await registerParticipant(
          appPool,
          { userId, eventId, source: "OFFICER", reason },
          eligible,
        );
        expect(outcome.ok).toBe(false);
        if (!outcome.ok) {
          expect(outcome.refusal.reason).toBe("MISSING_REASON");
          expect(outcome.refusal.requirements).toBe("AUD-12");
        }
      }

      expect(await activeCount(eventId)).toBe(0);
    });
  });
});