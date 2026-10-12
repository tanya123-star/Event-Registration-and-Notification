/**
 * Event lifecycle statuses.
 *
 * Source: docs/planning/EVENT-LIFECYCLE.md section 2.
 *
 * Twelve statuses are stored. REGISTRATION_OPEN and REGISTRATION_CLOSED are NOT statuses; they are
 * the two conceptual states carried by the single `registration_open` Boolean on the event
 * (EVENT-LIFECYCLE.md line 72, and the annotation added to section 2.2). Transitions T-11, T-12 and
 * T-13 act on that Boolean, not on `status`.
 *
 * This is the locked lifecycle decision. No status is added or removed here.
 */

export const EVENT_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "FOR_REVISION",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "PUBLISHED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

/** True when no further transition is permitted from this status. */
export const TERMINAL_STATUSES = ["CANCELLED", "ARCHIVED"] as const satisfies readonly EventStatus[];

export function isTerminal(status: EventStatus): boolean {
  return (TERMINAL_STATUSES as readonly EventStatus[]).includes(status);
}

/** Statuses a student may see. Source: EVENT-LIFECYCLE.md section 2 visibility column. */
export const STUDENT_VISIBLE_STATUSES = [
  "PUBLISHED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly EventStatus[];

export function isVisibleToStudents(status: EventStatus): boolean {
  return (STUDENT_VISIBLE_STATUSES as readonly EventStatus[]).includes(status);
}

/** The Boolean-backed registration states. Not lifecycle statuses. */
export const REGISTRATION_STATES = ["REGISTRATION_OPEN", "REGISTRATION_CLOSED"] as const;
export type RegistrationState = (typeof REGISTRATION_STATES)[number];