/**
 * MVP T4 (issue #5) — Registration completion flows.
 *
 * Seams under test (per the tdd skill; agreed via MVP-SPEC Testing Decisions):
 *   - handler-core registerOperation (primary seam, real storage): the SD-2 role
 *     gate that refuses Attendance Staff and Approver registration attempts.
 *   - L4 registerParticipant (real storage): the ADMINISTRATOR manual-reason gate
 *     (AUD-12, SD-4) and the duplicate refusal carrying the existing status.
 *   - L4 listUserRegistrations (real storage): a CANCELLED Registration stays
 *     visible to the Student with its reason (REG-25, FR-REG-040).
 *
 * Vocabulary per GLOSSARY.md: Student, Event, Registration, Confirmation
 * reference, Capacity, Attendance Staff, Approver, Event Officer, Administrator.
 *
 * ADR-0001: no new view exposes email addresses or per-recipient failure detail.
 * The rows asserted here carry identifiers, status, timestamps, the Confirmation
 * reference and the Student's own cancellation reason — never contact detail.
 *
 * Checkboxes already green elsewhere (cited, not duplicated):
 *   - last-slot contention, distinct students and same Student twice: exactly one
 *     succeeds — test/capacity-concurrency.test.ts (NEG-04, CON-01/CON-02).
 *   - capacity reduction below the registered count refused —
 *     test/capacity.test.ts (RV-11, FR-REG-037).
 *   - OFFICER manual registration without a reason refused —
 *     test/register-participant.test.ts (AUD-12).
 *   - re-registration after cancellation succeeds where a slot is free —
 *     test/cancel-registration.test.ts and test/register-participant.test.ts.
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
  seedEvent,
  seedUser,
  skipReason,
  truncateAll,
} from "./db-harness.js";
import { registerParticipant } from "../src/l4/register-participant.js";
import { cancelRegistration } from "../src/l4/cancel-registration.js";
import { listUserRegistrations } from "../src/l4/registration-reads.js";
import type { AuthenticatedActor } from "../src/app/api/_lib/operations.js";
import { registerOperation } from "../src/app/api/_lib/operations.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/registration-completion.test.ts — ${skipReason()}\n`);
}

describe.skipIf(!configured)("registration completion flows, real PostgreSQL", () => {
  let appPool: Pool;
  let ownerPool: Pool;

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

  function actor(userId: string, roles: AuthenticatedActor["roles"] = ["STUDENT"]): AuthenticatedActor {
    return { userId, accountStatus: "ACTIVE", roles };
  }

  function post(path: string, body: unknown): Request {
    return new Request(`http://test${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function activeCount(eventId: string): Promise<number> {
    const { rows } = await appPool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM erns.registration
        WHERE event_id = $1 AND status = 'REGISTERED'`,
      [eventId],
    );
    return rows[0]?.count ?? 0;
  }

  describe("second Registration by the same Student is refused with existing status shown", () => {
    it("names the REGISTERED status in the refusal message", async () => {
      const userId = await seedUser(ownerPool);
      const eventId = await seedEvent(ownerPool, { capacity: 10 });

      const first = await registerParticipant(appPool, { userId, eventId, source: "SELF" }, eligible);
      expect(first.ok).toBe(true);

      const second = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        eligible,
      );
      expect(second.ok).toBe(false);
      if (!second.ok) {
        expect(second.refusal.reason).toBe("DUPLICATE");
        expect(second.refusal.message).toBe("Already registered, with status shown: REGISTERED");
        expect(second.refusal.requirements).toBe("FR-REG-014");
      }
      expect(await activeCount(eventId)).toBe(1);
    });

    it("surfaces as 409 with code DUPLICATE over the handler core", async () => {
      const userId = await seedUser(ownerPool);
      const eventId = await seedEvent(ownerPool, { capacity: 10 });

      const first = await registerOperation(
        appPool,
        actor(userId),
        post(`/api/v1/events/${eventId}/registrations`, {}),
        eventId,
      );
      expect(first.status).toBe(201);

      const second = await registerOperation(
        appPool,
        actor(userId),
        post(`/api/v1/events/${eventId}/registrations`, {}),
        eventId,
      );
      expect(second.status).toBe(409);
      const body = (await second.json()) as { error: { code: string } };
      expect(body.error.code).toBe("DUPLICATE");
    });
  });

  describe("officer or admin Registration change without a reason is refused (AUD-12, SD-4)", () => {
    it("an ADMINISTRATOR manual Registration without a reason is refused and writes nothing", async () => {
      const userId = await seedUser(ownerPool);
      const eventId = await seedEvent(ownerPool, { capacity: 10 });

      for (const reason of [undefined, "", "   "]) {
        const outcome = await registerParticipant(
          appPool,
          { userId, eventId, source: "ADMINISTRATOR", reason },
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

    it("an ADMINISTRATOR manual Registration with a reason succeeds and audits the reason", async () => {
      const userId = await seedUser(ownerPool);
      const eventId = await seedEvent(ownerPool, { capacity: 10 });

      const outcome = await registerParticipant(
        appPool,
        { userId, eventId, source: "ADMINISTRATOR", reason: "Assisted enrolment at the help desk" },
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
      expect(rows[0]?.registration_source).toBe("ADMINISTRATOR");
      expect(rows[0]?.reason).toBe("Assisted enrolment at the help desk");
    });
  });

  describe("Attendance Staff or Approver Registration attempt is refused (SD-2, FR-REG-036)", () => {
    it("refuses an Attendance Staff holder with 403 and writes nothing", async () => {
      const userId = await seedUser(ownerPool);
      const eventId = await seedEvent(ownerPool, { capacity: 10 });

      const response = await registerOperation(
        appPool,
        actor(userId, ["ATTENDANCE_STAFF"]),
        post(`/api/v1/events/${eventId}/registrations`, {}),
        eventId,
      );
      expect(response.status).toBe(403);
      const body = (await response.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe("ROLE_NOT_PERMITTED");
      expect(await activeCount(eventId)).toBe(0);
    });

    it("refuses an Approver holder with 403 and writes nothing", async () => {
      const userId = await seedUser(ownerPool);
      const eventId = await seedEvent(ownerPool, { capacity: 10 });

      const response = await registerOperation(
        appPool,
        actor(userId, ["APPROVER"]),
        post(`/api/v1/events/${eventId}/registrations`, {}),
        eventId,
      );
      expect(response.status).toBe(403);
      const body = (await response.json()) as { error: { code: string } };
      expect(body.error.code).toBe("ROLE_NOT_PERMITTED");
      expect(await activeCount(eventId)).toBe(0);
    });

    it("refuses even when the holder also carries the Student role", async () => {
      // SD-2 is unconditional: the endpoints reject Attendance Staff and Approver
      // holders, not only holders with no other role.
      const userId = await seedUser(ownerPool);
      const eventId = await seedEvent(ownerPool, { capacity: 10 });

      const response = await registerOperation(
        appPool,
        actor(userId, ["STUDENT", "ATTENDANCE_STAFF"]),
        post(`/api/v1/events/${eventId}/registrations`, {}),
        eventId,
      );
      expect(response.status).toBe(403);
      expect(await activeCount(eventId)).toBe(0);
    });

    it("still admits a Student, an Event Officer and an Administrator self-registration", async () => {
      const eventId = await seedEvent(ownerPool, { capacity: 10 });
      for (const roles of [["STUDENT"], ["EVENT_OFFICER"], ["ADMINISTRATOR"]] as const) {
        const userId = await seedUser(ownerPool);
        const response = await registerOperation(
          appPool,
          actor(userId, [...roles]),
          post(`/api/v1/events/${eventId}/registrations`, {}),
          eventId,
        );
        expect(response.status).toBe(201);
      }
      expect(await activeCount(eventId)).toBe(3);
    });
  });

  describe("cancelled Registration stays visible to the Student with its reason (REG-25)", () => {
    it("lists the CANCELLED row with its cancellation reason", async () => {
      const userId = await seedUser(ownerPool);
      const eventId = await seedEvent(ownerPool, { capacity: 10 });

      const registered = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        eligible,
      );
      expect(registered.ok).toBe(true);
      if (!registered.ok) {
        throw new Error("expected success");
      }
      const cancelled = await cancelRegistration(appPool, {
        registrationId: registered.registrationId,
        requestedByUserId: userId,
        reason: "Schedule conflict",
      });
      expect(cancelled.ok).toBe(true);

      const rows = await listUserRegistrations(appPool, userId);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ status: "CANCELLED", cancellationReason: "Schedule conflict" });
      expect(typeof rows[0]?.confirmationReference).toBe("string");
    });

    it("an officer-cancelled Registration shows the officer's reason to the Student", async () => {
      const userId = await seedUser(ownerPool);
      const officerId = await seedUser(ownerPool);
      const eventId = await seedEvent(ownerPool, { capacity: 10 });

      const registered = await registerParticipant(
        appPool,
        { userId, eventId, source: "SELF" },
        eligible,
      );
      expect(registered.ok).toBe(true);
      if (!registered.ok) {
        throw new Error("expected success");
      }
      const cancelled = await cancelRegistration(appPool, {
        registrationId: registered.registrationId,
        requestedByUserId: officerId,
        reason: "Venue section closed",
      });
      expect(cancelled.ok).toBe(true);

      const rows = await listUserRegistrations(appPool, userId);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ status: "CANCELLED", cancellationReason: "Venue section closed" });
    });
  });
});
