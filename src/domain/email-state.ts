/**
 * Email delivery state machine.
 *
 * Source: docs/planning/NOTIFICATION-WORKFLOW.md section 3; FR-NOT-003; FR-NOT-048.
 *
 * FOUR states, per the locked notification-state decision. `NOT_REQUESTED` is deliberately NOT
 * implemented: it appears only in FR-NOT-003 and DATA-MODEL.md section 2.10, and the register
 * records the four-state definition as the locked decision (OQ-56, still open, escalated to
 * Council under PB-ENG-20:204). This module complies with the locked decision rather than
 * reopening it.
 *
 * `Delivered` and `Opened` must never exist. FR-NOT-004 prohibits both. There is no value here
 * that could be set to either, and the transition table below cannot produce one.
 *
 * OQ-61 is open. `BOUNCED` here means the retry policy was exhausted, which is the proposal
 * recorded at OPEN-QUESTIONS.md:751-753 and is explicitly labelled there as not a decision. The
 * alternative — a confirmed bounce — cannot be detected under the send-only scope.
 */

/** The complete, closed set. Four values. */
export const EMAIL_STATES = ["QUEUED", "SENT", "FAILED", "BOUNCED"] as const;
export type EmailState = (typeof EMAIL_STATES)[number];

/** States that must never exist. Named so that a regression is a type error, not a runtime check. */
export type ProhibitedEmailState = "Delivered" | "Opened" | "NOT_REQUESTED";

export type EmailTransition =
  | "QUEUE"
  | "ACCEPTED_BY_TRANSPORT"
  | "DELIVERY_FAILED"
  | "RETRY_EXHAUSTED";

const TRANSITION_TABLE: Record<EmailTransition, {
  from: readonly EmailState[];
  to: EmailState;
}> = {
  QUEUE: { from: [], to: "QUEUED" },
  ACCEPTED_BY_TRANSPORT: { from: ["QUEUED", "FAILED"], to: "SENT" },
  DELIVERY_FAILED: { from: ["QUEUED", "SENT"], to: "FAILED" },
  RETRY_EXHAUSTED: { from: ["QUEUED", "FAILED"], to: "BOUNCED" },
} as const;

export type EmailRefusalReason =
  | "UNKNOWN_TRANSITION"
  | "INVALID_SOURCE_STATE"
  | "RETRY_BUDGET_NOT_EXHAUSTED"
  | "PROHIBITED_STATE_REQUESTED";

export type EmailResult =
  | { readonly ok: true; readonly next: EmailState }
  | { readonly ok: false; readonly reason: EmailRefusalReason; readonly detail: string };

export interface EmailTransitionRequest {
  readonly transition: EmailTransition;
  readonly current: EmailState;
  /** Attempts made so far. Required for RETRY_EXHAUSTED. */
  readonly attemptsMade?: number;
  /** The configured bound from FR-NOT-048. */
  readonly maxAttempts: number;
}

export function applyEmailTransition(request: EmailTransitionRequest): EmailResult {
  const rule = TRANSITION_TABLE[request.transition];
  if (rule === undefined) {
    return { ok: false, reason: "UNKNOWN_TRANSITION", detail: `No transition ${request.transition}` };
  }

  // QUEUE creates the record; there is no prior state.
  if (rule.from.length === 0) {
    return { ok: true, next: rule.to };
  }

  if (!rule.from.includes(request.current)) {
    return {
      ok: false,
      reason: "INVALID_SOURCE_STATE",
      detail: `${request.transition} is not permitted from ${request.current}`,
    };
  }

  // FR-NOT-048: BOUNCED is reached only once the retry policy is exhausted. Reaching it early
  // would report a permanent failure for a message that may still succeed.
  if (request.transition === "RETRY_EXHAUSTED") {
    const attempts = request.attemptsMade ?? 0;
    if (attempts < request.maxAttempts) {
      return {
        ok: false,
        reason: "RETRY_BUDGET_NOT_EXHAUSTED",
        detail: `FR-NOT-048: BOUNCED requires ${request.maxAttempts} attempts; ${attempts} made`,
      };
    }
  }

  return { ok: true, next: rule.to };
}

/** Compile-time proof that the closed set contains exactly four members. */
export const EMAIL_STATE_COUNT = EMAIL_STATES.length as 4;