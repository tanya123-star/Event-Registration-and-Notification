/**
 * Event lifecycle transition machine.
 *
 * Source: docs/planning/EVENT-LIFECYCLE.md section 4, transition matrix rows T-01 to T-20.
 *
 * Pure domain logic. This module performs no I/O, does not know a database exists, and does not
 * read a session, per SYSTEM-ARCHITECTURE.md section 2.1. The caller supplies the context; this
 * module decides whether a transition is permitted and what the resulting state is.
 *
 * Transitions T-11, T-12, T-13 and T-19 act on the `registrationOpen` Boolean rather than on
 * `status`, per the section 2.2 annotation.
 */

import type { EventStatus } from "./event-status.js";

export const ROLES = [
  "ADMINISTRATOR",
  "EVENT_OFFICER",
  "APPROVER",
  "STUDENT",
  "ATTENDANCE_STAFF",
] as const;

export type Role = (typeof ROLES)[number];

export const TRANSITION_IDS = [
  "T-01", "T-02", "T-03", "T-04", "T-05", "T-06", "T-07", "T-08",
  "T-09", "T-10", "T-11", "T-12", "T-13", "T-14", "T-15", "T-16",
  "T-17", "T-18", "T-19", "T-20",
] as const;

export type TransitionId = (typeof TRANSITION_IDS)[number];

/** Audit event class emitted by a transition, per AUDIT-PLAN.md. */
export type AuditClass =
  | "AUD-05" | "AUD-06" | "AUD-07" | "AUD-08" | "AUD-09" | "AUD-10"
  | "AUD-11" | "AUD-20" | "AUD-23"
  | null; // null = system-initiated, no audit entry (EVENT-LIFECYCLE.md T-14)

export interface TransitionRule {
  readonly id: TransitionId;
  readonly action: string;
  readonly from: readonly EventStatus[];
  readonly to: EventStatus | null; // null = does not change `status`
  readonly toRegistrationOpen?: boolean;
  readonly actors: readonly Role[];
  readonly audit: AuditClass;
  /** Documented conditions. The caller evaluates them; this machine does not. */
  readonly conditions: readonly string[];
}

/**
 * The closed transition set. Per SYSTEM-ARCHITECTURE.md SD-B this is the only permitted set of
 * state changes; a change not represented here is not a legal transition.
 */
