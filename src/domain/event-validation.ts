/**
 * Event draft validation — pure.
 *
 * Covers the creation-time rules that do not depend on database session semantics:
 *   FR-EVT-002  required fields are recorded (title, description, type, date, times, venue)
 *   FR-EVT-003  registration window and capacity recorded when registration is required
 *   FR-EVT-006  end time later than start time
 *   FR-EVT-008  registration start earlier than the deadline
 *   FR-EVT-009  capacity, when present, is a positive integer
 *
 * Two rules are deliberately NOT here:
 *   FR-EVT-004 (mechanics for non-general-assemblies) needs an event-type enumeration, which OQ-02
 *   records as not existing. No CHECK constrains it and inventing one would reject a shape no
 *   document describes — the same reasoning migration 0001 applies to `event_type`.
 *   FR-EVT-007 (deadline earlier than the event date) compares a TIMESTAMPTZ against
 *   `event_date::timestamptz`, whose midnight depends on the database session's TimeZone. A pure
 *   check would encode one timezone and disagree with the store in another. The store CHECK
 *   (`event_deadline_before_date_check`) owns this rule; `src/l4/create-event.ts` maps its 23514
 *   to a refusal rather than letting a constraint name escape.
 *
 * This module is L3 and pure: no I/O, no session, no external imports (enforced by the
 * `no-restricted-imports` rule scoped to `src/domain/**` in eslint.config.mjs).
 */

export type EventDraftRule =
  | "TITLE_REQUIRED"
  | "DESCRIPTION_REQUIRED"
  | "EVENT_TYPE_REQUIRED"
  | "VENUE_REQUIRED"
  | "EVENT_DATE_REQUIRED"
  | "TIMES_REQUIRED"
  | "END_AFTER_START"
  | "WINDOW_REQUIRED"
  | "WINDOW_ORDER"
  | "CAPACITY_POSITIVE";

export interface EventDraftFailure {
  readonly rule: EventDraftRule;
  readonly message: string;
  readonly requirements: string;
}

export type EventDraftOutcome = { readonly ok: true } | { readonly ok: false; readonly failure: EventDraftFailure };

/** Everything the creation-time rules need, gathered before validation runs. */
export interface EventDraft {
  readonly title: string;
  readonly description: string;
  readonly eventType: string;
  /** Calendar date as `YYYY-MM-DD`. */
  readonly eventDate: string | null;
  /** Times of day as zero-padded `HH:MM`, optionally with `:SS`. */
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly venue: string;
  readonly registrationRequired: boolean;
  readonly registrationStart: Date | null;
  readonly registrationDeadline: Date | null;
  /** Null means uncapped, per the OQ-09 default (capacity optional, hard cap when present). */
  readonly capacity: number | null;
}

const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isBlank(value: string): boolean {
  return value.trim() === "";
}

/** A `YYYY-MM-DD` string naming a real calendar day. `2026-02-30` is well-formed but not a date. */
function isRealDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const roundTrip = new Date(Date.UTC(year, month - 1, day));
  return (
    roundTrip.getUTCFullYear() === year &&
    roundTrip.getUTCMonth() === month - 1 &&
    roundTrip.getUTCDate() === day
  );
}

function fail(rule: EventDraftRule, message: string, requirements: string): EventDraftOutcome {
  return { ok: false, failure: { rule, message, requirements } };
}

/**
 * Validate an event draft, cheapest and most commonly failing checks first.
 *
 * Presence before relations: a missing field is reported rather than compared.
 */
export function validateEventDraft(draft: EventDraft): EventDraftOutcome {
  if (isBlank(draft.title)) {
    return fail("TITLE_REQUIRED", "Event title is required", "FR-EVT-002");
  }
  if (isBlank(draft.description)) {
    return fail("DESCRIPTION_REQUIRED", "Event description is required", "FR-EVT-002");
  }
  if (isBlank(draft.eventType)) {
    return fail("EVENT_TYPE_REQUIRED", "Event type is required", "FR-EVT-002");
  }
  if (isBlank(draft.venue)) {
    return fail("VENUE_REQUIRED", "Event venue is required", "FR-EVT-002");
  }
  if (draft.eventDate === null || !isRealDate(draft.eventDate)) {
    return fail("EVENT_DATE_REQUIRED", "A valid event date (YYYY-MM-DD) is required", "FR-EVT-002");
  }
  if (
    draft.startTime === null ||
    draft.endTime === null ||
    !TIME_PATTERN.test(draft.startTime) ||
    !TIME_PATTERN.test(draft.endTime)
  ) {
    return fail("TIMES_REQUIRED", "Valid start and end times (HH:MM) are required", "FR-EVT-002");
  }
  // Zero-padded HH:MM[:SS] of equal shape compares lexicographically as time-of-day.
  if (draft.endTime <= draft.startTime) {
    return fail("END_AFTER_START", "Event end time must be later than its start time", "FR-EVT-006");
  }
  if (draft.registrationRequired) {
    if (draft.registrationStart === null || draft.registrationDeadline === null) {
      return fail(
        "WINDOW_REQUIRED",
        "Registration start and deadline are required when registration is required",
        "FR-EVT-003",
      );
    }
    if (draft.registrationStart >= draft.registrationDeadline) {
      return fail(
        "WINDOW_ORDER",
        "Registration start must be earlier than the registration deadline",
        "FR-EVT-008",
      );
    }
  }
  if (draft.capacity !== null && (!Number.isInteger(draft.capacity) || draft.capacity < 1)) {
    return fail(
      "CAPACITY_POSITIVE",
      "Participant capacity must be a positive integer",
      "FR-EVT-009",
    );
  }
  return { ok: true };
}
