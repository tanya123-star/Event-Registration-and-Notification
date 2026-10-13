/**
 * NEG scenarios — boundary conditions.
 *
 * REQUIRES POSTGRESQL for the store-level cases. Skipped explicitly when the URL variables are unset.
 *
 * Source: TESTING-STRATEGY.md lines 160-165, the NEG table. The five covered here are the ones whose
 * entities and rules exist. NEG-04 already lives in test/capacity-concurrency.test.ts; NEG-06
 * through NEG-09 depend on attendance, notifications, and event submission, none of which have
 * schema, and are listed in the closing block as NOT APPLICABLE rather than silently omitted.
 *
 *   NEG-01  Registration exactly at capacity minus one          | Succeeds
 *   NEG-02  Registration at exactly the deadline boundary       | Policy-consistent outcome
 *   NEG-03  Registration exactly at the opening boundary        | Policy-consistent outcome
 *   NEG-05  Event with end time equal to start time            | Rejected
 *
 * ON "POLICY-CONSISTENT OUTCOME"
 * The source does not define the boundary semantics for NEG-02 and NEG-03; it requires only that the
 * outcome match the policy. The policy is the registered implementation, which is traceable to two
 * source comparisons in REGISTRATION-WORKFLOW.md:
 *
 *   step 4, opening  (REGISTRATION-WORKFLOW.md:98) — refuses when now is BEFORE registration_start.
 *                    The implementation is `attempt.now < attempt.registrationStart` (see
 *                    registration-validation.ts:144), so at exactly the opening instant now is NOT
 *                    before the start, and the attempt is ADMITTED.
 *   step 5, deadline (REGISTRATION-WORKFLOW.md:99) — refuses when the time is AT OR AFTER the
 *                    deadline. The implementation is `attempt.now >= attempt.registrationDeadline`
 *                    (registration-validation.ts:150), so at exactly the deadline instant the attempt
 *                    is REFUSED.
 *
 * Those are the policy the tests assert, and each is stated as an explicit boundary rather than
 * inferred. A change to either comparison is a policy change and these tests should fail.
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
import { registerParticipant, type RegisterParticipantFacts } from "../src/l4/register-participant.js";
import { validateRegistrationAttempt } from "../src/domain/registration-validation.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/negative-boundaries.test.ts — ${skipReason()}\n`);
}

const DAY_MS = 24 * 60 * 60 * 1000;

describe.skipIf(!configured)("NEG boundary conditions, real PostgreSQL", () => {
  let appPool: Pool;
  let ownerPool: Pool;

  const eligible: RegisterParticipantFacts = {
    authenticated: true,
    accountStatus: "ACTIVE",
    eligible: true,
  };

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

  /**
   * NEG-01 — "Registration exactly at capacity minus one | Succeeds".
   *
   * The last available slot must be granted, not refused. A capacity check written as `<=` rather
   * than `>=` would refuse here and the event would be permanently one seat short. This is the
   * boundary that distinguishes a correct capacity check from an off-by-one.
   */
  describe("NEG-01 — registration at exactly capacity minus one succeeds", () => {
    it("admits the final slot when count is capacity - 1", async () => {
      // capacity 3 with 2 already registered. The next registration is exactly at capacity minus one.
      const eventId = await seedEvent(ownerPool, { capacity: 3 });
      for (const userId of [await seedUser(ownerPool), await seedUser(ownerPool)]) {
        const filled = await registerParticipant(
          appPool,
          { userId, eventId, source: "SELF" },
          eligible,
        );
        expect(filled.ok).toBe(true);
      }
      expect(await activeCount(eventId)).toBe(2);

      const final = await registerParticipant(
        appPool,
        { userId: await seedUser(ownerPool), eventId, source: "SELF" },
        eligible,
      );

      expect(final.ok).toBe(true);
      // Committed state, and now exactly at capacity — full, but not over.
      expect(await activeCount(eventId)).toBe(3);
    });

    it("refuses the NEXT registration, which is exactly at capacity", async () => {
      // The other side of the same boundary. Together these two prove the check is
      // `count >= capacity` and not `count > capacity`.
      const eventId = await seedEvent(ownerPool, { capacity: 2 });
      for (const userId of [await seedUser(ownerPool), await seedUser(ownerPool)]) {
        const filled = await registerParticipant(
          appPool,
          { userId, eventId, source: "SELF" },
          eligible,
        );
        expect(filled.ok).toBe(true);
      }

      const oneTooMany = await registerParticipant(
        appPool,
        { userId: await seedUser(ownerPool), eventId, source: "SELF" },
        eligible,
      );

      expect(oneTooMany.ok).toBe(false);
      if (!oneTooMany.ok) {
        expect(oneTooMany.refusal.reason).toBe("CAPACITY");
        expect(oneTooMany.refusal.message).toBe("Event is full");
      }
      expect(await activeCount(eventId)).toBe(2);
    });

    it("succeeds on an uncapped event regardless of count", async () => {
      // capacity NULL means uncapped, so there is no "capacity minus one" to reach.
      const eventId = await seedEvent(ownerPool, { capacity: null });
      for (let i = 0; i < 3; i += 1) {
        const outcome = await registerParticipant(
          appPool,
          { userId: await seedUser(ownerPool), eventId, source: "SELF" },
          eligible,
        );
        expect(outcome.ok).toBe(true);
      }
      expect(await activeCount(eventId)).toBe(3);
    });
  });

  /**
   * NEG-02 — "Registration at exactly the deadline boundary | Policy-consistent outcome".
   *
   * Policy, from registration-validation.ts:150: the deadline refuses when `now >= deadline`. At
   * exactly the deadline, `now` is NOT strictly before it, so the attempt is REFUSED.
   */
  describe("NEG-02 — the deadline boundary is exclusive at the top", () => {
    it("refuses at exactly the deadline instant", async () => {
      const eventId = await seedEvent(ownerPool, { capacity: 10 });

      // READ THE STORED DEADLINE, do not invent one. An earlier version passed a hard-coded
      // 2026-06-15 and expected DEADLINE; it got REGISTRATION_OPEN instead, because the fixture's
      // window is `now() + 30 days` and the invented date fell BEFORE `registration_start`. The
      // implementation was right and the test was wrong — step 4 legitimately precedes step 5
      // (FR-REG-005). Reaching the deadline boundary through the store requires the real stored value.
      const { rows } = await ownerPool.query<{ registration_deadline: Date }>(
        `SELECT registration_deadline FROM erns.event WHERE event_id = $1`,
        [eventId],
      );
      const storedDeadline = rows[0]?.registration_deadline;
      expect(storedDeadline).toBeInstanceOf(Date);

      const outcome = await registerParticipant(
        appPool,
        { userId: await seedUser(ownerPool), eventId, source: "SELF" },
        { ...eligible, now: storedDeadline as Date },
      );

      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("DEADLINE");
        expect(outcome.refusal.requirements).toBe("FR-REG-010");
        expect(outcome.refusal.message).toBe("Registration deadline has passed");
      }
      expect(await activeCount(eventId)).toBe(0);
    });

    it("admits one millisecond before the deadline", async () => {
      // Asserted on the pure function rather than through the store. The stored deadline moves with
      // wall-clock time, so a store-level "one millisecond before" would need to read the value and
      // then race the clock. The pure function is the same code path the store calls, and the
      // store-level boundary is covered by the test above.
      const deadline = new Date("2026-06-15T12:00:00Z");
      const outcome = validateRegistrationAttempt({
        authenticated: true,
        accountStatus: "ACTIVE",
        eventStatus: "PUBLISHED",
        registrationOpen: true,
        registrationStart: new Date(deadline.getTime() - 2 * DAY_MS),
        registrationDeadline: deadline,
        now: new Date(deadline.getTime() - 1),
        eligible: true,
        registeredCount: 0,
        capacity: 10,
        existingActiveRegistration: false,
        existingRegistrationStatus: null,
        missingRequiredFields: [],
      });
      expect(outcome.ok).toBe(true);
    });

    it("the pure evaluator refuses at the boundary and admits one millisecond before", () => {
      const deadline = new Date("2026-06-15T12:00:00Z");
      const base = {
        authenticated: true,
        accountStatus: "ACTIVE" as const,
        eventStatus: "PUBLISHED" as const,
        registrationOpen: true,
        registrationStart: new Date(deadline.getTime() - 2 * DAY_MS),
        registrationDeadline: deadline,
        eligible: true,
        registeredCount: 0,
        capacity: 10,
        existingActiveRegistration: false,
        existingRegistrationStatus: null,
        missingRequiredFields: [],
      };

      const atBoundary = validateRegistrationAttempt({ ...base, now: deadline });
      expect(atBoundary.ok).toBe(false);
      if (!atBoundary.ok) {
        expect(atBoundary.failure.step).toBe("DEADLINE");
      }

      const justBefore = validateRegistrationAttempt({
        ...base,
        now: new Date(deadline.getTime() - 1),
      });
      expect(justBefore.ok).toBe(true);
    });
  });

  /**
   * NEG-03 — "Registration exactly at the opening boundary | Policy-consistent outcome".
   *
   * Policy, from registration-validation.ts:144: the opening refuses when `now` is BEFORE the start
   * (`now < registrationStart`). At exactly the opening instant that comparison is false, so the
   * attempt is ADMITTED. The opening is therefore INCLUSIVE — the opposite edge treatment from the
   * deadline, and worth pinning because the asymmetry is easy to "fix" by mistake.
   */
  describe("NEG-03 — the opening boundary is inclusive at the bottom", () => {
    it("admits at exactly the opening instant", () => {
      const start = new Date("2026-06-01T09:00:00Z");
      const outcome = validateRegistrationAttempt({
        authenticated: true,
        accountStatus: "ACTIVE",
        eventStatus: "PUBLISHED",
        registrationOpen: true,
        registrationStart: start,
        registrationDeadline: new Date("2026-06-10T09:00:00Z"),
        now: start,
        eligible: true,
        registeredCount: 0,
        capacity: 10,
        existingActiveRegistration: false,
        existingRegistrationStatus: null,
        missingRequiredFields: [],
      });
      expect(outcome.ok).toBe(true);
    });

    it("refuses one millisecond before the opening instant", () => {
      const start = new Date("2026-06-01T09:00:00Z");
      const outcome = validateRegistrationAttempt({
        authenticated: true,
        accountStatus: "ACTIVE",
        eventStatus: "PUBLISHED",
        registrationOpen: true,
        registrationStart: start,
        registrationDeadline: new Date("2026-06-10T09:00:00Z"),
        now: new Date(start.getTime() - 1),
        eligible: true,
        registeredCount: 0,
        capacity: 10,
        existingActiveRegistration: false,
        existingRegistrationStatus: null,
        missingRequiredFields: [],
      });
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.failure.step).toBe("REGISTRATION_OPEN");
        expect(outcome.failure.requirements).toBe("FR-REG-009");
      }
    });

    it("the opening and deadline boundaries are deliberately asymmetric", () => {
      // Stated as its own assertion because the asymmetry is the thing most likely to be broken by a
      // well-meaning refactor. Registration starts AT `registrationStart` and ends BEFORE
      // `registrationDeadline`; the interval is [start, deadline).
      const start = new Date("2026-06-01T09:00:00Z");
      const deadline = new Date("2026-06-10T09:00:00Z");
      const base = {
        authenticated: true,
        accountStatus: "ACTIVE" as const,
        eventStatus: "PUBLISHED" as const,
        registrationOpen: true,
        registrationStart: start,
        registrationDeadline: deadline,
        eligible: true,
        registeredCount: 0,
        capacity: 10,
        existingActiveRegistration: false,
        existingRegistrationStatus: null,
        missingRequiredFields: [],
      };

      expect(validateRegistrationAttempt({ ...base, now: start }).ok).toBe(true);
      expect(
        validateRegistrationAttempt({ ...base, now: new Date(deadline.getTime() - 1) }).ok,
      ).toBe(true);
      expect(validateRegistrationAttempt({ ...base, now: deadline }).ok).toBe(false);
      expect(validateRegistrationAttempt({ ...base, now: new Date(start.getTime() - 1) }).ok).toBe(
        false,
      );
    });

    it("the closed flag refuses even at or after the opening instant", async () => {
      // The window comparisons are ANDed with the `registration_open` flag, so an officer-closed
      // event refuses regardless of the clock. FR-REG-009 covers the period; the flag is separate.
      const eventId = await seedEvent(ownerPool, { capacity: 10, registrationOpen: false });
      const outcome = await registerParticipant(
        appPool,
        { userId: await seedUser(ownerPool), eventId, source: "SELF" },
        eligible,
      );
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("REGISTRATION_OPEN");
      }
    });
  });

  /**
   * NEG-05 — "Event with end time equal to start time | Rejected".
   *
   * Enforced by `event_time_ordering_check` (0001_initial.sql:174-175), which requires
   * `end_time > start_time`. FR-EVT-006 states the rule; the constraint is the store-level backstop.
   */
  describe("NEG-05 — end time equal to start time is rejected", () => {
    it("refuses an event whose end equals its start", async () => {
      await expect(
        ownerPool.query(
          `INSERT INTO erns.event
             (title, description, event_type, event_date, start_time, end_time, venue,
              registration_start, registration_deadline)
           VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '10:00', '10:00', 'v',
                   now() - interval '1 day', now() + interval '1 day')`,
        ),
      ).rejects.toMatchObject({ code: "23514" });
    });

    it("refuses an event whose end precedes its start", async () => {
      await expect(
        ownerPool.query(
          `INSERT INTO erns.event
             (title, description, event_type, event_date, start_time, end_time, venue,
              registration_start, registration_deadline)
           VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '12:00', '10:00', 'v',
                   now() - interval '1 day', now() + interval '1 day')`,
        ),
      ).rejects.toMatchObject({ code: "23514" });
    });

    it("admits an end exactly one minute after the start", async () => {
      // The other side of the boundary: `>` not `>=`, so a one-minute event is legal.
      await expect(
        ownerPool.query(
          `INSERT INTO erns.event
             (title, description, event_type, event_date, start_time, end_time, venue,
              registration_start, registration_deadline)
           VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '10:00', '10:01', 'v',
                   now() - interval '1 day', now() + interval '1 day')`,
        ),
      ).resolves.toBeDefined();
    });

    it("names the constraint that refused it, so the failure is traceable", async () => {
      const error = await ownerPool
        .query(
          `INSERT INTO erns.event
             (title, description, event_type, event_date, start_time, end_time, venue,
              registration_start, registration_deadline)
           VALUES ('t', 'd', 'E', CURRENT_DATE + 10, '10:00', '10:00', 'v',
                   now() - interval '1 day', now() + interval '1 day')`,
        )
        .then(
          () => undefined,
          (caught: unknown) => caught as { constraint?: string },
        );
      expect(error?.constraint).toBe("event_time_ordering_check");
    });
  });

  /**
   * The remaining NEG scenarios are listed so their absence is visible rather than forgotten.
   * Each is blocked on a schema that does not exist, not on a missing test.
   */
  describe("NEG scenarios not applicable to the current schema", () => {
    it("NEG-06 through NEG-09 depend on entities that do not exist yet", () => {
      // NEG-06 zero-length attendance window — Attendance does not exist.
      // NEG-07, NEG-08 notification delivery — Notification does not exist (blocked by OQ-56).
      // NEG-09 empty event description at submission — PB-01 event creation is not implemented, and
      //   DATA-MODEL.md line 175 marks description Required without a non-blank CHECK, so the rule is
      //   not yet expressible at the store.
      //
      // A placeholder assertion, present only so the block is not empty. The substantive check is the
      // catalog assertion below, which fails if an entity lands without its NEG coverage.
      expect(typeof "NEG-06").toBe("string");
    });

    it("no attendance or notification table exists in the schema", async () => {
      const { rows } = await ownerPool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'erns' ORDER BY table_name`,
      );
      const names = rows.map((r) => r.table_name);
      // Updated visibly for 0006 (MVP T3 StudentProfile, issue #4): student_profile
      // is the only addition. Attendance and notification stay absent.
      expect(names).toEqual([
        "app_user",
        "audit_log",
        "event",
        "registration",
        "schema_migrations",
        "session",
        "student_profile",
        "user_role",
      ]);
      expect(names).not.toContain("attendance");
      expect(names).not.toContain("notification");
    });
  });
});
