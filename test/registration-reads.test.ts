/**
 * FR-REG-001, FR-REG-002, FR-REG-030, FR-REG-031, FR-REG-040, FR-EVT-014 — registration reads.
 *
 * REQUIRES POSTGRESQL. Skipped explicitly when the URL variables are unset.
 *
 * What is asserted here is that the reads report stored rows faithfully: counts that agree with
 * the partial unique index, lists in the documented order, and scoping by the supplied id. WHO may
 * call them (officer-owns-event, own-registrations-only) is enforced by the session layer, which
 * does not exist yet — these tests supply ids directly and assert the reporting, not permission.
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
import {
  getEventRegistrationSummary,
  listEventParticipants,
  listPublishedEvents,
  listUserRegistrations,
} from "../src/l4/registration-reads.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/registration-reads.test.ts — ${skipReason()}\n`);
}

describe.skipIf(!configured)("registration reads, real PostgreSQL", () => {
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

  it("summarises counts, and reports null slots for an uncapped event (FR-REG-030)", async () => {
    const capped = await seedEvent(ownerPool, { capacity: 5 });
    const uncapped = await seedEvent(ownerPool, { capacity: null });
    const userA = await seedUser(ownerPool);
    const userB = await seedUser(ownerPool);
    await seedRegistration(ownerPool, { userId: userA, eventId: capped });
    await seedRegistration(ownerPool, { userId: userB, eventId: capped });
    // A cancelled row must not count.
    const cancelled = await seedRegistration(ownerPool, { userId: userA, eventId: uncapped });
    await ownerPool.query(`UPDATE erns.registration SET status = 'CANCELLED',
      cancelled_at = now(), cancellation_reason = 'seed', cancelled_by = $2
      WHERE registration_id = $1`, [cancelled, userA]);

    const summary = await getEventRegistrationSummary(appPool, capped);
    expect(summary).toMatchObject({ eventId: capped, capacity: 5, registeredCount: 2, availableSlots: 3, cancelledCount: 0 });

    const open = await getEventRegistrationSummary(appPool, uncapped);
    expect(open).toMatchObject({ capacity: null, registeredCount: 0, availableSlots: null, cancelledCount: 1 });

    expect(await getEventRegistrationSummary(appPool, "11111111-1111-1111-1111-111111111111")).toBe(null);
  });

  it("lists participants oldest-first with status and timestamp (FR-REG-031)", async () => {
    const userA = await seedUser(ownerPool);
    const userB = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    const first = await seedRegistration(ownerPool, { userId: userA, eventId });
    const second = await seedRegistration(ownerPool, { userId: userB, eventId });

    const rows = await listEventParticipants(appPool, eventId);

    expect(rows.map((row) => row.registrationId)).toEqual([first, second]);
    expect(rows[0]).toMatchObject({ userId: userA, status: "REGISTERED" });
    expect(rows[0]?.registeredAt).toBeInstanceOf(Date);
    expect(typeof rows[0]?.confirmationReference).toBe("string");
  });

  it("returns only the requesting student's registrations, newest-first (FR-REG-040)", async () => {
    const mine = await seedUser(ownerPool);
    const other = await seedUser(ownerPool);
    const eventA = await seedEvent(ownerPool, { capacity: 10 });
    const eventB = await seedEvent(ownerPool, { capacity: 10 });
    await seedRegistration(ownerPool, { userId: other, eventId: eventA });
    const first = await seedRegistration(ownerPool, { userId: mine, eventId: eventA });
    const second = await seedRegistration(ownerPool, { userId: mine, eventId: eventB });

    const rows = await listUserRegistrations(appPool, mine);

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.registrationId)).toEqual([second, first]);
    for (const row of rows) {
      expect(typeof row.eventTitle).toBe("string");
      expect(row.eventStatus).toBe("PUBLISHED");
    }
    expect(rows.some((row) => row.eventId === eventA)).toBe(true);
  });

  it("lists published events with live counts and hides drafts (FR-EVT-014)", async () => {
    const published = await seedEvent(ownerPool, { capacity: 10, status: "PUBLISHED" });
    await seedEvent(ownerPool, { capacity: 10, status: "DRAFT" });
    const userId = await seedUser(ownerPool);
    await seedRegistration(ownerPool, { userId, eventId: published });

    const rows = await listPublishedEvents(appPool);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ eventId: published, registeredCount: 1, capacity: 10 });
  });
});
