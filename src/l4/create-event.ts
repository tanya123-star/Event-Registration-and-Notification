/**
 * L4: the event-creation use case.
 *
 * Closes the creation-time part of FR-EVT-001, FR-EVT-002, FR-EVT-003, FR-EVT-006, FR-EVT-007,
 * FR-EVT-008 and FR-EVT-009. What it does NOT do, and why:
 *   FR-EVT-004 (mechanics for non-general-assemblies) — event types are unenumerated (OQ-02), so
 *   "general assembly" cannot be evaluated. Mechanics fields are accepted and stored, never required.
 *   FR-EVT-005 (refuse submission for approval with missing fields) — belongs to the approval
 *   submission operation, which needs the approval machinery (blocked: OQ-01, OQ-02, OQ-04).
 *
 * The pure draft rules run BEFORE any database work, so a malformed draft is refused without a
 * transaction. The store CHECKs remain as the backstop: FR-EVT-007's midnight depends on the
 * database session's TimeZone and therefore cannot be checked purely, so a 23514 from the insert
 * is mapped to a refusal here rather than escaping as a constraint name.
 *
 * NO AUTHORIZATION. Whether the caller holds the Event Officer role is decided by the session
 * layer. `actorUserId` records who created the event, per AUD-05; it decides nothing.
 */

import type { Pool, PoolClient } from "pg";

import { validateEventDraft } from "../domain/event-validation.js";
import { withTransaction } from "../db/client.js";
import { insertEventRow } from "../db/event-persistence.js";
import { appendAuditRow } from "../db/registration-persistence.js";
import type {
  CreateEventInput,
  CreateEventOutcome,
} from "../db/event-store.types.js";

/** AUD-05, event created. AUDIT-PLAN.md line 56. */
const ACTION_EVENT_CREATED = "AUD-05";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function sqlstate(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * Create one event in DRAFT status.
 *
 * One transaction holds the event insert and its AUD-05 audit row: FAIL-05 forbids a state change
 * whose audit entry fails, and the transaction is what makes that atomic.
 */
export async function createEvent(
  pool: Pool,
  input: CreateEventInput,
): Promise<CreateEventOutcome> {
  // The audit row's actor references app_user. A malformed id can never name a user; refuse it as
  // unknown rather than letting a foreign-key violation escape.
  if (!isUuid(input.actorUserId)) {
    return {
      ok: false,
      refusal: {
        reason: "UNKNOWN_ACTOR",
        message: "Creating user is not a known user",
        requirements: "AUD-05",
      },
    };
  }

  const draft = validateEventDraft({
    title: input.title,
    description: input.description,
    eventType: input.eventType,
    eventDate: input.eventDate,
    startTime: input.startTime,
    endTime: input.endTime,
    venue: input.venue,
    registrationRequired: input.registrationRequired ?? true,
    registrationStart: input.registrationStart ?? null,
    registrationDeadline: input.registrationDeadline ?? null,
    capacity: input.capacity ?? null,
  });
  if (!draft.ok) {
    return {
      ok: false,
      refusal: {
        reason: "INVALID_DRAFT",
        message: draft.failure.message,
        requirements: draft.failure.requirements,
        failure: draft.failure,
      },
    };
  }

  const registrationRequired = input.registrationRequired ?? true;

  try {
    return await withTransaction(
      pool,
      async (client: PoolClient): Promise<CreateEventOutcome> => {
        const { eventId } = await insertEventRow(client, {
          title: input.title.trim(),
          description: input.description.trim(),
          eventType: input.eventType.trim(),
          eventDate: input.eventDate,
          startTime: input.startTime,
          endTime: input.endTime,
          venue: input.venue.trim(),
          organizerOrgId: input.organizerOrgId ?? null,
          targetAudience: input.targetAudience ?? null,
          registrationRequired,
          registrationStart: registrationRequired ? (input.registrationStart ?? null) : null,
          registrationDeadline: registrationRequired ? (input.registrationDeadline ?? null) : null,
          capacity: input.capacity ?? null,
          contactPerson: input.contactPerson ?? null,
          eventMechanics: input.eventMechanics ?? null,
          programFlow: input.programFlow ?? null,
          requirements: input.requirements ?? null,
          materialsNeeded: input.materialsNeeded ?? null,
          dressCode: input.dressCode ?? null,
        });

        await appendAuditRow(client, {
          actorUserId: input.actorUserId,
          action: ACTION_EVENT_CREATED,
          entityType: "Event",
          entityId: eventId,
          newState: { status: "DRAFT", title: input.title.trim() },
        });

        return { ok: true, eventId };
      },
      { label: "create-event" },
    );
  } catch (error) {
    if (sqlstate(error) === "23514") {
      // In practice FR-EVT-007: every other ordering rule was already checked purely, and the
      // deadline-against-date midnight belongs to the database session. Reported as the draft
      // violating a storage constraint, not as a constraint name.
      return {
        ok: false,
        refusal: {
          reason: "EVENT_CONSTRAINT",
          message: "Event violates a date, time, or capacity constraint",
          requirements: "FR-EVT-006, FR-EVT-007, FR-EVT-008, FR-EVT-009",
        },
      };
    }
    throw error;
  }
}