export const TRANSITIONS: readonly TransitionRule[] = [
  { id: "T-01", action: "Create event", from: [], to: "DRAFT",
    actors: ["EVENT_OFFICER"], audit: "AUD-05",
    conditions: ["Officer holds EVT permission"] },
  { id: "T-02", action: "Edit draft", from: ["DRAFT"], to: "DRAFT",
    actors: ["EVENT_OFFICER"], audit: "AUD-05",
    conditions: ["No submitted approval active"] },
  { id: "T-03", action: "Submit for approval", from: ["DRAFT"], to: "SUBMITTED",
    actors: ["EVENT_OFFICER"], audit: "AUD-06",
    conditions: ["Required event fields complete", "Approval chain configured"] },
  { id: "T-04", action: "Begin review", from: ["SUBMITTED"], to: "UNDER_REVIEW",
    actors: ["APPROVER"], audit: "AUD-07",
    conditions: ["Approver assigned to current step"] },
  { id: "T-05", action: "Request revision", from: ["UNDER_REVIEW"], to: "FOR_REVISION",
    actors: ["APPROVER"], audit: "AUD-08",
    conditions: ["Comments provided"] },
  { id: "T-06", action: "Resubmit", from: ["FOR_REVISION"], to: "SUBMITTED",
    actors: ["EVENT_OFFICER"], audit: "AUD-06",
    conditions: ["Revision comments addressed"] },
  { id: "T-07", action: "Reject", from: ["UNDER_REVIEW"], to: "REJECTED",
    actors: ["APPROVER"], audit: "AUD-09",
    conditions: ["Reason provided"] },
  { id: "T-08", action: "Approve step (intermediate)", from: ["UNDER_REVIEW"], to: "PENDING_APPROVAL",
    actors: ["APPROVER"], audit: "AUD-07",
    conditions: ["No other blocking step"] },
  { id: "T-09", action: "Approve final step", from: ["PENDING_APPROVAL"], to: "APPROVED",
    actors: ["APPROVER"], audit: "AUD-07",
    conditions: ["All required steps approved"] },
  { id: "T-10", action: "Publish", from: ["APPROVED"], to: "PUBLISHED",
    actors: ["EVENT_OFFICER", "ADMINISTRATOR"], audit: "AUD-10",
    conditions: ["Chain re-verified at publication", "Publisher is not the final approver"] },
  { id: "T-11", action: "Open registration", from: ["PUBLISHED"], to: null, toRegistrationOpen: true,
    actors: ["EVENT_OFFICER"], audit: "AUD-11",
    conditions: ["Registration required", "Capacity and deadline set"] },
  { id: "T-12", action: "Close registration", from: ["PUBLISHED"], to: null, toRegistrationOpen: false,
    actors: ["EVENT_OFFICER"], audit: "AUD-11",
    conditions: [] },
  { id: "T-13", action: "Reopen registration", from: ["PUBLISHED"], to: null, toRegistrationOpen: true,
    actors: ["EVENT_OFFICER"], audit: "AUD-11",
    conditions: ["Before event start", "Reason provided"] },
  { id: "T-14", action: "Date arrives", from: ["PUBLISHED"], to: "ONGOING",
    actors: [], audit: null,
    conditions: ["Event start time reached"] },
  { id: "T-15", action: "Finalise attendance", from: ["ONGOING"], to: "ONGOING",
    actors: ["ATTENDANCE_STAFF", "ADMINISTRATOR"], audit: "AUD-23",
    conditions: ["Counts confirmed", "Discrepancy explained"] },
  { id: "T-16", action: "Conclude", from: ["ONGOING"], to: "COMPLETED",
    actors: ["EVENT_OFFICER"], audit: "AUD-20",
    conditions: ["Attendance finalised"] },
  { id: "T-17", action: "Cancel event", from: ["ONGOING"], to: "CANCELLED",
    actors: ["EVENT_OFFICER", "ADMINISTRATOR"], audit: "AUD-20",
    conditions: ["Reason provided"] },
  { id: "T-18", action: "Cancel event", from: ["PUBLISHED"], to: "CANCELLED",
    actors: ["EVENT_OFFICER", "ADMINISTRATOR"], audit: "AUD-20",
    conditions: ["Reason provided"] },
  { id: "T-19", action: "Cancel event", from: ["PUBLISHED"], to: "CANCELLED",
    actors: ["EVENT_OFFICER", "ADMINISTRATOR"], audit: "AUD-20",
    conditions: ["Reason provided", "Registrants notified"] },
  { id: "T-20", action: "Archive event", from: ["COMPLETED"], to: "ARCHIVED",
    actors: ["EVENT_OFFICER", "ADMINISTRATOR"], audit: "AUD-20",
    conditions: ["Evaluation submitted"] },
] as const;

/**
 * Transitions EVENT-LIFECYCLE.md lists as NOT permitted. Present so that a caller attempting one
 * receives a refusal naming the rule rather than a generic error.
 */
export const FORBIDDEN_TRANSITIONS = [
  { from: "APPROVED", to: "FOR_REVISION", reason: "Post-approval change follows section 6, not a reverse approval" },
  { from: "PUBLISHED", to: "DRAFT", reason: "No unpublishing" },
  { from: "COMPLETED", to: "ONGOING", reason: "Completed events do not re-open" },
  { from: "REJECTED", to: "PENDING_APPROVAL", reason: "Rejected events restart as DRAFT" },
] as const;

export interface EventState {
  readonly status: EventStatus;
  readonly registrationOpen: boolean;
}

export interface TransitionRequest {
  readonly transitionId: TransitionId;
  readonly actorRole: Role;
  readonly state: EventState;
  /** userId of the actor. Required to evaluate SD-1 and SD-3. */
  readonly actorUserId: string;
  /** userId that produced the final approval, for SD-1. */
  readonly finalApproverUserId?: string;
  /** userId that created/owns the event, for SD-3. */
  readonly ownerUserId?: string;
}

export type TransitionRefusalReason =
  | "UNKNOWN_TRANSITION"
  | "TERMINAL_STATUS"
  | "INVALID_SOURCE_STATUS"
  | "ACTOR_NOT_PERMITTED"
  | "SD-1_PUBLISHER_IS_FINAL_APPROVER"
  | "SD-3_OWNER_CANNOT_APPROVE_OWN_EVENT"
  | "DOCUMENTED_CONDITIONS_UNVERIFIED";

export type TransitionResult =
  | { readonly ok: true; readonly next: EventState; readonly audit: AuditClass }
  | { readonly ok: false; readonly reason: TransitionRefusalReason; readonly detail: string };

/**
 * Evaluates whether a transition is permitted. Does NOT evaluate the documented conditions — those
 * require data this layer does not have. A caller that has not verified them must pass
 * `conditionsVerified: true` via the narrower `applyVerified` entry point; otherwise this function
 * refuses with DOCUMENTED_CONDITIONS_UNVERIFIED so that a partial check cannot be mistaken for a
 * complete one.
 */
