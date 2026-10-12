/**
 * Types for the L4 registration and capacity operations.
 *
 * Split from `registration-store.ts` so that a caller can depend on the shapes without importing the
 * store, and so the refusal contracts are readable in one place.
 *
 * REQUIREMENTS
 *   FR-REG-013  refuse a registration for an event that has reached participant capacity
 *   FR-REG-016  uniqueness on (user, event) enforced at the storage layer
 *   FR-REG-017  record user, event, timestamp, source, reference, and the context snapshot
 *   FR-REG-018  status is REGISTERED on successful creation
 *   FR-REG-019  no status other than REGISTERED or CANCELLED
 *   FR-REG-020  a confirmation reference unique to the registration
 *   FR-REG-037  refuse to reduce capacity below the count of existing registrations
 *   FR-EVT-009  refuse a capacity that is not a positive integer
 *   FR-EVT-016  record who last modified an event and when
 *   AUD-12      registration created        AUDIT-PLAN.md line 63
 *   AUD-13      registration cancelled      AUDIT-PLAN.md line 64
 *   AUD-05      event created or edited     AUDIT-PLAN.md line 56
 *
 * NO AUTHORIZATION MODEL. Nothing here decides who may call these operations. USER-ROLES.md and the
 * authority requirements (FR-REG-027, FR-REG-032, FR-REG-036) belong to a later milestone that
 * introduces route handlers and a session. Inventing an authority check now would create a gate with
 * no defined caller, and per the project-owner decision recorded in PROJECT-OWNER-DECISIONS.md it
 * would mean writing policy no source document supplies.
 */

import type { ValidationFailure, ValidationStep } from "../domain/registration-validation.js";

/** `registration_source` domain. DATA-MODEL.md line 389. */
export const REGISTRATION_SOURCES = ["SELF", "OFFICER", "ADMINISTRATOR"] as const;
export type RegistrationSource = (typeof REGISTRATION_SOURCES)[number];

/** Which validation step refused a registration, or a store-level reason it never reached one. */
export type RegistrationRefusalReason =
  /** One of FR-REG-006 .. FR-REG-015. The nine-step evaluator refused. */
  | ValidationStep
  /** FR-REG-016. The partial unique index refused despite the duplicate read passing. */
  | "STORAGE_DUPLICATE"
  /** FR-REG-013. The capacity read and the count disagreed inside one transaction. */
  | "CAPACITY_CHANGED"
  /** AUD-12. A manual (non-SELF) registration without a recorded reason. */
  | "MISSING_REASON";

export interface RegistrationRefusal {
  readonly reason: RegistrationRefusalReason;
  /** The user-facing message, from the source's "Failure message states" column. */
  readonly message: string;
  /** Which requirement decided it, so a refusal is always traceable. */
  readonly requirements: string;
  /** Present when the refusal came from the nine-step evaluator. */
  readonly failure?: ValidationFailure;
}

export type RegisterOutcome =
  | {
      readonly ok: true;
      readonly registrationId: string;
      readonly confirmationReference: string;
      readonly registeredAt: Date;
    }
  | { readonly ok: false; readonly refusal: RegistrationRefusal };

/**
 * The snapshot FR-REG-017 requires: programme, year level, and organisation at registration time.
 *
 * `student_context` is JSONB on purpose and its keys are unconstrained, because OQ-07 leaves the
 * student number undefined and StudentProfile does not exist yet. The shape here is what the store
 * *accepts*, not a validation rule; no key is required because no source says one is.
 */
export interface RegistrationContextSnapshot {
  readonly programme?: string;
  readonly yearLevel?: number;
  readonly organizationId?: string | null;
  readonly [additional: string]: unknown;
}

export interface RegisterParticipantInput {
  readonly userId: string;
  readonly eventId: string;
  readonly source: RegistrationSource;
  /**
   * The reason for a manual registration. Required when `source` is not SELF (AUD-12: "Manual
   * requires reason"); recorded on the audit row when present. A self-registration needs none.
   */
  readonly reason?: string | null;
  /**
   * The snapshot recorded on the row.
   *
   * The caller supplies it rather than the store reading it, because the snapshot must be taken at
   * registration time and the store has no StudentProfile to read from. DATA-MODEL.md line 403 requires
   * that a later programme change not rewrite history, which is why this is copied, never joined.
   */
  readonly studentContext?: RegistrationContextSnapshot | null;
}

