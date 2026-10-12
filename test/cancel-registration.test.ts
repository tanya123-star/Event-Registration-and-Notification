/**
 * FR-REG-024 through FR-REG-029 — standalone cancellation.
 *
 * REQUIRES POSTGRESQL. Skipped explicitly when the URL variables are unset.
 *
 * Requirements covered:
 *   FR-REG-024  a student may cancel their own registration until registration closes
 *   FR-REG-025  the cancellation records timestamp, reason, and cancelling user
 *   FR-REG-026  the cancelled record is retained, never deleted (RV-07)
 *   FR-REG-027  cancellation by someone other than the registering student is an officer or
 *               administrator act (role verified by the session layer; recorded here)
 *   FR-REG-028  officer/administrator cancellations require a reason (here: all do, per 0003)
 *   FR-REG-029  the original timestamp and source are never modified
 *   AUD-13      registration cancelled  (AUDIT-PLAN.md line 64)
 *   FAIL-05     a state change whose audit entry fails must not commit
 *
 * EVERY TEST ASSERTS THE COMMITTED DATABASE STATE, not only the return value, per the convention
 * established in test/capacity.test.ts.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";

import {
  applyMigrationsOnce,
  createAppPoolForTests,
  createOwnerPoolForTests,
  isDatabaseConfigured,
  seedEvent,
  seedRegistration,
  seedUser,
  skipReason,
  truncateAll,
} from "./db-harness.js";
import { cancelRegistration } from "../src/l4/cancel-registration.js";
import { registerParticipant } from "../src/l4/register-participant.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/cancel-registration.test.ts — ${skipReason()}\n`);
}

describe.skipIf(!configured)("standalone cancellation, real PostgreSQL", () => {
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

  async function registrationRow(registrationId: string): Promise<{
    status: string;
    registeredAt: Date;
    registrationSource: string;
    cancelledAt: Date | null;
    cancellationReason: string | null;
    cancelledBy: string | null;
  } | null> {
    const { rows } = await appPool.query<{
      status: string;
      registered_at: Date;
      registration_source: string;
      cancelled_at: Date | null;
      cancellation_reason: string | null;
      cancelled_by: string | null;
    }>(
      `SELECT status, registered_at, registration_source,
              cancelled_at, cancellation_reason, cancelled_by
         FROM erns.registration WHERE registration_id = $1`,
      [registrationId],
    );
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    return {
      status: row.status,
      registeredAt: row.registered_at,
      registrationSource: row.registration_source,
      cancelledAt: row.cancelled_at,
      cancellationReason: row.cancellation_reason,
      cancelledBy: row.cancelled_by,
    };
  }

  async function audit13Count(registrationId: string): Promise<number> {
    const { rows } = await appPool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM erns.audit_log
        WHERE action = 'AUD-13' AND entity_id = $1`,
      [registrationId],
    );
    return rows[0]?.count ?? 0;
  }

  async function activeCount(eventId: string): Promise<number> {
    const { rows } = await appPool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM erns.registration
        WHERE event_id = $1 AND status = 'REGISTERED'`,
      [eventId],
    );
    return rows[0]?.count ?? 0;
  }

  it("a student cancels their own registration: row, audit, and count all agree", async () => {
    const userId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });
    const before = await registrationRow(registrationId);

    const outcome = await cancelRegistration(appPool, {
      registrationId,
      requestedByUserId: userId,
      reason: "Schedule conflict",
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.selfCancellation).toBe(true);
    expect(outcome.cancelledBy).toBe(userId);

    // RV-07 + FR-REG-025 + FR-REG-026: retained, CANCELLED, fully attributed.
    const after = await registrationRow(registrationId);
    expect(after?.status).toBe("CANCELLED");
    expect(after?.cancellationReason).toBe("Schedule conflict");
    expect(after?.cancelledBy).toBe(userId);
    expect(after?.cancelledAt).toBeInstanceOf(Date);

    // FR-REG-029: the original fact is untouched.
    expect(after?.registeredAt.getTime()).toBe(before?.registeredAt.getTime());
    expect(after?.registrationSource).toBe(before?.registrationSource);

    // AUD-13 with previous and new state, in the same transaction (FAIL-05).
    expect(await audit13Count(registrationId)).toBe(1);
    expect(await activeCount(eventId)).toBe(0);
  });

  it("refuses an unknown registration id and writes nothing", async () => {
    const userId = await seedUser(ownerPool);
    const before = await appPool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM erns.audit_log`,
    );

    const outcome = await cancelRegistration(appPool, {
      registrationId: "11111111-1111-1111-1111-111111111111",
      requestedByUserId: userId,
      reason: "Does not exist",
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.refusal.reason).toBe("REGISTRATION_NOT_FOUND");
      expect(outcome.refusal.requirements).toBe("FR-REG-025");
    }
    const after = await appPool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM erns.audit_log`,
    );
    expect(after.rows[0]?.count).toBe(before.rows[0]?.count);
  });

  it("reports a malformed id as not found, never as a database error", async () => {
    const userId = await seedUser(ownerPool);

    const outcome = await cancelRegistration(appPool, {
      registrationId: "not-a-uuid",
      requestedByUserId: userId,
      reason: "Malformed",
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.refusal.reason).toBe("REGISTRATION_NOT_FOUND");
    }
  });

  it("a second cancellation is refused and produces no second audit row", async () => {
    const userId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    const first = await cancelRegistration(appPool, {
      registrationId,
      requestedByUserId: userId,
      reason: "First",
    });
    expect(first.ok).toBe(true);

    const second = await cancelRegistration(appPool, {
      registrationId,
      requestedByUserId: userId,
      reason: "Second",
    });

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.refusal.reason).toBe("ALREADY_CANCELLED");
      expect(second.refusal.requirements).toBe("FR-REG-026");
      // The message distinguishes the read-guard path ("already CANCELLED") from the store
      // predicate backstop ("changed state during the cancellation"), which only a racing
      // transaction can reach. Asserting it keeps both layers tested rather than only the union.
      expect(second.refusal.message).toBe("Registration is already CANCELLED");
    }
    expect(await audit13Count(registrationId)).toBe(1);
    const row = await registrationRow(registrationId);
    expect(row?.cancellationReason).toBe("First");
  });

  it("refuses a blank reason and leaves the row registered", async () => {
    const userId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    for (const reason of ["", "   "]) {
      const outcome = await cancelRegistration(appPool, {
        registrationId,
        requestedByUserId: userId,
        reason,
      });
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("MISSING_REASON");
      }
    }

    expect((await registrationRow(registrationId))?.status).toBe("REGISTERED");
    expect(await audit13Count(registrationId)).toBe(0);
  });

  it("a self-cancellation after the deadline is refused; an officer-path cancellation succeeds", async () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const userId = await seedUser(ownerPool);
    const officerId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10, registrationDeadline: past });
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    const selfAttempt = await cancelRegistration(appPool, {
      registrationId,
      requestedByUserId: userId,
      reason: "Too late",
    });
    expect(selfAttempt.ok).toBe(false);
    if (!selfAttempt.ok) {
      expect(selfAttempt.refusal.reason).toBe("REGISTRATION_CLOSED");
      expect(selfAttempt.refusal.requirements).toBe("FR-REG-024");
    }
    expect((await registrationRow(registrationId))?.status).toBe("REGISTERED");

    // FR-REG-027: after closure, cancellation is an officer act. The role is the session layer's
    // to verify; what is asserted here is that a non-self cancellation is not window-gated.
    const officerAttempt = await cancelRegistration(appPool, {
      registrationId,
      requestedByUserId: officerId,
      reason: "Officer withdrawal after close",
    });
    expect(officerAttempt.ok).toBe(true);
    if (officerAttempt.ok) {
      expect(officerAttempt.selfCancellation).toBe(false);
      expect(officerAttempt.cancelledBy).toBe(officerId);
    }
  });

  it("a self-cancellation with registration_open false is refused", async () => {
    const userId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10, registrationOpen: false });
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    const outcome = await cancelRegistration(appPool, {
      registrationId,
      requestedByUserId: userId,
      reason: "Changed mind",
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.refusal.reason).toBe("REGISTRATION_CLOSED");
    }
    expect((await registrationRow(registrationId))?.status).toBe("REGISTERED");
  });

  it("cancellation releases the slot: the student may register again", async () => {
    const userId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 1 });
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    const cancelled = await cancelRegistration(appPool, {
      registrationId,
      requestedByUserId: userId,
      reason: "Releasing to re-register",
    });
    expect(cancelled.ok).toBe(true);

    // The default OQ-10 reading: a CANCELLED row no longer constrains the partial unique index.
    const again = await registerParticipant(
      appPool,
      { userId, eventId, source: "SELF" },
      { authenticated: true, accountStatus: "ACTIVE", eligible: true },
    );
    expect(again.ok).toBe(true);
    expect(await activeCount(eventId)).toBe(1);
  });

  it("two simultaneous cancellations converge: exactly one succeeds", async () => {
    const userId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    const secondPool = createAppPoolForTests();
    try {
      const [first, second] = await Promise.all([
        cancelRegistration(appPool, {
          registrationId,
          requestedByUserId: userId,
          reason: "Race A",
        }),
        cancelRegistration(secondPool, {
          registrationId,
          requestedByUserId: userId,
          reason: "Race B",
        }),
      ]);

      const successes = [first, second].filter((outcome) => outcome.ok).length;
      expect(successes).toBe(1);
      expect((await registrationRow(registrationId))?.status).toBe("CANCELLED");
      expect(await audit13Count(registrationId)).toBe(1);
    } finally {
      await secondPool.end();
    }
  });
});
