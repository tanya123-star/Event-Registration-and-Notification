/**
 * MVP T7 (issue #8) — attendance handler-core operations and staff lookup.
 *
 * Seams under test (per the tdd skill; agreed via the directive):
 *   - handler-core recordAttendanceOperation / recordWalkInOperation /
 *     attendanceSummaryOperation / lookupParticipantsOperation (real
 *     storage): role gates, envelope shapes and refusal-to-status mapping.
 *   - L4 lookupParticipants (real storage): name and Confirmation-reference
 *     lookup scoped to the assigned event, name plus reference only
 *     (ADR-0001).
 *
 * Vocabulary per GLOSSARY.md: Attendance, Walk-in, Confirmation reference,
 * Attendance Staff, Event Officer, Administrator, Student.
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
  seedRegistration,
  seedUser,
  skipReason,
  truncateAll,
} from "./db-harness.js";
import type { AuthenticatedActor } from "../src/app/api/_lib/operations.js";
import {
  attendanceSummaryOperation,
  lookupParticipantsOperation,
  recordAttendanceOperation,
  recordWalkInOperation,
} from "../src/app/api/_lib/operations.js";
import { recordAttendance } from "../src/l4/record-attendance.js";
import { lookupParticipants } from "../src/l4/attendance-reads.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/attendance-operations.test.ts — ${skipReason()}\n`);
}

describe.skipIf(!configured)("attendance handler cores, real PostgreSQL", () => {
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

  function post(path: string, body: unknown): Request {
    return new Request(`http://test${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function get(path: string): Request {
    return new Request(`http://test${path}`);
  }

  async function errorOf(response: Response): Promise<{ code: string; message: string }> {
    const body = (await response.json()) as { error: { code: string; message: string } };
    return body.error;
  }

  async function seedOpenEvent(): Promise<string> {
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    await ownerPool.query(
      `UPDATE erns.event
          SET attendance_window_open = now() - interval '1 hour',
              attendance_window_close = now() + interval '5 hours'
        WHERE event_id = $1`,
      [eventId],
    );
    return eventId;
  }

  it("records over the handler core for staff (201) and refuses officers and students (403)", async () => {
    const userId = await seedUser(ownerPool);
    const staffId = await seedUser(ownerPool);
    const officerId = await seedUser(ownerPool);
    const studentId = await seedUser(ownerPool);
    const eventId = await seedOpenEvent();
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    const recorded = await recordAttendanceOperation(
      appPool,
      actor(staffId, ["ATTENDANCE_STAFF"]),
      post(`/api/v1/registrations/${registrationId}/attendance`, {}),
      registrationId,
    );
    expect(recorded.status).toBe(201);
    expect(typeof ((await recorded.json()) as { attendanceId: string }).attendanceId).toBe("string");

    const secondId = await seedRegistration(ownerPool, { userId: await seedUser(ownerPool), eventId });
    const officer = await recordAttendanceOperation(
      appPool,
      actor(officerId, ["EVENT_OFFICER"]),
      post(`/api/v1/registrations/${secondId}/attendance`, {}),
      secondId,
    );
    expect(officer.status).toBe(403);
    expect((await errorOf(officer)).code).toBe("ROLE_NOT_PERMITTED");

    const student = await recordAttendanceOperation(
      appPool,
      actor(studentId, ["STUDENT"]),
      post(`/api/v1/registrations/${secondId}/attendance`, {}),
      secondId,
    );
    expect(student.status).toBe(403);
  });

  it("maps the duplicate to 409 and a malformed id to 400", async () => {
    const userId = await seedUser(ownerPool);
    const staffId = await seedUser(ownerPool);
    const eventId = await seedOpenEvent();
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    const first = await recordAttendanceOperation(
      appPool,
      actor(staffId, ["ATTENDANCE_STAFF"]),
      post(`/api/v1/registrations/${registrationId}/attendance`, {}),
      registrationId,
    );
    expect(first.status).toBe(201);

    const duplicate = await recordAttendanceOperation(
      appPool,
      actor(staffId, ["ATTENDANCE_STAFF"]),
      post(`/api/v1/registrations/${registrationId}/attendance`, {}),
      registrationId,
    );
    expect(duplicate.status).toBe(409);
    expect((await errorOf(duplicate)).code).toBe("ALREADY_RECORDED");

    const malformed = await recordAttendanceOperation(
      appPool,
      actor(staffId, ["ATTENDANCE_STAFF"]),
      post("/api/v1/registrations/nope/attendance", {}),
      "nope",
    );
    expect(malformed.status).toBe(400);
    expect((await errorOf(malformed)).code).toBe("INVALID_REGISTRATION_ID");
  });

  it("records a walk-in over the handler core and refuses a reasonless one with 400", async () => {
    const staffId = await seedUser(ownerPool);
    const eventId = await seedOpenEvent();

    const recorded = await recordWalkInOperation(
      appPool,
      actor(staffId, ["ATTENDANCE_STAFF"]),
      post(`/api/v1/events/${eventId}/walk-ins`, { reason: "Door guest" }),
      eventId,
    );
    expect(recorded.status).toBe(201);

    const reasonless = await recordWalkInOperation(
      appPool,
      actor(staffId, ["ATTENDANCE_STAFF"]),
      post(`/api/v1/events/${eventId}/walk-ins`, {}),
      eventId,
    );
    expect(reasonless.status).toBe(400);
    expect((await errorOf(reasonless)).code).toBe("MISSING_REASON");
  });

  it("reports the four live counts over the handler core with 200", async () => {
    const staffId = await seedUser(ownerPool);
    const eventId = await seedOpenEvent();
    const firstUser = await seedUser(ownerPool);
    const secondUser = await seedUser(ownerPool);
    const firstRegistration = await seedRegistration(ownerPool, { userId: firstUser, eventId });
    await seedRegistration(ownerPool, { userId: secondUser, eventId });
    await recordAttendance(appPool, { registrationId: firstRegistration, recordedByUserId: staffId });

    const response = await attendanceSummaryOperation(
      appPool,
      actor(staffId, ["ATTENDANCE_STAFF"]),
      get(`/api/v1/events/${eventId}/attendance/summary`),
      eventId,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      counts: { eventId, registeredCount: 2, presentCount: 1, absentCount: 1, walkInCount: 0 },
    });
  });

  it("looks up participants by name for the assigned event only, name plus reference", async () => {
    const staffId = await seedUser(ownerPool);
    const eventId = await seedOpenEvent();
    const otherEventId = await seedOpenEvent();
    const userId = await seedUser(ownerPool, { displayName: "Amara Okafor" });
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });
    const otherUserId = await seedUser(ownerPool, { displayName: "Amara Diallo" });
    await seedRegistration(ownerPool, { userId: otherUserId, eventId: otherEventId });

    const rows = await lookupParticipants(appPool, eventId, "Amara");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      registrationId,
      displayName: "Amara Okafor",
      attendanceRecorded: false,
    });
    expect(typeof rows[0]?.confirmationReference).toBe("string");
    expect(rows[0]).not.toHaveProperty("email");

    const byReference = await lookupParticipants(appPool, eventId, rows[0]?.confirmationReference ?? "");
    expect(byReference).toHaveLength(1);

    const response = await lookupParticipantsOperation(
      appPool,
      actor(staffId, ["ATTENDANCE_STAFF"]),
      get(`/api/v1/events/${eventId}/attendance/lookup?query=Amara`),
      eventId,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { participants: { displayName: string }[] };
    expect(body.participants.map((row) => row.displayName)).toEqual(["Amara Okafor"]);
  });
});