/**
 * FR-REG-037 refusal, in the shape the project owner approved.
 *
 * Every field is present so that a caller can render an actionable message and a test can assert the
 * arithmetic. The refusal carries the numbers rather than only a sentence, because "capacity is full"
 * without the shortfall is not enough to act on.
 */
export interface CapacityReductionRefusal {
  readonly kind: "CAPACITY_REDUCTION_REFUSED";
  readonly eventId: string;
  /** What the caller asked for. */
  readonly requestedCapacity: number;
  /** Active registrations before any requested removal. */
  readonly currentRegisteredCount: number;
  /** Active registrations after the requested removals are applied. */
  readonly remainingRegisteredCount: number;
  /** Always `remainingRegisteredCount - requestedCapacity`, and always greater than zero. */
  readonly exceedsBy: number;
  readonly message: string;
  readonly requirements: string;
}

/** A requested removal that cannot be performed. DATA-MODEL.md lines 212-213. */
export type RemovalRejectionReason =
  /** The registration id does not exist at all. */
  | "REGISTRATION_NOT_FOUND"
  /** The registration belongs to a different event than the one being reduced. */
  | "WRONG_EVENT"
  /** The registration is already CANCELLED, so it is not among the active count. */
  | "NOT_ACTIVE"
  /** The registration id was supplied twice. */
  | "DUPLICATE_REMOVAL_REQUEST";

export interface RemovalRejection {
  readonly kind: "REMOVAL_REJECTED";
  readonly registrationId: string;
  readonly reason: RemovalRejectionReason;
  readonly message: string;
  readonly requirements: string;
}

export interface CapacityReductionInput {
  readonly eventId: string;
  readonly requestedCapacity: number;
  /**
   * Registrations to cancel in the same transaction, per DATA-MODEL.md lines 212-213's
   * "without simultaneous participant removal".
   *
   * These cancellations are part of the reduction, not a separate operation. If any of them is
   * invalid, or if the remaining count still exceeds the requested capacity, the entire transaction
   * is rolled back and NEITHER the cancellations nor the capacity change is committed.
   */
  readonly removeRegistrationIds?: readonly string[];
  /**
   * The actor recorded on the event's modification metadata, per FR-EVT-016.
   *
   * No authorization is inferred from this value. It records who, it does not decide who.
   */
  readonly actorUserId?: string | null;
  /**
   * AUD-13 requires a reason for a non-student cancellation; AUD-05 requires no reason for an event
   * edit. A single optional reason is therefore enough for both operations and is recorded on each
   * audit row it produces.
   */
  readonly reason?: string | null;
}

export type CapacityReductionOutcome =
  | {
      readonly ok: true;
      readonly eventId: string;
      readonly previousCapacity: number;
      readonly newCapacity: number;
      readonly removedRegistrationIds: readonly string[];
      readonly remainingRegisteredCount: number;
      readonly updatedBy: string | null;
      readonly updatedAt: Date;
    }
  | { readonly ok: false; readonly refusal: CapacityReductionRefusal | RemovalRejection };

/**
 * Standalone cancellation — one registration cancelled outside a capacity reduction.
 *
 * FR-REG-024 through FR-REG-029. The schema (migration 0003) requires every CANCELLED row to carry
 * `cancelled_at`, a non-blank `cancellation_reason`, and `cancelled_by`, with no exception for a
 * student's own cancellation — so a reason is required in all cases here, not only for
 * officer/administrator cancellations under FR-REG-028.
 */
export interface CancelRegistrationInput {
  readonly registrationId: string;
  /**
   * The user performing the cancellation. Recorded as `cancelled_by`.
   *
   * Checked for self-consistency (requestedBy === registering user means a self-cancellation, which
   * is subject to the open-window rule of FR-REG-024), never for role: role verification belongs to
   * the session layer, mirroring `actorUserId` in `CapacityReductionInput`.
   */
  readonly requestedByUserId: string;
  /** Required in all cases. A blank or missing reason cannot be stored. */
  readonly reason: string;
}

