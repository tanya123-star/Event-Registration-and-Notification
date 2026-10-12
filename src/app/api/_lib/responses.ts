/**
 * The HTTP error contract.
 *
 * Every error response has the same shape, so a client can rely on it and a test can assert it:
 *
 *   { "error": { "code": "...", "message": "...", "requirements": "...?", "requestId": "...?" } }
 *
 * `code` is a stable machine-readable token. For L4 refusals it IS the refusal reason — the
 * reasons were designed as contract tokens, which is why they read as SCREAMING_CASE. `message`
 * is the user-facing sentence from the use case, never reworded here: REGISTRATION-WORKFLOW.md
 * fixes those sentences, so rewording would fork the contract. `requirements` traces the refusal
 * to its source requirement. `requestId` echoes the documented correlation header
 * (`CORRELATION_HEADER=x-correlation-id` in .env.example) when the caller supplied one.
 *
 * STATUS POLICY — one rule per class, documented so the mapping is reviewable:
 *   400  the request itself is malformed (bad JSON, wrong types, blank required input)
 *   401  no verified identity (the seam in identity.ts returned null)
 *   403  the verified identity is not permitted (suspended account, ineligible student)
 *   404  the named row does not exist
 *   409  the request conflicts with current state (closed window, full event, duplicate,
 *          already cancelled, capacity refusal) — retrying the identical request cannot succeed,
 *          but a changed request might
 *   503  the database serialised the request away under contention; retrying may succeed
 *   500  anything else, with no internal detail (SECS-09)
 *
 * All mapping here is pure: refusal in, status and body out. No I/O, no session, no imports
 * beyond types. That makes the contract unit-testable without a database.
 */

import type {
  CancelRegistrationRefusalReason,
  CapacityReductionRefusal,
  RegistrationRefusalReason,
  RegistrationOpenRefusalReason,
  RemovalRejection,
} from "../../../db/registration-store.types.js";
import type { CreateEventRefusalReason as EventRefusalReason } from "../../../db/event-store.types.js";

export interface ErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly requirements?: string;
    readonly requestId?: string;
  };
}

export function errorBody(
  code: string,
  message: string,
  requestId: string | null,
  requirements?: string,
): ErrorBody {
  return {
    error: {
      code,
      message,
      ...(requirements === undefined ? {} : { requirements }),
      ...(requestId === null ? {} : { requestId }),
    },
  };
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string | null,
  requirements?: string,
): Response {
  return Response.json(errorBody(code, message, requestId, requirements), { status });
}

/** The documented correlation header, echoed when present. */
export function requestIdOf(request: Request): string | null {
  const value = request.headers.get("x-correlation-id");
  return value === null || value === "" ? null : value;
}

export function unauthenticated(requestId: string | null): Response {
  return errorResponse(401, "UNAUTHENTICATED", "Sign in to use this resource", requestId, "FR-USR-001");
}

export function suspendedAccount(requestId: string | null): Response {
  return errorResponse(
    403,
    "ACCOUNT_SUSPENDED",
    "Account suspended, contact the office",
    requestId,
    "FR-USR-009",
  );
}

/** L4 registration refusals to status. 409 = state conflict; the message says which. */
export function registrationRefusalStatus(reason: RegistrationRefusalReason): number {
  switch (reason) {
    case "AUTHENTICATED":
      return 401;
    case "ACCOUNT_ACTIVE":
      return 403;
    case "EVENT_PUBLISHED":
      return 404;
    case "ELIGIBILITY":
      return 403;
    case "REQUIRED_FIELDS":
    case "MISSING_REASON":
      return 400;
    case "REGISTRATION_OPEN":
    case "DEADLINE":
    case "CAPACITY":
    case "DUPLICATE":
    case "STORAGE_DUPLICATE":
    case "CAPACITY_CHANGED":
      return 409;
  }
}

/** Standalone cancellation refusals to status. */
export function cancelRefusalStatus(reason: CancelRegistrationRefusalReason): number {
  switch (reason) {
    case "REGISTRATION_NOT_FOUND":
      return 404;
    case "MISSING_REASON":
      return 400;
    case "ALREADY_CANCELLED":
    case "REGISTRATION_CLOSED":
      return 409;
  }
}

/** Event-creation refusals to status. */
export function createEventRefusalStatus(reason: EventRefusalReason): number {
  switch (reason) {
    case "INVALID_DRAFT":
    case "EVENT_CONSTRAINT":
      return 400;
    case "UNKNOWN_ACTOR":
      // The actor came from a verified identity that no longer resolves to a user: the session is
      // stale, in the spirit of AUTH-13 (revocation takes effect immediately).
      return 401;
  }
}

/** Capacity-reduction refusals to status. */
export function capacityRefusalStatus(
  refusal: CapacityReductionRefusal | RemovalRejection,
): number {
  if (refusal.kind === "REMOVAL_REJECTED") {
    return refusal.reason === "REGISTRATION_NOT_FOUND" ? 404 : 409;
  }
  return 409;
}

/** Close/reopen refusals to status. */
export function registrationOpenRefusalStatus(reason: RegistrationOpenRefusalReason): number {
  switch (reason) {
    case "EVENT_NOT_FOUND":
      return 404;
    case "MISSING_REASON":
      return 400;
    case "EVENT_STARTED":
      return 409;
  }
}

/** Bounded-retry exhaustion under contention: retryable, so 503, never a business refusal. */
export function contentionResponse(requestId: string | null): Response {
  return errorResponse(
    503,
    "TEMPORARILY_UNAVAILABLE",
    "The system is busy; retry the request",
    requestId,
  );
}

/** Unexpected failures carry no internal detail: no SQLSTATE, no constraint name, no stack. */
export function internalError(requestId: string | null): Response {
  return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred", requestId);
}
