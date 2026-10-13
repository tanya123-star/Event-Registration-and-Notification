/**
 * MVP T3 (issue #4) — Student profile, audience and eligibility.
 *
 * Seams under test (per the tdd skill; agreed via MVP-SPEC Testing Decisions):
 *   - domain audience evaluator (pure, no I/O)
 *   - L4 registerParticipant (eligibility from storage, snapshot from profile)
 *   - L4 audience-filtered Event browsing (published Events in the Student audience)
 *   - handler-core registerOperation / listEventsOperation (same behaviour over the wire)
 *
 * Vocabulary per GLOSSARY.md: Student, Event, Registration, Confirmation reference,
 * Capacity. No new terms.
 *
 * ADR-0001: no new view exposes email addresses or per-recipient failure detail.
 * Participant and browsing rows carry only identifiers, status, timestamps,
 * Confirmation reference values and the stored snapshot — never contact detail.
 *
 * REQUIRES POSTGRESQL for the integration half. Skipped explicitly when unset.
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
import { isStudentInAudience } from "../src/domain/audience.js";
import { registerParticipant } from "../src/l4/register-participant.js";
import {
  listEventParticipants,
  listPublishedEventsForStudent,
} from "../src/l4/registration-reads.js";
import {
  listEventsOperation,
  registerOperation,
} from "../src/app/api/_lib/operations.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/student-audience.test.ts — ${skipReason()}\n`);
}

describe("audience evaluation, pure domain seam", () => {
  const profile = {
    programme: "BSIT",
    yearLevel: 3,
    organizationId: "org-1",
    isEligible: true,
  };

  it("a null audience admits every Student", () => {
    expect(isStudentInAudience(profile, null)).toBe(true);
  });

  it("an empty object audience admits every Student", () => {
    expect(isStudentInAudience(profile, {})).toBe(true);
  });

  it("a matching programme admits the Student", () => {
    expect(isStudentInAudience(profile, { programme: "BSIT" })).toBe(true);
  });

  it("a non-matching programme refuses the Student", () => {
    expect(isStudentInAudience(profile, { programme: "BSCS" })).toBe(false);
  });

  it("conjunctive criteria all match to admit", () => {
    expect(isStudentInAudience(profile, { programme: "BSIT", year_level: 3 })).toBe(true);
    expect(isStudentInAudience(profile, { programme: "BSIT", year_level: 2 })).toBe(false);
    expect(
      isStudentInAudience(profile, { programme: "BSIT", organization_id: "other-org" }),
    ).toBe(false);
  });

  it("an array criterion admits any listed value", () => {
    expect(isStudentInAudience(profile, { programme: ["BSCS", "BSIT"] })).toBe(true);
    expect(isStudentInAudience(profile, { programme: ["BSCS", "BEED"] })).toBe(false);
  });

  it("an ineligible Student is refused even inside the audience", () => {
    expect(isStudentInAudience({ ...profile, isEligible: false }, null)).toBe(false);
    expect(isStudentInAudience({ ...profile, isEligible: false }, { programme: "BSIT" })).toBe(
      false,
    );
  });
});

describe.skipIf(!configured)("Student profile, audience and eligibility, real PostgreSQL", () => {
  let appPool: Pool;
  let ownerPool: Pool;

  const eligibleFacts = {
    authenticated: true,
    accountStatus: "ACTIVE" as const,
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

  async function seedStudentProfile(
    userId: string,
    overrides: {
      readonly programme?: string;
      readonly yearLevel?: number;
      readonly organizationId?: string | null;
      readonly isEligible?: boolean;
    } = {},
  ): Promise<void> {
    await ownerPool.query(
      `INSERT INTO erns.student_profile (user_id, programme, year_level, organization_id, is_eligible)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        overrides.programme ?? "BSIT",
        overrides.yearLevel ?? 3,
        overrides.organizationId ?? null,
        overrides.isEligible ?? true,
      ],
    );
  }

  async function setEventAudience(eventId: string, audience: unknown): Promise<void> {
    await ownerPool.query(`UPDATE erns.event SET target_audience = $2 WHERE event_id = $1`, [
      eventId,
      audience === null ? null : JSON.stringify(audience),
    ]);
  }

  function post(path: string, body: unknown): Request {
    return new Request(`http://test${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("Registration outside the audience is refused at the eligibility step (FR-REG-011)", async () => {
    const userId = await seedUser(ownerPool);
    await seedStudentProfile(userId, { programme: "BSCS" });
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    await setEventAudience(eventId, { programme: "BSIT" });

    const outcome = await registerParticipant(
      appPool,
      { userId, eventId, source: "SELF" },
      eligibleFacts,
    );

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.refusal.reason).toBe("ELIGIBILITY");
      expect(outcome.refusal.message).toBe("Not eligible for this event");
      expect(outcome.refusal.requirements).toBe("FR-REG-011, FR-REG-012");
    }
  });

  it("Registration by an ineligible Student is refused at the eligibility step (FR-REG-012)", async () => {
    const userId = await seedUser(ownerPool);
    await seedStudentProfile(userId, { programme: "BSIT", isEligible: false });
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    await setEventAudience(eventId, { programme: "BSIT" });

    const outcome = await registerParticipant(
      appPool,
      { userId, eventId, source: "SELF" },
      eligibleFacts,
    );

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.refusal.reason).toBe("ELIGIBILITY");
      expect(outcome.refusal.message).toBe("Not eligible for this event");
    }
  });

  it("Registration inside the audience with an eligible Student succeeds and snapshots the profile", async () => {
    const userId = await seedUser(ownerPool);
    await seedStudentProfile(userId, {
      programme: "BSIT",
      yearLevel: 2,
      organizationId: null,
    });
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    await setEventAudience(eventId, { programme: "BSIT" });

    const outcome = await registerParticipant(
      appPool,
      { userId, eventId, source: "SELF" },
      eligibleFacts,
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
    expect(rows[0]?.student_context.programme).toBe("BSIT");
    expect(rows[0]?.student_context.year_level).toBe(2);
  });

  it("Event browsing shows only published Events in the Student audience (FR-REG-001, FR-EVT-014)", async () => {
    const userId = await seedUser(ownerPool);
    await seedStudentProfile(userId, { programme: "BSIT" });
    const inAudience = await seedEvent(ownerPool, { capacity: 10, status: "PUBLISHED" });
    await setEventAudience(inAudience, { programme: "BSIT" });
    const outOfAudience = await seedEvent(ownerPool, { capacity: 10, status: "PUBLISHED" });
    await setEventAudience(outOfAudience, { programme: "BSCS" });
    const draftInAudience = await seedEvent(ownerPool, { capacity: 10, status: "DRAFT" });
    await setEventAudience(draftInAudience, { programme: "BSIT" });

    const rows = await listPublishedEventsForStudent(appPool, userId);

    expect(rows.map((row) => row.eventId)).toEqual([inAudience]);
    for (const row of rows) {
      expect(row.status).toBe("PUBLISHED");
      expect(JSON.stringify(row)).not.toMatch(/@/);
    }
  });

  it("A Student with no profile keeps the transitional fallback at registration: storage reads as eligible (issue #4 review)", async () => {
    // Pinning test: the no-profile fallback is fail-OPEN by design (see the
    // STEP A2 comment in register-participant.ts). A missing profile reads as
    // storage-eligible, so even a restricted audience does not refuse the
    // attempt. The fallback is transitional and is removed by issue #9 (MVP T8:
    // Administrator CSV student import), the only Student-account creation path.
    const userId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    await setEventAudience(eventId, { programme: "BSIT" });

    const outcome = await registerParticipant(
      appPool,
      { userId, eventId, source: "SELF" },
      eligibleFacts,
    );

    expect(outcome.ok).toBe(true);
  });

  it("A Student with no profile keeps the transitional fallback at browsing: every published Event is visible (issue #4 review)", async () => {
    // Pinning test: the browsing-side counterpart of the same transitional
    // fallback in listPublishedEventsForStudent. A Student with no profile
    // sees every published Event, including restricted-audience ones.
    const userId = await seedUser(ownerPool);
    const open = await seedEvent(ownerPool, { capacity: 10, status: "PUBLISHED" });
    const restricted = await seedEvent(ownerPool, {
      capacity: 10,
      status: "PUBLISHED",
    });
    await setEventAudience(restricted, { programme: "BSIT" });

    const rows = await listPublishedEventsForStudent(appPool, userId);

    expect(rows.map((row) => row.eventId).sort()).toEqual(
      [open, restricted].sort(),
    );
  });

  it("Programme change after registering retains the original snapshot in reports (FR-REG-017)", async () => {
    const userId = await seedUser(ownerPool);
    await seedStudentProfile(userId, { programme: "BSIT", yearLevel: 1 });
    const eventId = await seedEvent(ownerPool, { capacity: 10 });

    const outcome = await registerParticipant(
      appPool,
      { userId, eventId, source: "SELF" },
      eligibleFacts,
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      throw new Error("expected success");
    }

    await ownerPool.query(
      `UPDATE erns.student_profile SET programme = 'BSCS', year_level = 4 WHERE user_id = $1`,
      [userId],
    );

    const { rows } = await appPool.query<{ student_context: { programme: string } }>(
      `SELECT student_context FROM erns.registration WHERE registration_id = $1`,
      [outcome.registrationId],
    );
    expect(rows[0]?.student_context.programme).toBe("BSIT");

    // The acceptance criterion requires the snapshot retained "in reports",
    // so the same retained snapshot must surface through the report seam
    // (FR-REG-031 participant list), not only the raw column.
    const participants = await listEventParticipants(appPool, eventId);
    expect(participants).toHaveLength(1);
    expect(participants[0]?.studentContext).toEqual({
      programme: "BSIT",
      year_level: 1,
      organization_id: null,
    });
  });

  it("handler cores refuse out-of-audience Registration with ELIGIBILITY over the wire", async () => {
    const userId = await seedUser(ownerPool);
    await seedStudentProfile(userId, { programme: "BSCS" });
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    await setEventAudience(eventId, { programme: "BSIT" });

    const response = await registerOperation(
      appPool,
      { userId, accountStatus: "ACTIVE" },
      post(`/api/v1/events/${eventId}/registrations`, {}),
      eventId,
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("ELIGIBILITY");
    expect(body.error.message).toBe("Not eligible for this event");
  });

  it("handler-core browsing returns only the Student audience and exposes no contact detail", async () => {
    const userId = await seedUser(ownerPool);
    await seedStudentProfile(userId, { programme: "BSIT" });
    const inAudience = await seedEvent(ownerPool, { capacity: 10, status: "PUBLISHED" });
    await setEventAudience(inAudience, { programme: "BSIT" });
    const outOfAudience = await seedEvent(ownerPool, { capacity: 10, status: "PUBLISHED" });
    await setEventAudience(outOfAudience, { programme: "BSCS" });

    const response = await listEventsOperation(
      appPool,
      { userId, accountStatus: "ACTIVE" },
      new Request("http://test/api/v1/events"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { events: { eventId: string }[] };
    expect(body.events.map((event) => event.eventId)).toEqual([inAudience]);
    expect(JSON.stringify(body)).not.toMatch(/@/);
  });
});
