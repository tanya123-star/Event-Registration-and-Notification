/**
 * Types for the L4 attendance operations.
 *
 * Split from the store so callers depend on shapes without importing queries,
 * mirroring `registration-store.types.ts`.
 *
 * REQUIREMENTS
 *   FR-ATT-001  record only for a REGISTERED registration
 *   FR-ATT-002  storage-level uniqueness on the registration reference
 *   FR-ATT-003  refuse for a CANCELLED registration
 *   FR-ATT-004  refuse a record with no registration reference
 *   FR-ATT-005  record registration, user, event, presence, method, recorder,
 *               window and timestamp
 *   FR-ATT-007  refuse outside a configured window
 *   FR-ATT-011  recorder identity mandatory on staff-assisted rows
 *   FR-ATT-014  Attendance Staff or Administrator corrects with a reason
 *   FR-ATT-015  retain original value, corrector, timestamp and reason
 *   FR-ATT-016  an Event Officer may not correct attendance
 *   FR-ATT-017  owner summary distinguishing registered, present, absent,
 *               walk-ins
 *   FR-ATT-018  attendance never creates a registration
 *   FR-ATT-020  attendance retained after cancellation
 *   AUD-15      attendance recorded         AUDIT-PLAN.md line 66
 *   AUD-16      attendance corrected        AUDIT-PLAN.md line 67
 *
 * NO AUTHORIZATION MODEL. Nothing here decides which role may call these
 * operations. USER-ROLES.md and FR-ATT-011/014/016 belong to the session
 * layer, which supplies the actor the handler cores check. L4 records who;
 * it decides nothing about who may.
 */

import type { AttendanceWindowLabel } from "../domain/attendance-window.js";

/** Record one staff-assisted attendance. */
export interface RecordAttendanceInput {
  readonly registrationId: string;
  /**
   * The Attendance Staff member recording. Recorded as `recorded_by`.
   *
   * Checked for presence only (FR-ATT-011 needs an identity on the row);
   * role verification belongs to the session layer, mirroring
   * `requestedByUserId` in `CancelRegistrationInput`.
   */
  readonly recordedByUserId: string;
}

export type RecordAttendanceRefusalReason =
  /** No registration with that id exists. */
  | "REGISTRATION_NOT_FOUND"
  /** The registration is CANCELLED. FR-ATT-003. */
  | "CANCELLED_REGISTRATION"
  /** The event has no configured attendance window. FR-ATT-007. */
  | "WINDOW_NOT_CONFIGURED"
  /** Now is outside the configured window. FR-ATT-007. */
  | "OUTSIDE_WINDOW"
  /** An attendance row already exists for the registration. FR-ATT-002. */
  | "ALREADY_RECORDED";

export interface RecordAttendanceRefusal {
  readonly reason: RecordAttendanceRefusalReason;
  readonly message: string;
  readonly requirements: string;
}

export type RecordAttendanceOutcome =
  | {
      readonly ok: true;
      readonly attendanceId: string;
      readonly registrationId: string;
      readonly eventId: string;
      readonly userId: string;
      readonly window: AttendanceWindowLabel;
      readonly recordedAt: Date;
    }
  | { readonly ok: false; readonly refusal: RecordAttendanceRefusal };

/** Record one walk-in exception. */
export interface RecordWalkInInput {
  readonly eventId: string;
  /** The Attendance Staff member recording. Always required. */
  readonly recordedByUserId: string;
  /** Required in all cases: a reasonless walk-in is refused. */
  readonly reason: string;
}

export type RecordWalkInRefusalReason =
  /** No event with that id exists. */
  | "EVENT_NOT_FOUND"
  /** The reason is missing or blank. */
  | "MISSING_REASON"
  /** The event has no configured attendance window. FR-ATT-007. */
  | "WINDOW_NOT_CONFIGURED"
  /** Now is outside the configured window. FR-ATT-007. */
  | "OUTSIDE_WINDOW";

export interface RecordWalkInRefusal {
  readonly reason: RecordWalkInRefusalReason;
  readonly message: string;
  readonly requirements: string;
}

export type RecordWalkInOutcome =
  | {
      readonly ok: true;
      readonly walkInId: string;
      readonly eventId: string;
      readonly window: AttendanceWindowLabel;
      readonly recordedAt: Date;
    }
  | { readonly ok: false; readonly refusal: RecordWalkInRefusal };

/**
 * Correct one attendance record — the audited Administrator data-fix path
 * (MVP story 36). In-app corrections are prohibited; this is the only path.
 */
export interface CorrectAttendanceInput {
  readonly attendanceId: string;
  /** The Administrator performing the fix. Records who, decides nothing. */
  readonly correctedByUserId: string;
  /** Required in all cases (FR-ATT-015, SD-4). */
  readonly reason: string;
  /** The corrected presence value. */
  readonly present: boolean;
}

export type CorrectAttendanceRefusalReason =
  /** No attendance with that id exists. */
  | "ATTENDANCE_NOT_FOUND"
  /** The reason is missing or blank. FR-ATT-015, SD-4. */
  | "MISSING_REASON"
  /** The record was already corrected; history is not rewritten. FR-ATT-015. */
  | "ALREADY_CORRECTED";

export interface CorrectAttendanceRefusal {
  readonly reason: CorrectAttendanceRefusalReason;
  readonly message: string;
  readonly requirements: string;
}

export type CorrectAttendanceOutcome =
  | {
      readonly ok: true;
      readonly attendanceId: string;
      readonly present: boolean;
      readonly correctedAt: Date;
    }
  | { readonly ok: false; readonly refusal: CorrectAttendanceRefusal };

/** FR-ATT-017. Four distinct numbers, walk-ins never merged into present. */
export interface AttendanceCounts {
  readonly eventId: string;
  readonly registeredCount: number;
  readonly presentCount: number;
  readonly absentCount: number;
  readonly walkInCount: number;
}

/**
 * One staff-lookup row. Name plus Confirmation reference for the assigned
 * event only (ADR-0001). No student number: OQ-07 leaves it undecided and no
 * column exists, so number lookup is deferred, not guessed.
 */
export interface ParticipantLookupRow {
  readonly registrationId: string;
  readonly displayName: string;
  readonly confirmationReference: string;
  readonly status: string;
  readonly attendanceRecorded: boolean;
}
