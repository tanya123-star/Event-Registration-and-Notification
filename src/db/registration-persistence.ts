/**
 * Persistence primitives for registration and capacity.
 *
 * L2. Constructs queries, reads rows, writes rows. Decides nothing.
 *
 * SYSTEM-ARCHITECTURE.md line 100 forbids L2 from "decid[ing] authorisation" or "interpret[ing] a
 * lifecycle rule". Nothing in this file decides whether a registration is permitted, whether a capacity
 * reduction is allowed, or who may perform either. Every such judgement lives in `src/l4/`.
 *
 * The two functions here are the mechanical halves of the L4 use cases:
 *   `insertRegistrationRow`      writes one registration
 *   `updateEventCapacityRow`     writes capacity plus FR-EVT-016 modification metadata
 *
 * A third, `readEventRegistrationFacts`, gathers the facts the L4 use cases need so that they can be
 * read INSIDE the transaction that acts on them. That matters for CON-04: a fact read outside the
 * write transaction is not part of the serialization graph and cannot prevent anything. See
 * src/l4/capacity.ts.
 */

import type { PoolClient } from "pg";

import type { RegistrationSource } from "./registration-store.types.js";

/**
 * The facts the nine-step validator needs, read in one round trip inside the caller's transaction.
 *
 * `registeredCount` counts only `status = 'REGISTERED'`, matching the partial unique index decided for
 * OQ-10: a cancelled registration does not consume capacity.
 */
export interface EventRegistrationFacts {
  readonly eventExists: boolean;
  readonly capacity: number | null;
  readonly status: string;
  readonly registrationOpen: boolean;
  readonly registrationStart: Date | null;
  readonly registrationDeadline: Date | null;
  readonly registeredCount: number;
  /** The caller's own active registration, if any. FR-REG-014. */
  readonly existingRegistrationStatus: "REGISTERED" | "CANCELLED" | null;
}

const EVENT_FACTS_QUERY = `
  SELECT
    e.capacity,
    e.status,
    e.registration_open,
    e.registration_start,
    e.registration_deadline,
    (SELECT count(*)::int
       FROM erns.registration r
      WHERE r.event_id = e.event_id AND r.status = 'REGISTERED') AS registered_count,
    (SELECT r.status
       FROM erns.registration r
      WHERE r.user_id = $2 AND r.event_id = e.event_id
      ORDER BY r.registered_at DESC
      LIMIT 1) AS existing_status
  FROM erns.event e
  WHERE e.event_id = $1
`;

/**
 * Read the facts for one event and one prospective registrant.
 *
 * MUST be called inside the same transaction as the write. The `SELECT ... FROM erns.event` is what
 * creates the read-write dependency that makes SERIALIZABLE abort a transaction racing a capacity
 * change — the property CON-04 depends on. Reading via a different connection, or outside the
 * transaction, loses that guarantee; test/concurrency.test.ts demonstrates the failure.
 */
export async function readEventRegistrationFacts(
  client: PoolClient,
  eventId: string,
  userId: string,
): Promise<EventRegistrationFacts | { readonly eventExists: false }> {
  const { rows } = await client.query<{
    capacity: number | null;
    status: string;
    registration_open: boolean;
    registration_start: Date | null;
    registration_deadline: Date | null;
    registered_count: number;
    existing_status: "REGISTERED" | "CANCELLED" | null;
  }>(EVENT_FACTS_QUERY, [eventId, userId]);

  const row = rows[0];
  if (row === undefined) {
    return { eventExists: false };
  }

  return {
    eventExists: true,
    capacity: row.capacity,
    status: row.status,
    registrationOpen: row.registration_open,
    registrationStart: row.registration_start,
    registrationDeadline: row.registration_deadline,
    registeredCount: row.registered_count,
    existingRegistrationStatus: row.existing_status,
  };
}

export interface RegistrationRowInput {
  readonly userId: string;
  readonly eventId: string;
  readonly source: RegistrationSource;
  readonly confirmationReference: string;
  readonly studentContext: Record<string, unknown> | null;
}

