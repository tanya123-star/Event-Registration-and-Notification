/**
 * Officer activity summary — pure.
 *
 * Source: ADR-0001 (minimum-necessary exposure); FR-NOT-045, FR-NOT-046,
 * FR-NOT-047; NOTIFICATION-WORKFLOW.md section 10.
 *
 * The guard: an aggregate failure count tells an officer "some addresses are
 * broken, escalate to IT". A list of broken addresses tells them whose
 * addresses are broken. Only the first is operationally sufficient, so this
 * module returns counts and NOTHING that identifies a recipient: no user id,
 * no email address, no per-recipient email failure detail. Per-recipient
 * email detail is an Administrator-only read at the store layer, never built
 * here.
 *
 * The input rows carry states only — a caller that passes addresses has
 * already violated ADR-0001, and there is no address field to pass.
 *
 * This module is L3 and pure: no I/O, no session, no external imports (enforced by
 * the `no-restricted-imports` rule scoped to `src/domain/**` in eslint.config.mjs).
 */

import type { InAppState } from "./notification-state.js";
import type { EmailState } from "./email-state.js";

/** One recipient's states. States only: never an address, never a user id. */
export interface RecipientActivityRow {
  readonly inAppState: InAppState;
  readonly emailState: EmailState;
}

/** Aggregate counts. The only officer-facing shape. */
export interface NotificationActivitySummary {
  readonly recipientsResolved: number;
  readonly createdCount: number;
  readonly readCount: number;
  readonly acknowledgedCount: number;
  readonly acknowledgementOutstanding: number;
  readonly emailSentCount: number;
  readonly emailFailureCount: number;
}

/**
 * Summarize one notification's recipient states for an Event Officer.
 * FR-NOT-045 (dispatch state and read counts), FR-NOT-046 (acknowledgement
 * outstanding as a count), FR-NOT-047 (never addresses or failure detail).
 */
export function summarizeNotificationActivity(
  rows: readonly RecipientActivityRow[],
): NotificationActivitySummary {
  let createdCount = 0;
  let readCount = 0;
  let acknowledgedCount = 0;
  let emailSentCount = 0;
  let emailFailureCount = 0;
  for (const row of rows) {
    if (row.inAppState === "CREATED") {
      createdCount += 1;
    } else if (row.inAppState === "READ") {
      readCount += 1;
    } else {
      acknowledgedCount += 1;
    }
    if (row.emailState === "SENT") {
      emailSentCount += 1;
    } else if (row.emailState === "FAILED" || row.emailState === "BOUNCED") {
      emailFailureCount += 1;
    }
  }
  return {
    recipientsResolved: rows.length,
    createdCount,
    readCount,
    acknowledgedCount,
    acknowledgementOutstanding: rows.length - acknowledgedCount,
    emailSentCount,
    emailFailureCount,
  };
}
