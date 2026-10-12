/**
 * Types for the L4 event-creation operation.
 *
 * REQUIREMENTS
 *   FR-EVT-001  an Event Officer creates an event in DRAFT status
 *   FR-EVT-002  required fields recorded
 *   FR-EVT-003  registration window and capacity recorded when registration is required
 *   FR-EVT-006  refuse an event whose end time is not later than its start time
 *   FR-EVT-007  refuse an event whose registration deadline is later than its event date
 *   FR-EVT-008  refuse an event whose registration start is later than its deadline
 *   FR-EVT-009  refuse a capacity that is not a positive integer
 *   AUD-05      event created             AUDIT-PLAN.md line 56
 *
 * NO AUTHORIZATION MODEL. Whether the caller holds the Event Officer role is decided by the
 * session layer. `actorUserId` records who created the event, per AUD-05; it decides nothing.
 */

import type { EventDraftFailure } from "../domain/event-validation.js";

export interface CreateEventInput {
  readonly title: string;
  readonly description: string;
  readonly eventType: string;
  readonly eventDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly venue: string;
  readonly organizerOrgId?: string | null;
  readonly targetAudience?: Record<string, unknown> | null;
  readonly registrationRequired?: boolean;
  readonly registrationStart?: Date | null;
  readonly registrationDeadline?: Date | null;
  readonly capacity?: number | null;
  readonly contactPerson?: string | null;
  readonly eventMechanics?: string | null;
  readonly programFlow?: string | null;
  readonly requirements?: string | null;
  readonly materialsNeeded?: string | null;
  readonly dressCode?: string | null;
  /**
   * The creating user. Required: AUD-05 attributes the creation, and the audit row's
   * `actor_user_id` references `app_user`, so an unknown actor cannot be stored.
   */
  readonly actorUserId: string;
}

/** Why event creation was refused. */
export type CreateEventRefusalReason =
  /** One of the pure draft rules refused. The failure carries the rule. */
  | "INVALID_DRAFT"
  /** The store CHECK refused (in practice FR-EVT-007, whose midnight is session-dependent). */
  | "EVENT_CONSTRAINT"
  /** The actor id cannot reference a user. AUD-05. */
  | "UNKNOWN_ACTOR";

export interface CreateEventRefusal {
  readonly reason: CreateEventRefusalReason;
  readonly message: string;
  readonly requirements: string;
  /** Present when the refusal came from the pure draft validator. */
  readonly failure?: EventDraftFailure;
}

export type CreateEventOutcome =
  | { readonly ok: true; readonly eventId: string }
  | { readonly ok: false; readonly refusal: CreateEventRefusal };