/**
 * Insert one registration.
 *
 * `registration_id` and `registered_at` are NOT passed: the column DEFAULT supplies
 * `gen_random_uuid()` and `now()` server-side, so two application instances cannot collide and the
 * timestamp cannot be supplied by a caller that might retry. FR-REG-018's `REGISTERED` status is also
 * the column default, so an incorrect status cannot be inserted by mistake.
 *
 * FR-REG-016 is enforced by `registration_active_user_event_key`, not by this function. If it raises
 * 23505 the L4 use case reports `STORAGE_DUPLICATE`; that is the storage layer refusing, which is what
 * the requirement asks for.
 */
export async function insertRegistrationRow(
  client: PoolClient,
  input: RegistrationRowInput,
): Promise<{ registrationId: string; registeredAt: Date }> {
  const { rows } = await client.query<{ registration_id: string; registered_at: Date }>(
    `INSERT INTO erns.registration
       (user_id, event_id, status, registration_source, confirmation_reference, student_context)
     VALUES ($1, $2, 'REGISTERED', $3, $4, $5)
     RETURNING registration_id, registered_at`,
    [
      input.userId,
      input.eventId,
      input.source,
      input.confirmationReference,
      input.studentContext === null ? null : JSON.stringify(input.studentContext),
    ],
  );

  const row = rows[0];
  if (row === undefined) {
    throw new Error("insertRegistrationRow returned no row");
  }
  return { registrationId: row.registration_id, registeredAt: row.registered_at };
}

export interface EventCapacityUpdateInput {
  readonly eventId: string;
  readonly capacity: number;
  /** FR-EVT-016. NULL leaves attribution unknown rather than inventing an actor. */
  readonly actorUserId: string | null;
}

/**
 * Write capacity together with the FR-EVT-016 modification pair.
 *
 * `updated_at` and `updated_by` are set in the SAME statement as `capacity`. That pairing is the
 * whole reason FR-EVT-016 is satisfiable: an `updated_at` without an `updated_by` would record a
 * modification with no actor, and an `updated_by` without a timestamp would record who without when.
 *
 * Deliberately NOT a BEFORE UPDATE trigger. A trigger would also stamp rows modified by incidental
 * writes, recording modifications the L4 layer did not intend.
 */
export async function updateEventCapacityRow(
  client: PoolClient,
  input: EventCapacityUpdateInput,
): Promise<{ updatedAt: Date }> {
  const { rows } = await client.query<{ updated_at: Date }>(
    `UPDATE erns.event
        SET capacity = $2, updated_by = $3, updated_at = now()
      WHERE event_id = $1
      RETURNING updated_at`,
    [input.eventId, input.capacity, input.actorUserId],
  );

  const row = rows[0];
  if (row === undefined) {
    throw new Error(
      `updateEventCapacityRow matched no event ${input.eventId}. The caller must have read the event ` +
        "inside this transaction; a missing row here means the event was deleted concurrently.",
    );
  }
  return { updatedAt: row.updated_at };
}

/**
 * Count active registrations for an event.
 *
 * Used by the capacity-reduction use case after applying removals, because the post-removal count must
 * be read from the same transaction to be authoritative.
 */
export async function countActiveRegistrations(
  client: PoolClient,
  eventId: string,
): Promise<number> {
  const { rows } = await client.query<{ count: number }>(
    `SELECT count(*)::int AS count
       FROM erns.registration
      WHERE event_id = $1 AND status = 'REGISTERED'`,
    [eventId],
  );
  return rows[0]?.count ?? 0;
}

export interface RegistrationForRemoval {
  readonly registrationId: string;
  readonly userId: string;
  readonly status: string;
  readonly eventId: string;
}

/**
 * Fetch the registrations named for simultaneous removal.
 *
 * Returns every row that EXISTS for the supplied ids, along with its event and status, so that the
 * caller can distinguish "not found" from "belongs to another event" from "already cancelled". The
 * three are different failures with different messages and FR-REG-037 must not be satisfied by a
 * request containing an invalid id.
 */
