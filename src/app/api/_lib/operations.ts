/**
 * Handler cores: the testable middle between Route Handlers and the L4 use cases.
 *
 * A route file does three things it cannot get wrong because there is almost nothing there:
 * parse the request, resolve the identity, and call one function here. Everything that CAN be
 * wrong — input validation, refusal mapping, error responses — lives in these functions, which
 * take an explicit pool and an explicit actor and return a `Response`. That makes them directly
 * testable against a real database with no server running and no session to forge.
 *
 * DELIBERATE GAPS, each recorded where it applies rather than hidden:
 *   - eligibility caller flag is passed as true and ANDed with the storage
 *     evaluation (StudentProfile against the Event audience plus is_eligible):
 *     the ELIGIBILITY step now fires on a real signal (MVP T3, issue #4).
 *   - required registration fields are empty: no per-event field definitions exist, so nothing is
 *     "missing". FR-REG-015's machinery (the missingRequiredFields fact) is wired, not triggered.
 *   - registration source is forced to SELF: officer manual registration (FR-REG-035) needs the
 *     officer role, which needs the session layer. A client-supplied source would be a
 *     trusted-role claim.
 *   - SD-2 is enforced at the registration endpoint (USER-ROLES.md section 5, FR-REG-036):
 *     an actor holding ATTENDANCE_STAFF or APPROVER is refused before any use case runs,
 *     even when they also hold the Student role.
 *   - the event list is audience-filtered per StudentProfile; a caller with no
 *     profile sees every published Event (transitional fallback, removed by
 *     issue #9 — MVP T8: Administrator CSV student import).
 */

import { SerializationExhaustedError } from "../../../db/client.js";
import type { Role } from "../../../domain/lifecycle.js";
import { createEvent } from "../../../l4/create-event.js";
import { reduceEventCapacity } from "../../../l4/capacity.js";
import { cancelRegistration } from "../../../l4/cancel-registration.js";
import { registerParticipant } from "../../../l4/register-participant.js";
import { setRegistrationOpen } from "../../../l4/registration-open.js";
import { recordAttendance } from "../../../l4/record-attendance.js";
import { recordWalkIn } from "../../../l4/record-walk-in.js";
import { correctAttendance } from "../../../l4/correct-attendance.js";
import {
  getAttendanceCounts,
  lookupParticipants,
} from "../../../l4/attendance-reads.js";
import {
  getEventRegistrationSummary,
  listEventParticipants,
  listPublishedEventsForStudent,
} from "../../../l4/registration-reads.js";
import {
  cancelRefusalStatus,
  capacityRefusalStatus,
  contentionResponse,
  correctAttendanceRefusalStatus,
  createEventRefusalStatus,
  errorResponse,
  internalError,
  recordAttendanceRefusalStatus,
  recordWalkInRefusalStatus,
  registrationOpenRefusalStatus,
  registrationRefusalStatus,
  suspendedAccount,
} from "./responses.js";

/** A verified actor. Handlers obtain this from identity.ts, tests pass it literally. */
export interface AuthenticatedActor {
  readonly userId: string;
  readonly accountStatus: "ACTIVE" | "SUSPENDED" | null;
  /**
   * Roles read from storage at request time (identity.ts). Absent only for
   * callers that predate the SD-2 gate; such callers are treated as holding no
   * refused role (fail-open transitional leniency). The route seam passes the
   * resolved identity straight through, so production callers always carry
   * this.
   * TODO(#10): make `roles` required once every caller supplies roles from
   * identity. Deny-by-default was deferred because existing test callers omit
   * `roles` (see the absent-roles pin in test/api-operations.test.ts); issue
   * #10 (REST completion) finalizes the handler-core surface and owns the
   * tightening.
   */
  readonly roles?: readonly Role[];
}

/** Roles that may never hold a Registration (USER-ROLES.md SD-2, FR-REG-036). */
const REGISTRATION_REFUSED_ROLES: readonly Role[] = ["ATTENDANCE_STAFF", "APPROVER"];

