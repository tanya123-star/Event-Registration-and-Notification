/**
 * RV-11 and FR-REG-037 — capacity reduction refuses to go below the registered count.
 *
 * REQUIRES POSTGRESQL. Skipped explicitly when the URL variables are unset.
 *
 * Requirements covered:
 *   FR-REG-037  "The system shall refuse to reduce capacity below the count of existing registrations"
 *   RV-11       expected outcome: Rejected                        (TESTING-STRATEGY.md line 83)
 *   FR-EVT-009  "refuse a participant capacity that is not a positive integer"
 *   FR-EVT-016  "record who last modified an event and when"
 *   AUD-05      event edited            (AUDIT-PLAN.md line 56)
 *   AUD-13      registration cancelled  (AUDIT-PLAN.md line 64)
 *   FR-REG-028  a reason is required for a cancellation by anyone other than the student
 *
 * EVERY REFUSAL TEST ASSERTS THE COMMITTED DATABASE STATE, not only the return value. A function that
 * returned a refusal while having already written the capacity change would pass a return-value
 * assertion and leave the invariant broken, so the row is re-read after each case.
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
import { reduceEventCapacity } from "../src/l4/capacity.js";
import type { CapacityReductionRefusal } from "../src/db/registration-store.types.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/capacity.test.ts — ${skipReason()}\n`);
}

describe.skipIf(!configured)("capacity reduction, real PostgreSQL", () => {
  /**
   * TWO POOLS, DELIBERATELY.
   *
   * `appPool` is the role under test: every assertion here runs as `erns_app`, because the
   * capacity-reduction path must be usable by the application role.
   *
   * `ownerPool` exists ONLY to truncate between tests. `erns_app` has no TRUNCATE grant on audit_log —
   * that is migration 0002 working as designed — so truncating on the app pool fails with
   * "permission denied for table audit_log". test/db-harness.ts states this at its header. Passing the
   * app pool to truncateAll is a mistake worth naming, and the failure is the permission model working.
   */
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

  /** Read the committed capacity, so assertions are about the database and not the return value. */
  async function storedCapacity(eventId: string): Promise<number | null> {
    const { rows } = await appPool.query<{ capacity: number | null }>(
      `SELECT capacity FROM erns.event WHERE event_id = $1`,
      [eventId],
    );
    return rows[0]?.capacity ?? null;
  }

  async function activeCount(eventId: string): Promise<number> {
    const { rows } = await appPool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM erns.registration
        WHERE event_id = $1 AND status = 'REGISTERED'`,
      [eventId],
    );
    return rows[0]?.count ?? 0;
  }

  async function statusOf(registrationId: string): Promise<string | null> {
    const { rows } = await appPool.query<{ status: string }>(
      `SELECT status FROM erns.registration WHERE registration_id = $1`,
      [registrationId],
    );
    return rows[0]?.status ?? null;
  }

  /** Seed an event with `registrants` active registrations. */
  async function seedWithRegistrants(
    capacity: number | null,
    registrants: number,
  ): Promise<{ eventId: string; userIds: string[]; registrationIds: string[] }> {
    const eventId = await seedEvent(appPool, { capacity });
    const userIds: string[] = [];
    const registrationIds: string[] = [];
    for (let i = 0; i < registrants; i += 1) {
      const userId = await seedUser(appPool);
      userIds.push(userId);
      registrationIds.push(await seedRegistration(appPool, { userId, eventId }));
    }
    return { eventId, userIds, registrationIds };
  }

  describe("RV-11 — reduction below the registered count is rejected", () => {
    it("refuses capacity 2 with 4 registered, and leaves the row unchanged", async () => {
      const { eventId } = await seedWithRegistrants(5, 4);

      const outcome = await reduceEventCapacity(appPool, {
        eventId,
        requestedCapacity: 2,
        actorUserId: null,
      });

      expect(outcome.ok).toBe(false);
      if (!outcome.ok && outcome.refusal.kind === "CAPACITY_REDUCTION_REFUSED") {
        expect(outcome.refusal.exceedsBy).toBe(2);
        expect(outcome.refusal.currentRegisteredCount).toBe(4);
        expect(outcome.refusal.remainingRegisteredCount).toBe(4);
        expect(outcome.refusal.requestedCapacity).toBe(2);
        expect(outcome.refusal.requirements).toBe("FR-REG-037");
      } else {
        throw new Error("expected a CAPACITY_REDUCTION_REFUSED");
      }

      // The committed state is what matters. Capacity must be untouched.
      expect(await storedCapacity(eventId)).toBe(5);
      expect(await activeCount(eventId)).toBe(4);
    });

    it("refuses capacity one below the registered count", async () => {
      const { eventId } = await seedWithRegistrants(10, 5);
      const outcome = await reduceEventCapacity(appPool, { eventId, requestedCapacity: 4 });
      expect(outcome.ok).toBe(false);
      expect(await storedCapacity(eventId)).toBe(10);
    });

    it("ACCEPTS a reduction to exactly the registered count, which is the boundary", async () => {
      // "Never exceeds" is satisfied when count === capacity. REFUSING here would be stricter than
      // FR-REG-037 requires and would make the limit unattainable.
      const { eventId } = await seedWithRegistrants(10, 4);
      const outcome = await reduceEventCapacity(appPool, {
        eventId,
        requestedCapacity: 4,
        actorUserId: null,
      });
      expect(outcome.ok).toBe(true);
      expect(await storedCapacity(eventId)).toBe(4);
      expect(await activeCount(eventId)).toBe(4);
    });

    it("accepts a reduction above the registered count", async () => {
      const { eventId } = await seedWithRegistrants(10, 3);
      const outcome = await reduceEventCapacity(appPool, { eventId, requestedCapacity: 7 });
      expect(outcome.ok).toBe(true);
      expect(await storedCapacity(eventId)).toBe(7);
    });

    it("accepts a reduction to 1 on an empty event", async () => {
      const eventId = await seedEvent(appPool, { capacity: 5 });
      const outcome = await reduceEventCapacity(appPool, { eventId, requestedCapacity: 1 });
      expect(outcome.ok).toBe(true);
      expect(await storedCapacity(eventId)).toBe(1);
    });

    it("refuses on an event that does not exist", async () => {
      const outcome = await reduceEventCapacity(appPool, {
        eventId: crypto.randomUUID(),
        requestedCapacity: 5,
      });
      expect(outcome.ok).toBe(false);
    });
  });

  describe("FR-EVT-009 — capacity must be a positive integer", () => {
    it.each([0, -1, -100])("refuses capacity %i without writing", async (requested) => {
      const { eventId } = await seedWithRegistrants(5, 1);
      const outcome = await reduceEventCapacity(appPool, { eventId, requestedCapacity: requested });
      expect(outcome.ok).toBe(false);
      expect(await storedCapacity(eventId)).toBe(5);
    });

    it("refuses a non-integer capacity", async () => {
      const { eventId } = await seedWithRegistrants(5, 1);
      const outcome = await reduceEventCapacity(appPool, { eventId, requestedCapacity: 2.5 });
      expect(outcome.ok).toBe(false);
      expect(await storedCapacity(eventId)).toBe(5);
    });

    it("the storage-layer CHECK remains as a backstop against a direct UPDATE", async () => {
      // The use case refuses first, so the constraint is never exercised through it. It must still hold
      // for anything that bypasses L4, which is what `event_capacity_positive_check` is for.
      const eventId = await seedEvent(appPool, { capacity: 5 });
      await expect(
        appPool.query(`UPDATE erns.event SET capacity = 0 WHERE event_id = $1`, [eventId]),
      ).rejects.toMatchObject({ code: "23514" });
    });
  });

  describe("DATA-MODEL.md:212-213 — simultaneous participant removal", () => {
    it("cancels the named registrations and applies the reduction together", async () => {
      const { eventId, registrationIds } = await seedWithRegistrants(10, 4);

      const outcome = await reduceEventCapacity(appPool, {
        eventId,
        requestedCapacity: 2,
        removeRegistrationIds: [registrationIds[0] as string, registrationIds[1] as string],
        reason: "room reallocated",
        actorUserId: null,
      });

      expect(outcome.ok).toBe(true);
      if (outcome.ok) {
        expect(outcome.removedRegistrationIds).toHaveLength(2);
        expect(outcome.remainingRegisteredCount).toBe(2);
        expect(outcome.newCapacity).toBe(2);
      }

      // Committed state: two cancelled, two still registered, capacity 2. Never exceeded.
      expect(await statusOf(registrationIds[0] as string)).toBe("CANCELLED");
      expect(await statusOf(registrationIds[1] as string)).toBe("CANCELLED");
      expect(await statusOf(registrationIds[2] as string)).toBe("REGISTERED");
      expect(await activeCount(eventId)).toBe(2);
      expect(await storedCapacity(eventId)).toBe(2);
    });

    it("REFUSES and rolls back every cancellation when the removals are insufficient", async () => {
      // Four registered, two removed, still two remaining, request 1. The removal is cancelled but the
      // reduction is not, so BOTH must be discarded. This is the all-or-nothing requirement.
      const { eventId, registrationIds } = await seedWithRegistrants(10, 4);

      const outcome = await reduceEventCapacity(appPool, {
        eventId,
        requestedCapacity: 1,
        removeRegistrationIds: [registrationIds[0] as string, registrationIds[1] as string],
        reason: "too aggressive",
        actorUserId: null,
      });

      expect(outcome.ok).toBe(false);
      if (!outcome.ok && outcome.refusal.kind === "CAPACITY_REDUCTION_REFUSED") {
        expect(outcome.refusal.remainingRegisteredCount).toBe(2);
        expect(outcome.refusal.exceedsBy).toBe(1);
      } else {
        throw new Error("expected a CAPACITY_REDUCTION_REFUSED");
      }

      // THE ROLLBACK ASSERTION. Both cancellations must have been discarded.
      expect(await statusOf(registrationIds[0] as string)).toBe("REGISTERED");
      expect(await statusOf(registrationIds[1] as string)).toBe("REGISTERED");
      expect(await activeCount(eventId)).toBe(4);
      expect(await storedCapacity(eventId)).toBe(10);
    });

    it("refuses a removal naming a registration from a different event", async () => {
      const first = await seedWithRegistrants(10, 2);
      const secondEventId = await seedEvent(appPool, { capacity: 10 });
      // A registration on the OTHER event, which is the case WRONG_EVENT exists for. Reducing
      // `first.eventId` while naming a registration belonging to `secondEventId` must be refused, and
      // neither event may change.
      const foreignUser = await seedUser(appPool);
      const foreignRegistrationId = await seedRegistration(appPool, {
        userId: foreignUser,
        eventId: secondEventId,
      });

      const outcome = await reduceEventCapacity(appPool, {
        eventId: first.eventId,
        requestedCapacity: 1,
        removeRegistrationIds: [foreignRegistrationId],
        reason: "wrong event",
        actorUserId: null,
      });

      // Valid: the id exists and is active. Invalid: it belongs elsewhere. Nothing may be written.
      expect(outcome.ok).toBe(false);
      if (!outcome.ok && outcome.refusal.kind === "REMOVAL_REJECTED") {
        expect(outcome.refusal.reason).toBe("WRONG_EVENT");
        expect(outcome.refusal.registrationId).toBe(foreignRegistrationId);
      } else {
        throw new Error("expected a REMOVAL_REJECTED");
      }
      // Nothing changed on either event, and the foreign registration is untouched.
      expect(await statusOf(first.registrationIds[0] as string)).toBe("REGISTERED");
      expect(await statusOf(foreignRegistrationId)).toBe("REGISTERED");
      expect(await storedCapacity(first.eventId)).toBe(10);
      expect(await storedCapacity(secondEventId)).toBe(10);
      expect(await activeCount(first.eventId)).toBe(2);
      expect(await activeCount(secondEventId)).toBe(1);
    });

    it("refuses a removal naming a registration that does not exist", async () => {
      const { eventId } = await seedWithRegistrants(10, 2);
      const outcome = await reduceEventCapacity(appPool, {
        eventId,
        requestedCapacity: 1,
        removeRegistrationIds: [crypto.randomUUID()],
        reason: "nonexistent",
        actorUserId: null,
      });
      expect(outcome.ok).toBe(false);
      if (!outcome.ok && outcome.refusal.kind === "REMOVAL_REJECTED") {
        expect(outcome.refusal.reason).toBe("REGISTRATION_NOT_FOUND");
      } else {
        throw new Error("expected a REMOVAL_REJECTED");
      }
      expect(await storedCapacity(eventId)).toBe(10);
    });

    it("refuses a removal naming an already-cancelled registration", async () => {
      const { eventId, registrationIds } = await seedWithRegistrants(10, 2);
      const first = registrationIds[0] as string;
      // Cancel it directly, so it is CANCELLED but not part of the active count.
      await appPool.query(
        `UPDATE erns.registration
            SET status = 'CANCELLED', cancelled_at = now(),
                cancellation_reason = 'earlier', cancelled_by = user_id
          WHERE registration_id = $1`,
        [first],
      );

      const outcome = await reduceEventCapacity(appPool, {
        eventId,
        requestedCapacity: 1,
        removeRegistrationIds: [first],
        reason: "already gone",
        actorUserId: null,
      });

      expect(outcome.ok).toBe(false);
      if (!outcome.ok && outcome.refusal.kind === "REMOVAL_REJECTED") {
        expect(outcome.refusal.reason).toBe("NOT_ACTIVE");
      } else {
        throw new Error("expected a REMOVAL_REJECTED");
      }
      expect(await storedCapacity(eventId)).toBe(10);
    });

    it("refuses a duplicated removal id before touching the database", async () => {
      const { eventId, registrationIds } = await seedWithRegistrants(10, 3);
      const id = registrationIds[0] as string;
      const outcome = await reduceEventCapacity(appPool, {
        eventId,
        requestedCapacity: 1,
        removeRegistrationIds: [id, id],
        reason: "duplicated",
        actorUserId: null,
      });
      expect(outcome.ok).toBe(false);
      if (!outcome.ok && outcome.refusal.kind === "REMOVAL_REJECTED") {
        expect(outcome.refusal.reason).toBe("DUPLICATE_REMOVAL_REQUEST");
      } else {
        throw new Error("expected a REMOVAL_REJECTED");
      }
      expect(await activeCount(eventId)).toBe(3);
    });

    it("FR-REG-028 — refuses a removal with no reason", async () => {
      // A removal during a capacity reduction is never a student's own cancellation, so FR-REG-028
      // requires a reason from whoever performs it.
      const { eventId, registrationIds } = await seedWithRegistrants(10, 3);
      const outcome = await reduceEventCapacity(appPool, {
        eventId,
        requestedCapacity: 2,
        removeRegistrationIds: [registrationIds[0] as string],
        reason: "   ",
        actorUserId: null,
      });
      expect(outcome.ok).toBe(false);
      expect(await statusOf(registrationIds[0] as string)).toBe("REGISTERED");
      expect(await storedCapacity(eventId)).toBe(10);
    });

    it("cancelled registrations do not count toward the remaining total", async () => {
      // Consistent with the OQ-10 project decision: a cancelled registration releases its slot.
      const { eventId, registrationIds } = await seedWithRegistrants(10, 3);
      await appPool.query(
        `UPDATE erns.registration
            SET status = 'CANCELLED', cancelled_at = now(),
                cancellation_reason = 'earlier', cancelled_by = user_id
          WHERE registration_id = $1`,
        [registrationIds[0] as string],
      );
      // Two remain active, so a reduction to 2 is permitted.
      const outcome = await reduceEventCapacity(appPool, { eventId, requestedCapacity: 2 });
      expect(outcome.ok).toBe(true);
      expect(await storedCapacity(eventId)).toBe(2);
    });
  });

  describe("FR-EVT-016 — modification metadata", () => {
    it("records the actor and the time on a successful reduction", async () => {
      const actorId = await seedUser(appPool);
      const { eventId } = await seedWithRegistrants(10, 1);

      const before = await appPool.query<{ updated_at: Date }>(
        `SELECT updated_at FROM erns.event WHERE event_id = $1`,
        [eventId],
      );

      const outcome = await reduceEventCapacity(appPool, {
        eventId,
        requestedCapacity: 4,
        actorUserId: actorId,
      });

      expect(outcome.ok).toBe(true);
      const { rows } = await appPool.query<{ updated_by: string | null; updated_at: Date }>(
        `SELECT updated_by, updated_at FROM erns.event WHERE event_id = $1`,
        [eventId],
      );
      expect(rows[0]?.updated_by).toBe(actorId);
      expect(rows[0]?.updated_at).toBeInstanceOf(Date);
      // The timestamp moved forward. A 1ms guard avoids flakiness on a coarse clock.
      expect(rows[0]?.updated_at.getTime()).toBeGreaterThanOrEqual(
        (before.rows[0]?.updated_at.getTime() ?? 0) - 1,
      );
    });

    it("records updated_by NULL when no actor is supplied, rather than inventing one", async () => {
      const { eventId } = await seedWithRegistrants(10, 1);
      await reduceEventCapacity(appPool, { eventId, requestedCapacity: 4, actorUserId: null });
      const { rows } = await appPool.query<{ updated_by: string | null }>(
        `SELECT updated_by FROM erns.event WHERE event_id = $1`,
        [eventId],
      );
      expect(rows[0]?.updated_by).toBeNull();
    });

    it("leaves updated_at unchanged when the reduction is refused", async () => {
      const { eventId } = await seedWithRegistrants(10, 4);
      const before = await appPool.query<{ updated_at: Date; updated_by: string | null }>(
        `SELECT updated_at, updated_by FROM erns.event WHERE event_id = $1`,
        [eventId],
      );
      await reduceEventCapacity(appPool, { eventId, requestedCapacity: 1, actorUserId: null });
      const after = await appPool.query<{ updated_at: Date; updated_by: string | null }>(
        `SELECT updated_at, updated_by FROM erns.event WHERE event_id = $1`,
        [eventId],
      );
      expect(after.rows[0]?.updated_at).toEqual(before.rows[0]?.updated_at);
      expect(after.rows[0]?.updated_by).toEqual(before.rows[0]?.updated_by);
    });

    it("initialises updated_at at creation time rather than at migration time", async () => {
      // 0004 backfills from now() at migration, so for a row created afterwards updated_at is its
      // creation time. A NULL default that resolved to migration time would make this lag enormous.
      //
      // `EXTRACT` returns numeric in PostgreSQL, which node-postgres hands over as a STRING. It is cast
      // to double precision here; an earlier version compared a string with a number and failed with
      // "actual value must be number or bigint, received \"string\"".
      const eventId = await seedEvent(appPool, { capacity: 5 });
      const { rows } = await appPool.query<{ updated_at: Date; lag_ms: number }>(
        `SELECT updated_at,
                EXTRACT(EPOCH FROM (now() - updated_at)) * 1000::double precision AS lag_ms
           FROM erns.event WHERE event_id = $1`,
        [eventId],
      );
      expect(rows[0]?.updated_at).toBeInstanceOf(Date);
      // Not in the future, and not absurdly old.
      expect(rows[0]?.lag_ms ?? -1).toBeLessThan(60_000);
      expect(rows[0]?.lag_ms ?? -1).toBeGreaterThanOrEqual(-1_000);
    });

    it("updated_by is NULL on a freshly created event", async () => {
      // No modifier exists until someone modifies it, and inventing an actor is worse than recording
      // none.
      const eventId = await seedEvent(appPool, { capacity: 5 });
      const { rows } = await appPool.query<{ updated_by: string | null }>(
        `SELECT updated_by FROM erns.event WHERE event_id = $1`,
        [eventId],
      );
      expect(rows[0]?.updated_by).toBeNull();
    });
  });

  describe("audit entries", () => {
    it("records AUD-05 for the event modification", async () => {
      const actorId = await seedUser(appPool);
      const { eventId } = await seedWithRegistrants(10, 1);
      await reduceEventCapacity(appPool, {
        eventId,
        requestedCapacity: 4,
        actorUserId: actorId,
        reason: "room shrunk",
      });

      const { rows } = await appPool.query<{ action: string; previous_state: unknown; new_state: unknown }>(
        `SELECT action, previous_state, new_state FROM erns.audit_log
          WHERE entity_type = 'Event' AND entity_id = $1`,
        [eventId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.action).toBe("AUD-05");
      expect(rows[0]?.previous_state).toMatchObject({ capacity: 10 });
      expect(rows[0]?.new_state).toMatchObject({ capacity: 4 });
    });

    it("records AUD-13 for each simultaneous removal", async () => {
      const { eventId, registrationIds } = await seedWithRegistrants(10, 3);
      await reduceEventCapacity(appPool, {
        eventId,
        requestedCapacity: 1,
        removeRegistrationIds: [registrationIds[0] as string, registrationIds[1] as string],
        reason: "room reallocated",
      });

      // `audit_log.entity_id` is TEXT, deliberately: DATA-MODEL.md line 539 records the polymorphic
      // reference as having no fixed foreign key, and the column is unconstrained by design. The cast is
      // therefore to `text[]`, not `uuid[]` — `ANY($1::uuid[])` fails with "operator does not exist:
      // text = uuid".
      const { rows } = await appPool.query<{ entity_id: string; new_state: unknown }>(
        `SELECT entity_id, new_state FROM erns.audit_log
          WHERE action = 'AUD-13' AND entity_id = ANY($1::text[])`,
        [[registrationIds[0] as string, registrationIds[1] as string]],
      );
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.new_state).toMatchObject({ status: "CANCELLED" });
      }
    });

    it("records NO audit entry when the reduction is refused", async () => {
      const { eventId, registrationIds } = await seedWithRegistrants(10, 4);
      await reduceEventCapacity(appPool, {
        eventId,
        requestedCapacity: 1,
        removeRegistrationIds: [registrationIds[0] as string],
        reason: "will not fit",
      });

      const { rows } = await appPool.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM erns.audit_log`,
      );
      // The AUD-13 for the removal is rolled back with everything else, so this must be zero.
      expect(rows[0]?.count).toBe(0);
    });

    it("the refusal reports the arithmetic the caller needs", async () => {
      const { eventId } = await seedWithRegistrants(10, 7);
      const outcome = await reduceEventCapacity(appPool, { eventId, requestedCapacity: 3 });
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        const refusal = outcome.refusal as CapacityReductionRefusal;
        expect(refusal.kind).toBe("CAPACITY_REDUCTION_REFUSED");
        expect(refusal.exceedsBy).toBe(4);
        expect(refusal.currentRegisteredCount).toBe(7);
        expect(refusal.remainingRegisteredCount).toBe(7);
        expect(refusal.message).toContain("7");
        expect(refusal.message).toContain("3");
      }
    });
  });
});