export async function readRegistrationsForRemoval(
  client: PoolClient,
  registrationIds: readonly string[],
): Promise<readonly RegistrationForRemoval[]> {
  if (registrationIds.length === 0) {
    return [];
  }

  const { rows } = await client.query<{
    registration_id: string;
    user_id: string;
    status: string;
    event_id: string;
  }>(
    `SELECT registration_id, user_id, status, event_id
       FROM erns.registration
      WHERE registration_id = ANY($1::uuid[])`,
    [[...registrationIds]],
  );

  return rows.map((row) => ({
    registrationId: row.registration_id,
    userId: row.user_id,
    status: row.status,
    eventId: row.event_id,
  }));
}

/**
 * Cancel a registration that is already known to be active on this event.
 *
 * The `AND status = 'REGISTERED'` predicate is a second line of defence: if the row changed state
 * between the read above and this statement, the update affects no rows and the caller sees it in the
 * returned count rather than silently overwriting a cancellation reason.
 *
 * `cancelled_by` is NOT NULL on a CANCELLED row per migration 0003, so the actor is required.
 *
 * `cancelled_at` is returned so that a caller recording an audit row can stamp the same instant the
 * database wrote, rather than a second clock read that could disagree with it.
 */
export async function cancelRegistrationRow(
  client: PoolClient,
  input: { registrationId: string; actorUserId: string; reason: string },
): Promise<{ cancelled: boolean; cancelledAt: Date | null }> {
  const { rowCount, rows } = await client.query<{ cancelled_at: Date }>(
    `UPDATE erns.registration
        SET status = 'CANCELLED',
            cancelled_at = now(),
            cancellation_reason = $2,
            cancelled_by = $3
      WHERE registration_id = $1 AND status = 'REGISTERED'
      RETURNING cancelled_at`,
    [input.registrationId, input.reason, input.actorUserId],
  );
  return { cancelled: (rowCount ?? 0) === 1, cancelledAt: rows[0]?.cancelled_at ?? null };
}

/** One registration with the event-window facts a cancellation decision needs. */
export interface RegistrationCancellationFacts {
  readonly registrationId: string;
  readonly userId: string;
  readonly eventId: string;
  readonly status: string;
  readonly registeredAt: Date;
  readonly registrationSource: string;
  readonly confirmationReference: string;
  readonly registrationOpen: boolean;
  readonly registrationDeadline: Date | null;
}

/**
 * Read one registration with its event's registration window.
 *
 * MUST be called inside the same transaction as the cancelling write: the row is re-checked by
 * `cancelRegistrationRow`'s `AND status = 'REGISTERED'` predicate, and the window facts must agree
 * with the state the write observes.
 */
export async function readRegistrationById(
  client: PoolClient,
  registrationId: string,
): Promise<RegistrationCancellationFacts | null> {
  const { rows } = await client.query<{
    registration_id: string;
    user_id: string;
    event_id: string;
    status: string;
    registered_at: Date;
    registration_source: string;
    confirmation_reference: string;
    registration_open: boolean;
    registration_deadline: Date | null;
  }>(
    `SELECT r.registration_id, r.user_id, r.event_id, r.status,
            r.registered_at, r.registration_source, r.confirmation_reference,
            e.registration_open, e.registration_deadline
       FROM erns.registration r
       JOIN erns.event e ON e.event_id = r.event_id
      WHERE r.registration_id = $1`,
    [registrationId],
  );

  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  return {
    registrationId: row.registration_id,
    userId: row.user_id,
    eventId: row.event_id,
    status: row.status,
    registeredAt: row.registered_at,
    registrationSource: row.registration_source,
    confirmationReference: row.confirmation_reference,
    registrationOpen: row.registration_open,
    registrationDeadline: row.registration_deadline,
  };
}

/**
 * Append one audit row.
 *
 * `action` is constrained by `audit_log_action_check` to the twenty-five classes enumerated in
 * AUDIT-PLAN.md lines 52-76, so an invented action code is unwritable rather than merely discouraged.
 */
export async function appendAuditRow(
  client: PoolClient,
  input: {
    actorUserId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    previousState?: unknown;
    newState?: unknown;
    reason?: string | null;
    requestContext?: Record<string, unknown> | null;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO erns.audit_log
       (actor_user_id, actor_role, action, entity_type, entity_id,
        previous_state, new_state, reason, request_context)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.actorUserId,
      // actor_role is deliberately NULL. The role set is defined in USER-ROLES.md as a many-to-many
      // assignment, not a value carried on the row, and reading it here would require the Role table
      // that does not exist. DATA-MODEL.md line 529 says "Role at time of action"; leaving it null is
      // recorded rather than guessed at.
      null,
      input.action,
      input.entityType,
      input.entityId,
      input.previousState === undefined ? null : JSON.stringify(input.previousState),
      input.newState === undefined ? null : JSON.stringify(input.newState),
      input.reason ?? null,
      input.requestContext === undefined ? null : JSON.stringify(input.requestContext),
    ],
  );
}