export function canTransition(request: TransitionRequest): TransitionResult {
  const rule = TRANSITIONS.find((t) => t.id === request.transitionId);
  if (rule === undefined) {
    return { ok: false, reason: "UNKNOWN_TRANSITION", detail: `No transition ${request.transitionId}` };
  }

  if (rule.from.length === 0) {
    // T-01 creates the aggregate. There is no prior status to check.
    return {
      ok: true,
      next: { status: rule.to as EventStatus, registrationOpen: false },
      audit: rule.audit,
    };
  }

  if (!rule.from.includes(request.state.status)) {
    return {
      ok: false,
      reason: "INVALID_SOURCE_STATUS",
      detail: `${rule.id} is not permitted from ${request.state.status}`,
    };
  }

  if (rule.actors.length > 0 && !rule.actors.includes(request.actorRole)) {
    return {
      ok: false,
      reason: "ACTOR_NOT_PERMITTED",
      detail: `${rule.id} permits ${rule.actors.join(", ")}; actor holds ${request.actorRole}`,
    };
  }

  // SD-3: an Event Officer may not approve their own event. Enforced through SD-1 per
  // USER-ROLES.md section 5, restated here because the transition set makes it checkable.
  const isApproval = rule.id === "T-08" || rule.id === "T-09";
  if (isApproval && request.ownerUserId !== undefined &&
      request.actorUserId === request.ownerUserId) {
    return {
      ok: false,
      reason: "SD-3_OWNER_CANNOT_APPROVE_OWN_EVENT",
      detail: "SD-3: an Event Officer cannot approve their own event",
    };
  }

  // SD-1: the publisher must not be the user who granted final approval.
  if (rule.id === "T-10" && request.finalApproverUserId !== undefined &&
      request.actorUserId === request.finalApproverUserId) {
    return {
      ok: false,
      reason: "SD-1_PUBLISHER_IS_FINAL_APPROVER",
      detail: "SD-1: publication requires an APPROVED record produced by a different user",
    };
  }

  return {
    ok: false,
    reason: "DOCUMENTED_CONDITIONS_UNVERIFIED",
    detail: `${rule.id} requires: ${rule.conditions.join("; ") || "no additional conditions"}`,
  };
}

export interface VerifiedTransitionRequest extends TransitionRequest {
  /** The caller asserts every entry in `rule.conditions` has been checked against real data. */
  readonly conditionsVerified: true;
}

/**
 * Applies a transition once the caller has verified the documented conditions. This is the entry
 * point application code uses; `canTransition` exists so that a UI can offer only legal choices.
 */
export function applyVerified(request: VerifiedTransitionRequest): TransitionResult {
  const rule = TRANSITIONS.find((t) => t.id === request.transitionId);
  if (rule === undefined) {
    return { ok: false, reason: "UNKNOWN_TRANSITION", detail: `No transition ${request.transitionId}` };
  }
  if (rule.from.length > 0 && !rule.from.includes(request.state.status)) {
    return { ok: false, reason: "INVALID_SOURCE_STATUS", detail: `${rule.id} is not permitted from ${request.state.status}` };
  }
  if (rule.actors.length > 0 && !rule.actors.includes(request.actorRole)) {
    return { ok: false, reason: "ACTOR_NOT_PERMITTED", detail: `${rule.id} permits ${rule.actors.join(", ")}; actor holds ${request.actorRole}` };
  }
  if ((request.transitionId === "T-08" || request.transitionId === "T-09") &&
      request.ownerUserId !== undefined && request.actorUserId === request.ownerUserId) {
    return { ok: false, reason: "SD-3_OWNER_CANNOT_APPROVE_OWN_EVENT", detail: "SD-3: an Event Officer cannot approve their own event" };
  }
  if (request.transitionId === "T-10" && request.finalApproverUserId !== undefined &&
      request.actorUserId === request.finalApproverUserId) {
    return { ok: false, reason: "SD-1_PUBLISHER_IS_FINAL_APPROVER", detail: "SD-1: publication requires an APPROVED record produced by a different user" };
  }

  const next: EventState = {
    status: rule.to ?? request.state.status,
    registrationOpen: rule.toRegistrationOpen ?? request.state.registrationOpen,
  };
  return { ok: true, next, audit: rule.audit };
}

/** Transitions available from a given status to a given role, for building a UI. */
export function availableTransitions(status: EventStatus, role: Role): readonly TransitionRule[] {
  return TRANSITIONS.filter(
    (t) => (t.from.length === 0 || t.from.includes(status)) &&
           (t.actors.length === 0 || t.actors.includes(role)),
  );
}