/** SD-2: registration endpoints reject Attendance Staff and Approver holders. */
function registrationRoleResponse(
  actor: AuthenticatedActor,
  requestId: string | null,
): Response | null {
  const held = actor.roles ?? [];
  if (held.some((role) => REGISTRATION_REFUSED_ROLES.includes(role))) {
    return errorResponse(
      403,
      "ROLE_NOT_PERMITTED",
      "This role may not register for events",
      requestId,
      "SD-2, FR-REG-036",
    );
  }
  return null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A 400 for a path id that can never name a row. Distinct from 404: the request is malformed. */
function invalidIdResponse(what: string, requestId: string | null): Response {
  return errorResponse(400, `INVALID_${what}_ID`, `The ${what.toLowerCase()} id is malformed`, requestId);
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Parse a JSON body. Malformed JSON and non-object bodies are 400, never 500. */
export async function readJsonBody(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  const requestId = request.headers.get("x-correlation-id");
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return {
      ok: false,
      response: errorResponse(400, "INVALID_JSON", "The request body is not valid JSON", requestId),
    };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      ok: false,
      response: errorResponse(400, "INVALID_REQUEST", "The request body must be a JSON object", requestId),
    };
  }
  return { ok: true, value };
}

function field(record: Record<string, unknown>, name: string): unknown {
  return record[name];
}

function asOptionalString(value: unknown): string | null | undefined {
  if (value === undefined || value === null) {
    return value ?? undefined;
  }
  return typeof value === "string" ? value : null;
}

/** Suspended accounts are refused before any use case runs (AUTH-12). */
function activeOrSuspended(actor: AuthenticatedActor, requestId: string | null): Response | null {
  if (actor.accountStatus === "SUSPENDED") {
    return suspendedAccount(requestId);
  }
  return null;
}

function requestIdOf(request: Request): string | null {
  const value = request.headers.get("x-correlation-id");
  return value === null || value === "" ? null : value;
}

/** Map an unexpected throw: contention is retryable (503), everything else is opaque (500). */
function failureResponse(error: unknown, requestId: string | null): Response {
  if (error instanceof SerializationExhaustedError) {
    return contentionResponse(requestId);
  }
  return internalError(requestId);
}

/** GET /api/v1/events — published Events in the Student audience with live counts. */
export async function listEventsOperation(
  pool: Parameters<typeof listPublishedEventsForStudent>[0],
  actor: AuthenticatedActor,
  request: Request,
): Promise<Response> {
  const requestId = requestIdOf(request);
  const suspended = activeOrSuspended(actor, requestId);
  if (suspended !== null) {
    return suspended;
  }
  try {
    const events = await listPublishedEventsForStudent(pool, actor.userId);
    return Response.json({ events }, { status: 200 });
  } catch (error) {
    return failureResponse(error, requestId);
  }
}

/** POST /api/v1/events — create an event in DRAFT. */
export async function createEventOperation(
  pool: Parameters<typeof createEvent>[0],
  actor: AuthenticatedActor,
  request: Request,
): Promise<Response> {
  const requestId = requestIdOf(request);
  const suspended = activeOrSuspended(actor, requestId);
  if (suspended !== null) {
    return suspended;
  }
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  const body = parsed.value as Record<string, unknown>;

  // Shape check at the boundary: every field the L4 input needs must have the right JSON type.
  // Semantic checks (blank? ordered? positive?) belong to the L3 validator, not here.
  const strings = [
    "title",
    "description",
    "eventType",
    "eventDate",
    "startTime",
    "endTime",
    "venue",
  ] as const;
  for (const name of strings) {
    if (typeof field(body, name) !== "string") {
      return errorResponse(400, "INVALID_REQUEST", `Field '${name}' must be a string`, requestId);
    }
  }
  const capacity = field(body, "capacity");
  if (capacity !== undefined && capacity !== null && typeof capacity !== "number") {
    return errorResponse(400, "INVALID_REQUEST", "Field 'capacity' must be a number or null", requestId);
  }
  const registrationRequired = field(body, "registrationRequired");
  if (
    registrationRequired !== undefined &&
    typeof registrationRequired !== "boolean"
  ) {
    return errorResponse(
      400,
      "INVALID_REQUEST",
      "Field 'registrationRequired' must be a boolean",
      requestId,
    );
  }
  for (const name of ["registrationStart", "registrationDeadline"] as const) {
    const value = field(body, name);
    if (value !== undefined && value !== null) {
      if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
        return errorResponse(400, "INVALID_REQUEST", `Field '${name}' must be an ISO date string`, requestId);
      }
    }
  }

  try {
    const outcome = await createEvent(pool, {
      title: body["title"] as string,
      description: body["description"] as string,
      eventType: body["eventType"] as string,
      eventDate: body["eventDate"] as string,
      startTime: body["startTime"] as string,
      endTime: body["endTime"] as string,
      venue: body["venue"] as string,
      organizerOrgId: asOptionalString(field(body, "organizerOrgId")) ?? null,
      targetAudience:
        field(body, "targetAudience") === undefined || field(body, "targetAudience") === null
          ? null
          : (field(body, "targetAudience") as Record<string, unknown>),
      registrationRequired:
        typeof registrationRequired === "boolean" ? registrationRequired : true,
      registrationStart:
        typeof field(body, "registrationStart") === "string"
          ? new Date(field(body, "registrationStart") as string)
          : null,
      registrationDeadline:
        typeof field(body, "registrationDeadline") === "string"
          ? new Date(field(body, "registrationDeadline") as string)
          : null,
      capacity: typeof capacity === "number" ? capacity : null,
      contactPerson: asOptionalString(field(body, "contactPerson")) ?? null,
      eventMechanics: asOptionalString(field(body, "eventMechanics")) ?? null,
      programFlow: asOptionalString(field(body, "programFlow")) ?? null,
      requirements: asOptionalString(field(body, "requirements")) ?? null,
      materialsNeeded: asOptionalString(field(body, "materialsNeeded")) ?? null,
      dressCode: asOptionalString(field(body, "dressCode")) ?? null,
      actorUserId: actor.userId,
    });
    if (!outcome.ok) {
      return errorResponse(
        createEventRefusalStatus(outcome.refusal.reason),
        outcome.refusal.reason,
        outcome.refusal.message,
        requestId,
        outcome.refusal.requirements,
      );
    }
    return Response.json({ eventId: outcome.eventId }, { status: 201 });
  } catch (error) {
    return failureResponse(error, requestId);
  }
}