/** Read the current capacity and modification metadata for an event. */
export async function readEventCapacity(
  client: PoolClient,
  eventId: string,
): Promise<{ capacity: number | null; updatedBy: string | null; updatedAt: Date | null } | null> {
  const { rows } = await client.query<{
    capacity: number | null;
    updated_by: string | null;
    updated_at: Date | null;
  }>(`SELECT capacity, updated_by, updated_at FROM erns.event WHERE event_id = $1`, [eventId]);

  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  return { capacity: row.capacity, updatedBy: row.updated_by, updatedAt: row.updated_at };
}

/**
 * Read the registration window facts a close/reopen decision needs.
 *
 * `notStarted` is computed by the database from `event_date + start_time > now()`, so the
 * "before the event starts" rule in FR-REG-032/033/034 is judged in the same timezone and clock
 * the store uses — no application-side date arithmetic that could disagree with it.
 */
export async function readEventWindow(
  client: PoolClient,
  eventId: string,
): Promise<{ registrationOpen: boolean; notStarted: boolean } | null> {
  const { rows } = await client.query<{ registration_open: boolean; not_started: boolean }>(
    `SELECT registration_open,
            ((event_date + start_time) > now()) AS not_started
       FROM erns.event WHERE event_id = $1`,
    [eventId],
  );
  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  return { registrationOpen: row.registration_open, notStarted: row.not_started };
}

/**
 * Write the registration flag together with FR-EVT-016 modification metadata.
 *
 * Same pairing rationale as `updateEventCapacityRow`: the flag and its attribution are one
 * statement, so a close/reopen is never recorded without who and when.
 */
export async function updateEventRegistrationOpenRow(
  client: PoolClient,
  input: { eventId: string; open: boolean; actorUserId: string | null },
): Promise<{ updatedAt: Date }> {
  const { rows } = await client.query<{ updated_at: Date }>(
    `UPDATE erns.event
        SET registration_open = $2, updated_by = $3, updated_at = now()
      WHERE event_id = $1
      RETURNING updated_at`,
    [input.eventId, input.open, input.actorUserId],
  );
  const row = rows[0];
  if (row === undefined) {
    throw new Error(
      `updateEventRegistrationOpenRow matched no event ${input.eventId}. The caller must have ` +
        "read the event inside this transaction; a missing row here means the event was deleted concurrently.",
    );
  }
  return { updatedAt: row.updated_at };
}

/**
 * Read the registration summary for one event. FR-REG-030.
 *
 * A single statement, so it observes one consistent snapshot without a transaction.
 */
export async function readEventRegistrationSummary(
  client: PoolClient,
  eventId: string,
): Promise<{ capacity: number | null; registeredCount: number; cancelledCount: number } | null> {
  const { rows } = await client.query<{
    capacity: number | null;
    registered_count: number;
    cancelled_count: number;
  }>(
    `SELECT e.capacity,
            (SELECT count(*)::int FROM erns.registration r
              WHERE r.event_id = e.event_id AND r.status = 'REGISTERED') AS registered_count,
            (SELECT count(*)::int FROM erns.registration r
              WHERE r.event_id = e.event_id AND r.status = 'CANCELLED') AS cancelled_count
       FROM erns.event e
      WHERE e.event_id = $1`,
    [eventId],
  );
  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  return {
    capacity: row.capacity,
    registeredCount: row.registered_count,
    cancelledCount: row.cancelled_count,
  };
}

/**
 * List every registration on one event, oldest first. FR-REG-031.
 *
 * `student_context` is returned as stored (JSONB arrives parsed). Whether the caller may see it
 * is an ownership question for the session layer; this function reports rows, it does not permit.
 */
