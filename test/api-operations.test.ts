/**
 * Handler cores against a real database — routes without a server.
 *
 * REQUIRES POSTGRESQL. Skipped explicitly when the URL variables are unset.
 *
 * Each operation is called directly with an explicit actor and a constructed Request, which is
 * exactly what the thin route files do after resolving the identity. What is NOT exercised here
 * is identity resolution itself (identity.ts returns null until TC-05 lands) — every test passes
 * its actor literally, so no test forges or bypasses authentication.
 *
 * Covered: success shapes and statuses for all seven operations, refusal-to-status mapping over
 * the wire, malformed ids and bodies as 400, suspended actors as 403, and the absence of
 * internal detail in error bodies.
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
  cancelRegistrationOperation,
  createEventOperation,
  eventParticipantsOperation,
  eventSummaryOperation,
  listEventsOperation,
  reduceCapacityOperation,
  registerOperation,
  setRegistrationOpenOperation,
} from "../src/app/api/_lib/operations.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/api-operations.test.ts — ${skipReason()}\n`);
}

describe.skipIf(!configured)("handler cores, real PostgreSQL", () => {
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

  function actor(userId: string): AuthenticatedActor {
    return { userId, accountStatus: "ACTIVE" };
  }

  function post(path: string, body: unknown): Request {
    return new Request(`http://test${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function patch(path: string, body: unknown): Request {
    return new Request(`http://test${path}`, {
      method: "PATCH",
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

  it("lists published events, and refuses a suspended actor with 403", async () => {
    const userId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10 });

    const response = await listEventsOperation(appPool, actor(userId), get("/api/v1/events"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { events: { eventId: string }[] };
    expect(body.events.map((event) => event.eventId)).toEqual([eventId]);

    const denied = await listEventsOperation(
      appPool,
      { userId, accountStatus: "SUSPENDED" },
      get("/api/v1/events"),
    );
    expect(denied.status).toBe(403);
    expect((await errorOf(denied)).code).toBe("ACCOUNT_SUSPENDED");
  });

  it("creates an event (201) and rejects a malformed body (400)", async () => {
    const userId = await seedUser(ownerPool);

    const created = await createEventOperation(
      appPool,
      actor(userId),
      post("/api/v1/events", {
        title: "Orientation",
        description: "Welcome",
        eventType: "ASSEMBLY",
        eventDate: "2026-07-01",
        startTime: "10:00",
        endTime: "12:00",
        venue: "Main Hall",
        registrationStart: "2026-06-01T08:00:00Z",
        registrationDeadline: "2026-06-15T12:00:00Z",
        capacity: 200,
      }),
    );
    expect(created.status).toBe(201);
    expect(typeof ((await created.json()) as { eventId: string }).eventId).toBe("string");

    const malformed = await createEventOperation(
      appPool,
      actor(userId),
      post("/api/v1/events", { title: 42 }),
    );
    expect(malformed.status).toBe(400);
  });

  it("registers (201), then reports the duplicate as 409 with the refusal reason as code", async () => {
    const userId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10 });

    const first = await registerOperation(appPool, actor(userId), post(`/api/v1/events/${eventId}/registrations`, {}), eventId);
    expect(first.status).toBe(201);
    const created = (await first.json()) as { confirmationReference: string };
    expect(typeof created.confirmationReference).toBe("string");

    const second = await registerOperation(appPool, actor(userId), post(`/api/v1/events/${eventId}/registrations`, {}), eventId);
    expect(second.status).toBe(409);
    expect((await errorOf(second)).code).toBe("DUPLICATE");
  });

  it("maps a full event to 409 and a malformed event id to 400", async () => {
    const userId = await seedUser(ownerPool);
    const otherId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 1 });
    await seedRegistration(ownerPool, { userId: otherId, eventId });

    const full = await registerOperation(appPool, actor(userId), post(`/api/v1/events/${eventId}/registrations`, {}), eventId);
    expect(full.status).toBe(409);
    expect((await errorOf(full)).code).toBe("CAPACITY");

    const malformed = await registerOperation(appPool, actor(userId), post("/api/v1/events/nope/registrations", {}), "nope");
    expect(malformed.status).toBe(400);
    expect((await errorOf(malformed)).code).toBe("INVALID_EVENT_ID");
  });

  it("cancels with a reason (200) and rejects a missing reason (400)", async () => {
    const userId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    const cancelled = await cancelRegistrationOperation(
      appPool,
      actor(userId),
      post(`/api/v1/registrations/${registrationId}/cancel`, { reason: "Conflict" }),
      registrationId,
    );
    expect(cancelled.status).toBe(200);

    const second = await seedRegistration(ownerPool, { userId, eventId });
    const missing = await cancelRegistrationOperation(
      appPool,
      actor(userId),
      post(`/api/v1/registrations/${second}/cancel`, {}),
      second,
    );
    expect(missing.status).toBe(400);
    expect((await errorOf(missing)).code).toBe("MISSING_REASON");
  });

  it("reports the summary and participants, and 404s an unknown event", async () => {
    const userId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 4 });
    await seedRegistration(ownerPool, { userId, eventId });

    const summary = await eventSummaryOperation(appPool, actor(userId), get(`/api/v1/events/${eventId}/summary`), eventId);
    expect(summary.status).toBe(200);
    expect(await summary.json()).toEqual({
      summary: { eventId, capacity: 4, registeredCount: 1, availableSlots: 3, cancelledCount: 0 },
    });

    const participants = await eventParticipantsOperation(appPool, actor(userId), get(`/api/v1/events/${eventId}/participants`), eventId);
    expect(participants.status).toBe(200);
    const list = (await participants.json()) as { participants: { userId: string }[] };
    expect(list.participants.map((row) => row.userId)).toEqual([userId]);

    const missing = await eventSummaryOperation(
      appPool,
      actor(userId),
      get("/api/v1/events/11111111-1111-1111-1111-111111111111/summary"),
      "11111111-1111-1111-1111-111111111111",
    );
    expect(missing.status).toBe(404);
  });

  it("reduces capacity (200) and refuses below the count (409)", async () => {
    const officerId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    await seedRegistration(ownerPool, { userId: await seedUser(ownerPool), eventId });
    await seedRegistration(ownerPool, { userId: await seedUser(ownerPool), eventId });

    const refused = await reduceCapacityOperation(
      appPool,
      actor(officerId),
      patch(`/api/v1/events/${eventId}/capacity`, { capacity: 1 }),
      eventId,
    );
    expect(refused.status).toBe(409);
    expect((await errorOf(refused)).code).toBe("CAPACITY_REDUCTION_REFUSED");

    const reduced = await reduceCapacityOperation(
      appPool,
      actor(officerId),
      patch(`/api/v1/events/${eventId}/capacity`, { capacity: 5 }),
      eventId,
    );
    expect(reduced.status).toBe(200);
  });

  it("closes and reopens registration, refusing a reasonless reopen", async () => {
    const officerId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10, registrationOpen: true });

    const closed = await setRegistrationOpenOperation(
      appPool,
      actor(officerId),
      patch(`/api/v1/events/${eventId}/registration-open`, { open: false }),
      eventId,
    );
    expect(closed.status).toBe(200);

    const reasonless = await setRegistrationOpenOperation(
      appPool,
      actor(officerId),
      patch(`/api/v1/events/${eventId}/registration-open`, { open: true }),
      eventId,
    );
    expect(reasonless.status).toBe(400);
    expect((await errorOf(reasonless)).code).toBe("MISSING_REASON");

    const reopened = await setRegistrationOpenOperation(
      appPool,
      actor(officerId),
      patch(`/api/v1/events/${eventId}/registration-open`, { open: true, reason: "Confirmed" }),
      eventId,
    );
    expect(reopened.status).toBe(200);
  });

  it("never leaks internal detail in error bodies", async () => {
    const userId = await seedUser(ownerPool);
    const response = await registerOperation(
      appPool,
      actor(userId),
      post("/api/v1/events/11111111-1111-1111-1111-111111111111/registrations", {}),
      "11111111-1111-1111-1111-111111111111",
    );
    expect(response.status).toBe(404);
    const raw = await response.text();
    expect(raw).not.toMatch(/23514|23505|42501|22P02|constraint|SELECT|FROM/i);
  });
});