/** POST /api/v1/events/[eventId]/registrations — register the calling student. */
export async function registerOperation(
  pool: Parameters<typeof registerParticipant>[0],
  actor: AuthenticatedActor,
  request: Request,
  eventId: string,
): Promise<Response> {
  const requestId = requestIdOf(request);
  const roleRefused = registrationRoleResponse(actor, requestId);
  if (roleRefused !== null) {
    return roleRefused;
  }
  if (!isUuid(eventId)) {
    return invalidIdResponse("EVENT", requestId);
  }
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  const body = parsed.value as Record<string, unknown>;
  const studentContext = field(body, "studentContext");
  if (
    studentContext !== undefined &&
    (typeof studentContext !== "object" || studentContext === null || Array.isArray(studentContext))
  ) {
    return errorResponse(400, "INVALID_REQUEST", "Field 'studentContext' must be an object", requestId);
  }

  try {
    const outcome = await registerParticipant(
      pool,
      {
        userId: actor.userId,
        eventId,
        // Forced SELF: officer manual registration (FR-REG-035) needs the officer role, which
        // needs the session layer. A client-supplied source would be a trusted-role claim.
        source: "SELF",
        studentContext:
          studentContext === undefined
            ? null
            : (studentContext as Record<string, unknown>),
      },
      {
        authenticated: true,
        accountStatus: actor.accountStatus,
        // Fail-safe true: the L4 use case ANDs this with the storage evaluation
        // (StudentProfile against the Event audience plus is_eligible), so the
        // ELIGIBILITY step fires on a real signal (MVP T3, issue #4).
        eligible: true,
        missingRequiredFields: [],
      },
    );
    if (!outcome.ok) {
      return errorResponse(
        registrationRefusalStatus(outcome.refusal.reason),
        outcome.refusal.reason,
        outcome.refusal.message,
        requestId,
        outcome.refusal.requirements,
      );
    }
    return Response.json(
      {
        registrationId: outcome.registrationId,
        confirmationReference: outcome.confirmationReference,
        registeredAt: outcome.registeredAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return failureResponse(error, requestId);
  }
}

/** POST /api/v1/registrations/[registrationId]/cancel — cancel with a reason. */
export async function cancelRegistrationOperation(
  pool: Parameters<typeof cancelRegistration>[0],
  actor: AuthenticatedActor,
  request: Request,
  registrationId: string,
): Promise<Response> {
  const requestId = requestIdOf(request);
  const suspended = activeOrSuspended(actor, requestId);
  if (suspended !== null) {
    return suspended;
  }
  if (!isUuid(registrationId)) {
    return invalidIdResponse("REGISTRATION", requestId);
  }
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  const reason = field(parsed.value as Record<string, unknown>, "reason");
  if (typeof reason !== "string" || reason.trim() === "") {
    return errorResponse(400, "MISSING_REASON", "A reason is required to cancel a registration", requestId, "FR-REG-025");
  }

  try {
    const outcome = await cancelRegistration(pool, {
      registrationId,
      requestedByUserId: actor.userId,
      reason,
    });
    if (!outcome.ok) {
      return errorResponse(
        cancelRefusalStatus(outcome.refusal.reason),
        outcome.refusal.reason,
        outcome.refusal.message,
        requestId,
        outcome.refusal.requirements,
      );
    }
    return Response.json(
      {
        registrationId: outcome.registrationId,
        cancelledAt: outcome.cancelledAt.toISOString(),
        selfCancellation: outcome.selfCancellation,
      },
      { status: 200 },
    );
  } catch (error) {
    return failureResponse(error, requestId);
  }
}

/** GET /api/v1/events/[eventId]/summary — counts for an event. */
export async function eventSummaryOperation(
  pool: Parameters<typeof getEventRegistrationSummary>[0],
  actor: AuthenticatedActor,
  request: Request,
  eventId: string,
): Promise<Response> {
  const requestId = requestIdOf(request);
  const suspended = activeOrSuspended(actor, requestId);
  if (suspended !== null) {
    return suspended;
  }
  if (!isUuid(eventId)) {
    return invalidIdResponse("EVENT", requestId);
  }
  try {
    const summary = await getEventRegistrationSummary(pool, eventId);
    if (summary === null) {
      return errorResponse(404, "EVENT_NOT_FOUND", "Event not found", requestId);
    }
    return Response.json({ summary }, { status: 200 });
  } catch (error) {
    return failureResponse(error, requestId);
  }
}

/** GET /api/v1/events/[eventId]/participants — the participant list. */
export async function eventParticipantsOperation(
  pool: Parameters<typeof listEventParticipants>[0],
  actor: AuthenticatedActor,
  request: Request,
  eventId: string,
): Promise<Response> {
  const requestId = requestIdOf(request);
  const suspended = activeOrSuspended(actor, requestId);
  if (suspended !== null) {
    return suspended;
  }
  if (!isUuid(eventId)) {
    return invalidIdResponse("EVENT", requestId);
  }
  try {
    const participants = await listEventParticipants(pool, eventId);
    return Response.json({ participants }, { status: 200 });
  } catch (error) {
    return failureResponse(error, requestId);
  }
}

/** PATCH /api/v1/events/[eventId]/registration-open — close or reopen registration. */
export async function setRegistrationOpenOperation(
  pool: Parameters<typeof setRegistrationOpen>[0],
  actor: AuthenticatedActor,
  request: Request,
  eventId: string,
): Promise<Response> {
  const requestId = requestIdOf(request);
  const suspended = activeOrSuspended(actor, requestId);
  if (suspended !== null) {
    return suspended;
  }
  if (!isUuid(eventId)) {
    return invalidIdResponse("EVENT", requestId);
  }
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  const body = parsed.value as Record<string, unknown>;
  const open = field(body, "open");
  if (typeof open !== "boolean") {
    return errorResponse(400, "INVALID_REQUEST", "Field 'open' must be a boolean", requestId);
  }

  try {
    const outcome = await setRegistrationOpen(pool, {
      eventId,
      open,
      reason: asOptionalString(field(body, "reason")) ?? null,
      actorUserId: actor.userId,
    });
    if (!outcome.ok) {
      return errorResponse(
        registrationOpenRefusalStatus(outcome.refusal.reason),
        outcome.refusal.reason,
        outcome.refusal.message,
        requestId,
        outcome.refusal.requirements,
      );
    }
    return Response.json(
      {
        eventId: outcome.eventId,
        registrationOpen: outcome.registrationOpen,
        updatedAt: outcome.updatedAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    return failureResponse(error, requestId);
  }
}

/** PATCH /api/v1/events/[eventId]/capacity — reduce capacity, optionally removing participants. */
export async function reduceCapacityOperation(
  pool: Parameters<typeof reduceEventCapacity>[0],
  actor: AuthenticatedActor,
  request: Request,
  eventId: string,
): Promise<Response> {
  const requestId = requestIdOf(request);
  const suspended = activeOrSuspended(actor, requestId);
  if (suspended !== null) {
    return suspended;
  }
  if (!isUuid(eventId)) {
    return invalidIdResponse("EVENT", requestId);
  }
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  const body = parsed.value as Record<string, unknown>;
  const capacity = field(body, "capacity");
  if (typeof capacity !== "number") {
    return errorResponse(400, "INVALID_REQUEST", "Field 'capacity' must be a number", requestId);
  }
  const removeRegistrationIds = field(body, "removeRegistrationIds");
  if (
    removeRegistrationIds !== undefined &&
    (!Array.isArray(removeRegistrationIds) ||
      removeRegistrationIds.some((id) => typeof id !== "string" || !isUuid(id)))
  ) {
    return errorResponse(
      400,
      "INVALID_REQUEST",
      "Field 'removeRegistrationIds' must be an array of registration ids",
      requestId,
    );
  }
  // A malformed UUID would otherwise reach the store as 22P02; shape errors stay 400 here.

  try {
    const outcome = await reduceEventCapacity(pool, {
      eventId,
      requestedCapacity: capacity,
      ...(removeRegistrationIds === undefined
        ? {}
        : { removeRegistrationIds: removeRegistrationIds as readonly string[] }),
      actorUserId: actor.userId,
      reason: asOptionalString(field(body, "reason")) ?? null,
    });
    if (!outcome.ok) {
      const refusal = outcome.refusal;
      const code = refusal.kind === "REMOVAL_REJECTED" ? refusal.reason : refusal.kind;
      const message = refusal.message;
      return errorResponse(
        capacityRefusalStatus(refusal),
        code,
        message,
        requestId,
        refusal.requirements,
      );
    }
    return Response.json(
      {
        eventId: outcome.eventId,
        previousCapacity: outcome.previousCapacity,
        newCapacity: outcome.newCapacity,
        removedRegistrationIds: outcome.removedRegistrationIds,
        remainingRegisteredCount: outcome.remainingRegisteredCount,
      },
      { status: 200 },
    );
  } catch (error) {
    return failureResponse(error, requestId);
  }
}

/** Roles that may record attendance via the staff-assisted path (USER-ROLES.md section 4). */
const ATTENDANCE_RECORD_ROLES: readonly Role[] = ["ATTENDANCE_STAFF", "ADMINISTRATOR"];

/** Attendance endpoints admit staff and administrators only. */
function attendanceRoleResponse(
  actor: AuthenticatedActor,
  requestId: string | null,
): Response | null {
  const held = actor.roles ?? [];
  if (!held.some((role) => ATTENDANCE_RECORD_ROLES.includes(role))) {
    return errorResponse(
      403,
      "ROLE_NOT_PERMITTED",
      "This role may not record attendance",
      requestId,
      "USER-ROLES.md section 4",
    );
  }
  return null;
}

/** POST /api/v1/registrations/[registrationId]/attendance — record one attendance. */
export async function recordAttendanceOperation(
  pool: Parameters<typeof recordAttendance>[0],
  actor: AuthenticatedActor,
  request: Request,
  registrationId: string,
): Promise<Response> {
  const requestId = requestIdOf(request);
  const roleRefused = attendanceRoleResponse(actor, requestId);
  if (roleRefused !== null) {
    return roleRefused;
  }
  if (!isUuid(registrationId)) {
    return invalidIdResponse("REGISTRATION", requestId);
  }
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const outcome = await recordAttendance(pool, {
      registrationId,
      recordedByUserId: actor.userId,
    });
    if (!outcome.ok) {
      return errorResponse(
        recordAttendanceRefusalStatus(outcome.refusal.reason),
        outcome.refusal.reason,
        outcome.refusal.message,
        requestId,
        outcome.refusal.requirements,
      );
    }
    return Response.json(
      {
        attendanceId: outcome.attendanceId,
        registrationId: outcome.registrationId,
        recordedAt: outcome.recordedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return failureResponse(error, requestId);
  }
}

/** POST /api/v1/events/[eventId]/walk-ins — record one walk-in exception. */
export async function recordWalkInOperation(
  pool: Parameters<typeof recordWalkIn>[0],
  actor: AuthenticatedActor,
  request: Request,
  eventId: string,
): Promise<Response> {
  const requestId = requestIdOf(request);
  const roleRefused = attendanceRoleResponse(actor, requestId);
  if (roleRefused !== null) {
    return roleRefused;
  }
  if (!isUuid(eventId)) {
    return invalidIdResponse("EVENT", requestId);
  }
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  const reason = field(parsed.value as Record<string, unknown>, "reason");
  if (typeof reason !== "string" || reason.trim() === "") {
    return errorResponse(400, "MISSING_REASON", "A reason is required to record a walk-in", requestId, "ATT-12");
  }

  try {
    const outcome = await recordWalkIn(pool, {
      eventId,
      recordedByUserId: actor.userId,
      reason,
    });
    if (!outcome.ok) {
      return errorResponse(
        recordWalkInRefusalStatus(outcome.refusal.reason),
        outcome.refusal.reason,
        outcome.refusal.message,
        requestId,
        outcome.refusal.requirements,
      );
    }
    return Response.json(
      {
        walkInId: outcome.walkInId,
        eventId: outcome.eventId,
        recordedAt: outcome.recordedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return failureResponse(error, requestId);
  }
}

/**
 * PATCH /api/v1/attendance/[attendanceId]/correction — the audited data-fix path.
 *
 * FR-ATT-016: an Event Officer may not correct attendance. Attendance Staff
 * and Administrators correct with a reason (FR-ATT-014); every other role is
 * refused before any use case runs.
 */
export async function correctAttendanceOperation(
  pool: Parameters<typeof correctAttendance>[0],
  actor: AuthenticatedActor,
  request: Request,
  attendanceId: string,
): Promise<Response> {
  const requestId = requestIdOf(request);
  const suspended = activeOrSuspended(actor, requestId);
  if (suspended !== null) {
    return suspended;
  }
  const roleRefused = attendanceRoleResponse(actor, requestId);
  if (roleRefused !== null) {
    return roleRefused;
  }
  if (!isUuid(attendanceId)) {
    return invalidIdResponse("ATTENDANCE", requestId);
  }
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  const body = parsed.value as Record<string, unknown>;
  const reason = field(body, "reason");
  if (typeof reason !== "string" || reason.trim() === "") {
    return errorResponse(400, "MISSING_REASON", "A reason is required to correct an attendance record", requestId, "FR-ATT-015");
  }
  const present = field(body, "present");
  if (typeof present !== "boolean") {
    return errorResponse(400, "INVALID_REQUEST", "Field 'present' must be a boolean", requestId);
  }

  try {
    const outcome = await correctAttendance(pool, {
      attendanceId,
      correctedByUserId: actor.userId,
      reason,
      present,
    });
    if (!outcome.ok) {
      return errorResponse(
        correctAttendanceRefusalStatus(outcome.refusal.reason),
        outcome.refusal.reason,
        outcome.refusal.message,
        requestId,
        outcome.refusal.requirements,
      );
    }
    return Response.json(
      {
        attendanceId: outcome.attendanceId,
        present: outcome.present,
        correctedAt: outcome.correctedAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    return failureResponse(error, requestId);
  }
}

/** GET /api/v1/events/[eventId]/attendance/summary — the four live counts. */
export async function attendanceSummaryOperation(
  pool: Parameters<typeof getAttendanceCounts>[0],
  actor: AuthenticatedActor,
  request: Request,
  eventId: string,
): Promise<Response> {
  const requestId = requestIdOf(request);
  const suspended = activeOrSuspended(actor, requestId);
  if (suspended !== null) {
    return suspended;
  }
  if (!isUuid(eventId)) {
    return invalidIdResponse("EVENT", requestId);
  }
  try {
    const counts = await getAttendanceCounts(pool, eventId);
    return Response.json({ counts }, { status: 200 });
  } catch (error) {
    return failureResponse(error, requestId);
  }
}

/** GET /api/v1/events/[eventId]/attendance/lookup — staff participant lookup. */
export async function lookupParticipantsOperation(
  pool: Parameters<typeof lookupParticipants>[0],
  actor: AuthenticatedActor,
  request: Request,
  eventId: string,
): Promise<Response> {
  const requestId = requestIdOf(request);
  const suspended = activeOrSuspended(actor, requestId);
  if (suspended !== null) {
    return suspended;
  }
  if (!isUuid(eventId)) {
    return invalidIdResponse("EVENT", requestId);
  }
  const query = new URL(request.url).searchParams.get("query") ?? "";
  if (query.trim() === "") {
    return errorResponse(400, "MISSING_QUERY", "A lookup query is required", requestId);
  }
  try {
    const participants = await lookupParticipants(pool, eventId, query);
    return Response.json({ participants }, { status: 200 });
  } catch (error) {
    return failureResponse(error, requestId);
  }
}