/** Why a standalone cancellation was refused. */
export type CancelRegistrationRefusalReason =
  /** No registration with that id exists. FR-REG-025. */
  | "REGISTRATION_NOT_FOUND"
  /** The row exists but is already CANCELLED. FR-REG-026. */
  | "ALREADY_CANCELLED"
  /** The reason is missing or blank. FR-REG-025, FR-REG-028. */
  | "MISSING_REASON"
  /** A self-cancellation after registration closed. FR-REG-024. */
  | "REGISTRATION_CLOSED";

export interface CancelRegistrationRefusal {
  readonly reason: CancelRegistrationRefusalReason;
  readonly message: string;
  readonly requirements: string;
}

export type CancelRegistrationOutcome =
  | {
      readonly ok: true;
      readonly registrationId: string;
      readonly eventId: string;
      readonly userId: string;
      readonly cancelledAt: Date;
      readonly cancelledBy: string;
      /** True when the canceller is the registering student. */
      readonly selfCancellation: boolean;
    }
  | { readonly ok: false; readonly refusal: CancelRegistrationRefusal };

/**
 * Read contracts. These are views over stored rows, not decisions: every filtering rule that
 * depends on role or ownership (FR-REG-031's "event they own", FR-REG-040's "only their own")
 * belongs to the session layer, which supplies the ids these functions read.
 */

/** FR-REG-030. Null capacity means uncapped, so available slots are unknown, not zero. */
export interface EventRegistrationSummary {
  readonly eventId: string;
  readonly capacity: number | null;
  readonly registeredCount: number;
  readonly availableSlots: number | null;
  /** FR-RPT-004. Cancelled rows are retained history, reported alongside the live count. */
  readonly cancelledCount: number;
}

/** FR-REG-031. One row per participant, with status and timestamp. */
export interface ParticipantRow {
  readonly registrationId: string;
  readonly userId: string;
  readonly status: string;
  readonly registeredAt: Date;
  readonly confirmationReference: string;
  readonly cancelledAt: Date | null;
  readonly studentContext: unknown;
}

/** FR-REG-040. A student's own registrations with the event identified. */
export interface UserRegistrationRow {
  readonly registrationId: string;
  readonly eventId: string;
  readonly eventTitle: string;
  readonly eventStatus: string;
  readonly status: string;
  readonly registeredAt: Date;
  readonly confirmationReference: string;
  readonly cancelledAt: Date | null;
}

/** FR-REG-001, FR-REG-002, FR-EVT-014. Published events with live counts. */
export interface PublishedEventRow {
  readonly eventId: string;
  readonly title: string;
  readonly eventDate: string;
  readonly venue: string;
  readonly status: string;
  readonly registrationOpen: boolean;
  readonly registrationDeadline: Date | null;
  readonly capacity: number | null;
  readonly registeredCount: number;
}

/**
 * Close/reopen registration — FR-REG-032, FR-REG-033, FR-REG-034.
 *
 * Both directions are gated on the event not having started; reopen additionally requires a
 * recorded reason (RV-08). Closing requires none: AUD-05 classifies an event edit as needing no
 * reason, and FR-REG-032 asks for none.
 */
export interface SetRegistrationOpenInput {
  readonly eventId: string;
  readonly open: boolean;
  /** Required when opening (RV-08). Recorded on the audit row when present. */
  readonly reason?: string | null;
  /**
   * The actor recorded on FR-EVT-016 metadata and the audit row. Records who, decides nothing —
   * the owning-officer-or-administrator permission (FR-REG-032/033) belongs to the session layer.
   */
  readonly actorUserId?: string | null;
}

/** Why a close/reopen was refused. */
export type RegistrationOpenRefusalReason =
  /** No event with that id exists. FR-REG-032. */
  | "EVENT_NOT_FOUND"
  /** The event has started; both directions require "before the event starts". */
  | "EVENT_STARTED"
  /** Reopening without a recorded reason. FR-REG-033, RV-08. */
  | "MISSING_REASON";

export interface RegistrationOpenRefusal {
  readonly reason: RegistrationOpenRefusalReason;
  readonly message: string;
  readonly requirements: string;
}

export type SetRegistrationOpenOutcome =
  | {
      readonly ok: true;
      readonly eventId: string;
      readonly registrationOpen: boolean;
      readonly updatedBy: string | null;
      readonly updatedAt: Date;
    }
  | { readonly ok: false; readonly refusal: RegistrationOpenRefusal };