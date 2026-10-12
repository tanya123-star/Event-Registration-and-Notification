/**
 * FR-EVT-001, FR-EVT-002, FR-EVT-003, FR-EVT-006, FR-EVT-007, FR-EVT-008, FR-EVT-009 — event creation.
 *
 * REQUIRES POSTGRESQL. Skipped explicitly when the URL variables are unset.
 *
 * Requirements covered:
 *   FR-EVT-001  an Event Officer creates an event in DRAFT status
 *   FR-EVT-002  required fields recorded
 *   FR-EVT-003  window recorded when registration is required
 *   FR-EVT-006  end not later than start is refused (pure rule + store CHECK)
 *   FR-EVT-007  deadline later than the event date is refused (store CHECK, TZ-coupled)
 *   FR-EVT-008  start later than the deadline is refused (pure rule + store CHECK)
 *   FR-EVT-009  non-positive capacity refused (pure rule + store CHECK)
 *   AUD-05      event created  (AUDIT-PLAN.md line 56)
 *
 * FR-EVT-004 (mechanics for non-general-assemblies) is not asserted: event types are unenumerated
 * (OQ-02), so no test can name a "non-general-assembly" without inventing categories. FR-EVT-005
 * (submission for approval) belongs to the approval machinery, blocked on OQ-01, OQ-02, OQ-04.
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
import { createEvent } from "../src/l4/create-event.js";
import type { CreateEventInput } from "../src/db/event-store.types.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/create-event.test.ts — ${skipReason()}\n`);
}

describe.skipIf(!configured)("event creation, real PostgreSQL", () => {
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

  function input(overrides: Partial<CreateEventInput> = {}): CreateEventInput {
    return {
      title: "Orientation Assembly",
      description: "Welcome programme for first-year students",
      eventType: "ASSEMBLY",
      eventDate: "2026-07-01",
      startTime: "10:00",
      endTime: "12:00",
      venue: "Main Hall",
      registrationRequired: true,
      registrationStart: new Date("2026-06-01T08:00:00Z"),
      registrationDeadline: new Date("2026-06-15T12:00:00Z"),
      capacity: 200,
      actorUserId: "00000000-0000-0000-0000-000000000000",
      ...overrides,
    };
  }

  async function storedEvent(eventId: string): Promise<{
    status: string;
    title: string;
    registrationOpen: boolean;
    capacity: number | null;
    updatedBy: string | null;
  } | null> {
    const { rows } = await appPool.query<{
      status: string;
      title: string;
      registration_open: boolean;
      capacity: number | null;
      updated_by: string | null;
    }>(
      `SELECT status, title, registration_open, capacity, updated_by
         FROM erns.event WHERE event_id = $1`,
      [eventId],
    );
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    return {
      status: row.status,
      title: row.title,
      registrationOpen: row.registration_open,
      capacity: row.capacity,
      updatedBy: row.updated_by,
    };
  }

  async function audit05Count(eventId: string): Promise<number> {
    const { rows } = await appPool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM erns.audit_log
        WHERE action = 'AUD-05' AND entity_id = $1`,
      [eventId],
    );
    return rows[0]?.count ?? 0;
  }

  it("creates an event in DRAFT with registration closed and an AUD-05 row", async () => {
    const actorUserId = await seedUser(ownerPool);

    const outcome = await createEvent(appPool, input({ actorUserId }));

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    // FR-EVT-001: DRAFT. Creation does not open registration.
    const stored = await storedEvent(outcome.eventId);
    expect(stored?.status).toBe("DRAFT");
    expect(stored?.title).toBe("Orientation Assembly");
    expect(stored?.registrationOpen).toBe(false);
    expect(stored?.capacity).toBe(200);
    // FR-EVT-016 is modification metadata: creation is not a modification.
    expect(stored?.updatedBy).toBe(null);
    expect(await audit05Count(outcome.eventId)).toBe(1);
  });

  it("creates a registration-optional event with no window and no capacity", async () => {
    const actorUserId = await seedUser(ownerPool);

    const outcome = await createEvent(
      appPool,
      input({
        actorUserId,
        registrationRequired: false,
        registrationStart: null,
        registrationDeadline: null,
        capacity: null,
      }),
    );

    expect(outcome.ok).toBe(true);
  });

  it.each([
    ["blank title", { title: "  " }, "INVALID_DRAFT", "FR-EVT-002"],
    ["end equal to start", { startTime: "10:00", endTime: "10:00" }, "INVALID_DRAFT", "FR-EVT-006"],
    ["missing window", { registrationStart: null }, "INVALID_DRAFT", "FR-EVT-003"],
    ["start after deadline", { registrationStart: new Date("2026-06-20T08:00:00Z") }, "INVALID_DRAFT", "FR-EVT-008"],
    ["zero capacity", { capacity: 0 }, "INVALID_DRAFT", "FR-EVT-009"],
  ])("refuses %s without touching the database", async (_label, overrides, reason, requirements) => {
    const actorUserId = await seedUser(ownerPool);

    const outcome = await createEvent(appPool, input({ actorUserId, ...overrides }));

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.refusal.reason).toBe(reason);
      expect(outcome.refusal.requirements).toBe(requirements);
    }
    const { rows } = await appPool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM erns.event`,
    );
    expect(rows[0]?.count).toBe(0);
  });

  it("refuses a deadline later than the event date via the store CHECK (FR-EVT-007)", async () => {
    const actorUserId = await seedUser(ownerPool);

    // Deadline 2026-07-05 is after event date 2026-07-01. The pure validator cannot judge this —
    // the store's midnight is session-dependent — so the 23514 maps to a refusal here.
    const outcome = await createEvent(
      appPool,
      input({
        actorUserId,
        eventDate: "2026-07-01",
        registrationStart: new Date("2026-06-20T08:00:00Z"),
        registrationDeadline: new Date("2026-07-05T12:00:00Z"),
      }),
    );

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.refusal.reason).toBe("EVENT_CONSTRAINT");
      expect(outcome.refusal.requirements).toContain("FR-EVT-007");
    }
    const { rows } = await appPool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM erns.event`,
    );
    expect(rows[0]?.count).toBe(0);
  });

  it("refuses a malformed actor id without a database error", async () => {
    const outcome = await createEvent(appPool, input({ actorUserId: "not-a-user" }));

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.refusal.reason).toBe("UNKNOWN_ACTOR");
    }
  });
});
