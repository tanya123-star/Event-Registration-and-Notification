/**
 * FR-REG-032, FR-REG-033, FR-REG-034 — close and reopen registration.
 *
 * REQUIRES POSTGRESQL. Skipped explicitly when the URL variables are unset.
 *
 * Requirements covered:
 *   FR-REG-032  close before the event starts
 *   FR-REG-033  reopen before the event starts, given a recorded reason
 *   FR-REG-034  no reopen after the event start (and no close either)
 *   RV-08       reopening without a reason is rejected
 *   RV-09       reopening after the event start is rejected
 *   AUD-05      event edited  (AUDIT-PLAN.md line 56)
 *   FR-EVT-016  modification metadata on the flag write
 *   FR-REG-039  every close/reopen audited with actor, timestamp, reason where applicable
 *
 * Committed state is asserted after every case, per the convention in test/capacity.test.ts.
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
import { setRegistrationOpen } from "../src/l4/registration-open.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/registration-open.test.ts — ${skipReason()}\n`);
}

describe.skipIf(!configured)("close and reopen registration, real PostgreSQL", () => {
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

  async function flagOf(eventId: string): Promise<boolean | null> {
    const { rows } = await appPool.query<{ registration_open: boolean }>(
      `SELECT registration_open FROM erns.event WHERE event_id = $1`,
      [eventId],
    );
    return rows[0]?.registration_open ?? null;
  }

  async function metadataOf(eventId: string): Promise<{ by: string | null; at: Date | null }> {
    const { rows } = await appPool.query<{ updated_by: string | null; updated_at: Date | null }>(
      `SELECT updated_by, updated_at FROM erns.event WHERE event_id = $1`,
      [eventId],
    );
    return { by: rows[0]?.updated_by ?? null, at: rows[0]?.updated_at ?? null };
  }

  async function audit05Count(eventId: string): Promise<number> {
    const { rows } = await appPool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM erns.audit_log
        WHERE action = 'AUD-05' AND entity_id = $1`,
      [eventId],
    );
    return rows[0]?.count ?? 0;
  }

  it("closes an open event, recording metadata and AUD-05 without a reason", async () => {
    const actorUserId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10, registrationOpen: true });

    const outcome = await setRegistrationOpen(appPool, { eventId, open: false, actorUserId });

    expect(outcome.ok).toBe(true);
    expect(await flagOf(eventId)).toBe(false);
    const metadata = await metadataOf(eventId);
    expect(metadata.by).toBe(actorUserId);
    expect(metadata.at).toBeInstanceOf(Date);
    expect(await audit05Count(eventId)).toBe(1);
  });

  it("reopens with a recorded reason", async () => {
    const actorUserId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10, registrationOpen: false });

    const outcome = await setRegistrationOpen(appPool, {
      eventId,
      open: true,
      reason: "Venue capacity confirmed",
      actorUserId,
    });

    expect(outcome.ok).toBe(true);
    expect(await flagOf(eventId)).toBe(true);
    const { rows } = await appPool.query<{ reason: string | null }>(
      `SELECT reason FROM erns.audit_log WHERE action = 'AUD-05' AND entity_id = $1`,
      [eventId],
    );
    expect(rows[0]?.reason).toBe("Venue capacity confirmed");
  });

  it("refuses a reasonless reopen and writes nothing (RV-08)", async () => {
    const actorUserId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10, registrationOpen: false });

    for (const reason of [undefined, "", "   "]) {
      const outcome = await setRegistrationOpen(appPool, { eventId, open: true, reason, actorUserId });
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("MISSING_REASON");
        expect(outcome.refusal.requirements).toBe("FR-REG-033");
      }
    }

    expect(await flagOf(eventId)).toBe(false);
    expect(await audit05Count(eventId)).toBe(0);
  });

  it("refuses both directions after the event start (RV-09, FR-REG-034)", async () => {
    // A deadline two days ago makes the fixture's event date yesterday, so the 10:00 start is
    // unambiguously past in any timezone the database session could use.
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const actorUserId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10, registrationDeadline: past });

    const close = await setRegistrationOpen(appPool, { eventId, open: false, actorUserId });
    expect(close.ok).toBe(false);
    if (!close.ok) {
      expect(close.refusal.reason).toBe("EVENT_STARTED");
    }

    const reopen = await setRegistrationOpen(appPool, {
      eventId,
      open: true,
      reason: "Too late",
      actorUserId,
    });
    expect(reopen.ok).toBe(false);
    if (!reopen.ok) {
      expect(reopen.refusal.reason).toBe("EVENT_STARTED");
      expect(reopen.refusal.requirements).toContain("FR-REG-034");
    }
    expect(await audit05Count(eventId)).toBe(0);
  });

  it("reports unknown and malformed ids as not found", async () => {
    const actorUserId = await seedUser(ownerPool);

    for (const eventId of ["11111111-1111-1111-1111-111111111111", "not-a-uuid"]) {
      const outcome = await setRegistrationOpen(appPool, { eventId, open: false, actorUserId });
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("EVENT_NOT_FOUND");
      }
    }
  });

  it("closing an already-closed event is accepted and audited", async () => {
    const actorUserId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10, registrationOpen: false });

    const outcome = await setRegistrationOpen(appPool, { eventId, open: false, actorUserId });

    expect(outcome.ok).toBe(true);
    expect(await flagOf(eventId)).toBe(false);
    expect(await audit05Count(eventId)).toBe(1);
  });
});
