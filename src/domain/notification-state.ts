/**
 * In-app Notification state machine (MVP T5, issue #6).
 *
 * Source: docs/planning/NOTIFICATION-WORKFLOW.md section 4.1; FR-NOT-002,
 * FR-NOT-004, FR-NOT-006, FR-NOT-008, FR-NOT-009.
 *
 * The in-app record is the source of truth (FR-NOT-001). Email delivery is a
 * separate layer in `./email-state.js` and can never move this machine.
 *
 * `Delivered` and `Opened` must never exist. FR-NOT-004 prohibits both.
 *
 * This module is L3 and pure: no I/O, no session, no external imports (enforced by
 * the `no-restricted-imports` rule scoped to `src/domain/**` in eslint.config.mjs).
 */

/** The complete, closed set. Three values. */
export const IN_APP_STATES = ["CREATED", "READ", "ACKNOWLEDGED"] as const;
export type InAppState = (typeof IN_APP_STATES)[number];

/** States that must never exist. Named so that a regression is a type error, not a runtime check. */
export type ProhibitedInAppState = "Delivered" | "Opened";

/** The complete, closed priority set. */
export const PRIORITIES = ["NORMAL", "HIGH", "IMPORTANT"] as const;
export type NotificationPriority = (typeof PRIORITIES)[number];

export type InAppRefusalReason =
  | "STATE_REGRESSION"
  | "ACK_NOT_REQUIRED"
  | "ACK_BEFORE_READ"
  | "ALREADY_ACKNOWLEDGED";

export type InAppResult =
  | { readonly ok: true; readonly next: InAppState }
  | { readonly ok: false; readonly reason: InAppRefusalReason; readonly detail: string };

/** FR-NOT-006: acknowledgement is required only for IMPORTANT priority. */
export function requiresAcknowledgement(priority: NotificationPriority): boolean {
  return priority === "IMPORTANT";
}

/** FR-NOT-039: opening a CREATED notification records READ. States never regress. */
export function openNotification(state: InAppState): InAppResult {
  if (state === "CREATED") {
    return { ok: true, next: "READ" };
  }
  if (state === "READ") {
    return { ok: true, next: "READ" };
  }
  return {
    ok: false,
    reason: "STATE_REGRESSION",
    detail: "An ACKNOWLEDGED notification cannot return to READ",
  };
}

export interface AcknowledgeRequest {
  readonly state: InAppState;
  readonly requiresAcknowledgement: boolean;
}

/**
 * FR-NOT-007, FR-NOT-008, FR-NOT-009: record the acknowledgement only when the
 * notification requires it and has been read.
 */
export function acknowledgeNotification(request: AcknowledgeRequest): InAppResult {
  if (!request.requiresAcknowledgement) {
    return {
      ok: false,
      reason: "ACK_NOT_REQUIRED",
      detail: "FR-NOT-008: acknowledgement is required only for IMPORTANT notifications",
    };
  }
  if (request.state === "CREATED") {
    return {
      ok: false,
      reason: "ACK_BEFORE_READ",
      detail: "FR-NOT-009: a notification must be read before it is acknowledged",
    };
  }
  if (request.state === "ACKNOWLEDGED") {
    return {
      ok: false,
      reason: "ALREADY_ACKNOWLEDGED",
      detail: "An ACKNOWLEDGED notification cannot be acknowledged again",
    };
  }
  return { ok: true, next: "ACKNOWLEDGED" };
}

/** Compile-time proof that the closed set contains exactly three members. */
export const IN_APP_STATE_COUNT = IN_APP_STATES.length as 3;