export async function listEventParticipantRows(
  client: PoolClient,
  eventId: string,
): Promise<
  readonly {
    registrationId: string;
    userId: string;
    status: string;
    registeredAt: Date;
    confirmationReference: string;
    cancelledAt: Date | null;
    studentContext: unknown;
  }[]
> {
  const { rows } = await client.query<{
    registration_id: string;
    user_id: string;
    status: string;
    registered_at: Date;
    confirmation_reference: string;
    cancelled_at: Date | null;
    student_context: unknown;
  }>(
    `SELECT registration_id, user_id, status, registered_at,
            confirmation_reference, cancelled_at, student_context
       FROM erns.registration
      WHERE event_id = $1
      ORDER BY registered_at ASC, registration_id ASC`,
    [eventId],
  );
  return rows.map((row) => ({
    registrationId: row.registration_id,
    userId: row.user_id,
    status: row.status,
    registeredAt: row.registered_at,
    confirmationReference: row.confirmation_reference,
    cancelledAt: row.cancelled_at,
    studentContext: row.student_context,
  }));
}

/**
 * List one user's registrations, newest first, with the event identified. FR-REG-040.
 *
 * The caller supplies the user id from the authenticated session; this function does not accept a
 * second user's id to browse.
 */
export async function listUserRegistrationRows(
  client: PoolClient,
  userId: string,
): Promise<
  readonly {
    registrationId: string;
    eventId: string;
    eventTitle: string;
    eventStatus: string;
    status: string;
    registeredAt: Date;
    confirmationReference: string;
    cancelledAt: Date | null;
  }[]
> {
  const { rows } = await client.query<{
    registration_id: string;
    event_id: string;
    event_title: string;
    event_status: string;
    status: string;
    registered_at: Date;
    confirmation_reference: string;
    cancelled_at: Date | null;
  }>(
    `SELECT r.registration_id, r.event_id, e.title AS event_title, e.status AS event_status,
            r.status, r.registered_at, r.confirmation_reference, r.cancelled_at
       FROM erns.registration r
       JOIN erns.event e ON e.event_id = r.event_id
      WHERE r.user_id = $1
      ORDER BY r.registered_at DESC, r.registration_id DESC`,
    [userId],
  );
  return rows.map((row) => ({
    registrationId: row.registration_id,
    eventId: row.event_id,
    eventTitle: row.event_title,
    eventStatus: row.event_status,
    status: row.status,
    registeredAt: row.registered_at,
    confirmationReference: row.confirmation_reference,
    cancelledAt: row.cancelled_at,
  }));
}

/**
 * List published events with live registered counts. FR-REG-001, FR-REG-002, FR-EVT-014.
 *
 * Audience filtering is NOT applied: `target_audience` is an unspecified JSONB document and the
 * role model that would scope visibility (FR-EVT-013) belongs to the session layer. The caller —
 * today a handler that has verified the session — decides who may see this list.
 */
export async function listPublishedEventRows(
  client: PoolClient,
): Promise<
  readonly {
    eventId: string;
    title: string;
    eventDate: string;
    venue: string;
    status: string;
    registrationOpen: boolean;
    registrationDeadline: Date | null;
    capacity: number | null;
    registeredCount: number;
  }[]
> {
  const { rows } = await client.query<{
    event_id: string;
    title: string;
    event_date: string;
    venue: string;
    status: string;
    registration_open: boolean;
    registration_deadline: Date | null;
    capacity: number | null;
    registered_count: number;
  }>(
    `SELECT e.event_id, e.title, e.event_date::text AS event_date, e.venue, e.status,
            e.registration_open, e.registration_deadline, e.capacity,
            (SELECT count(*)::int FROM erns.registration r
              WHERE r.event_id = e.event_id AND r.status = 'REGISTERED') AS registered_count
       FROM erns.event e
      WHERE e.status = 'PUBLISHED'
      ORDER BY e.event_date ASC, e.event_id ASC`,
  );
  return rows.map((row) => ({
    eventId: row.event_id,
    title: row.title,
    eventDate: row.event_date,
    venue: row.venue,
    status: row.status,
    registrationOpen: row.registration_open,
    registrationDeadline: row.registration_deadline,
    capacity: row.capacity,
    registeredCount: row.registered_count,
  }));
}