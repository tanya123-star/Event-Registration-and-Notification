/**
 * MVP T5 (issue #6) — officer activity view, aggregate counts only.
 *
 * Seams under test (per the tdd skill; seams from the step-4 directive):
 *   - domain notification-activity (pure, no I/O): the officer-facing summary.
 *
 * Vocabulary per GLOSSARY.md: Notification, Acknowledgement, Event Officer,
 * Student.
 *
 * Requirements covered:
 *   - ADR-0001  officers see aggregate read and acknowledgement counts only
 *     (never email addresses or per-recipient failure detail).
 *   - FR-NOT-045  dispatch state and read counts for events they own.
 *   - FR-NOT-046  per-recipient acknowledgement state for notifications
 *     requiring acknowledgement (as an outstanding COUNT, never addresses).
 *   - FR-NOT-047  no individual email address or email failure detail to any
 *     user other than an Administrator.
 *   - NOTIFICATION-WORKFLOW.md section 10: the last two rows are the guard.
 *
 * Issue #6 acceptance criterion: "Officer activity view shows counts only,
 * never email addresses or per-recipient detail."
 */

import { describe, expect, it } from "vitest";

import {
  summarizeNotificationActivity,
  type RecipientActivityRow,
} from "../src/domain/notification-activity.js";

function row(overrides: Partial<RecipientActivityRow> = {}): RecipientActivityRow {
  return {
    inAppState: "CREATED",
    emailState: "QUEUED",
    ...overrides,
  };
}

describe("officer activity summary (ADR-0001, FR-NOT-045, FR-NOT-046)", () => {
  it("reports in-app and acknowledgement counts", () => {
    const summary = summarizeNotificationActivity([
      row({ inAppState: "CREATED", emailState: "SENT" }),
      row({ inAppState: "READ", emailState: "SENT" }),
      row({ inAppState: "ACKNOWLEDGED", emailState: "SENT" }),
      row({ inAppState: "CREATED", emailState: "FAILED" }),
    ]);
    expect(summary).toEqual({
      recipientsResolved: 4,
      createdCount: 2,
      readCount: 1,
      acknowledgedCount: 1,
      // Outstanding means every recipient that has not acknowledged, not only
      // the READ ones: a CREATED recipient has not confirmed receipt either.
      acknowledgementOutstanding: 3,
      emailSentCount: 3,
      emailFailureCount: 1,
    });
  });

  it("exposes no address or per-recipient detail (FR-NOT-047)", () => {
    const summary = summarizeNotificationActivity([
      row({ inAppState: "READ", emailState: "FAILED" }),
    ]);
    const serialized = JSON.stringify(summary);
    // Aggregate COUNT field names (emailSentCount, emailFailureCount,
    // recipientsResolved) are allowed by NOTIFICATION-WORKFLOW.md section 10.
    // What must never appear is address-like content or per-recipient detail.
    expect(serialized).not.toMatch(/@|userId|user_id|emailAddress|failureDetail|perRecipient/i);
    expect(Object.keys(summary).sort()).toEqual([
      "acknowledgedCount",
      "acknowledgementOutstanding",
      "createdCount",
      "emailFailureCount",
      "emailSentCount",
      "readCount",
      "recipientsResolved",
    ]);
  });

  it("counts an empty dispatch as all zeros", () => {
    expect(summarizeNotificationActivity([])).toEqual({
      recipientsResolved: 0,
      createdCount: 0,
      readCount: 0,
      acknowledgedCount: 0,
      acknowledgementOutstanding: 0,
      emailSentCount: 0,
      emailFailureCount: 0,
    });
  });
});
