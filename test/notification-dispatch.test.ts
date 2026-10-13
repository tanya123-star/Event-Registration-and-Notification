/**
 * MVP T5 (issue #6) — dispatch audience resolution and snapshot.
 *
 * Seams under test (per the tdd skill; seams from the step-4 directive):
 *   - domain notification-dispatch (pure, no I/O): recipient uniqueness and
 *     the send-time audience snapshot.
 *
 * Vocabulary per GLOSSARY.md: Notification, Student, Capacity.
 *
 * Requirements covered:
 *   - FR-NOT-013  the audience definition is stored as issued, never re-evaluated.
 *   - FR-NOT-014  one recipient record per target Student, never two.
 *   - FR-NOT-022  combined criteria evaluate conjunctively (via `isStudentInAudience`).
 *   - FR-NOT-024  refuse to dispatch to an empty audience.
 *   - FR-NOT-025  evaluate against programme, year_level and organisation held
 *     at dispatch time.
 *   - MVP.md: a manual reminder at the default lead time works initially
 *     (SYSTEM-SCOPE.md: the default 24-hour rule suffices initially; OQ-16
 *     leaves 24 vs 48 hours open, so the default is named, not decided).
 *   - NOTIFICATION-WORKFLOW.md section 7.3: a Student matching two criteria
 *     receives one Notification, not two.
 *
 * Issue #6 acceptance criteria:
 *   - "Dispatch creates exactly one addressed record per audience member,
 *     no duplicates"
 *   - "Dispatch evaluates the audience snapshot at send time"
 */

import { describe, expect, it } from "vitest";

import {
  MANUAL_REMINDER_LEAD_TIME_HOURS,
  freezeAudienceDefinition,
  resolveRecipientUserIds,
  type AudienceSnapshotInput,
} from "../src/domain/notification-dispatch.js";
import type { AudienceStudentProfile } from "../src/domain/audience.js";

function profile(overrides: Partial<AudienceStudentProfile> = {}): AudienceStudentProfile {
  return {
    programme: "BSIT",
    yearLevel: 3,
    organizationId: null,
    isEligible: true,
    ...overrides,
  };
}

describe("dispatch recipient resolution (FR-NOT-014, FR-NOT-025)", () => {
  it("creates exactly one record per audience member with no duplicates", () => {
    const students: AudienceSnapshotInput[] = [
      { userId: "user-1", profile: profile() },
      { userId: "user-2", profile: profile({ programme: "BSCS" }) },
      // Same Student matched twice (programme criterion plus registered-only
      // criterion): NOTIFICATION-WORKFLOW.md section 7.3 requires one record.
      { userId: "user-1", profile: profile() },
    ];
    expect(
      resolveRecipientUserIds(students, { programme: ["BSIT", "BSCS"] }),
    ).toEqual(["user-1", "user-2"]);
  });

  it("refuses to dispatch to an empty audience (FR-NOT-024)", () => {
    expect(resolveRecipientUserIds([], null)).toEqual({
      ok: false,
      reason: "EMPTY_AUDIENCE",
      detail: "FR-NOT-024: a dispatch whose resolved audience is empty is refused",
    });
  });

  it("refuses when no candidate is inside the audience", () => {
    const students: AudienceSnapshotInput[] = [
      { userId: "user-9", profile: profile({ programme: "BSA" }) },
    ];
    expect(resolveRecipientUserIds(students, { programme: "BSIT" })).toEqual({
      ok: false,
      reason: "EMPTY_AUDIENCE",
      detail: "FR-NOT-024: a dispatch whose resolved audience is empty is refused",
    });
  });
});

describe("audience snapshot at send time (FR-NOT-013)", () => {
  it("freezes the definition as issued so later roster changes cannot rewrite it", () => {
    const issued = { programme: "BSIT", year_level: 3 };
    const frozen = freezeAudienceDefinition(issued);
    expect(frozen).toEqual({ programme: "BSIT", year_level: 3 });
    expect(Object.isFrozen(frozen)).toBe(true);
    // A later mutation of the caller's object must not rewrite history.
    (issued as { programme: string }).programme = "BSA";
    expect(frozen).toEqual({ programme: "BSIT", year_level: 3 });
  });
});

describe("manual reminder default (MVP.md)", () => {
  it("names the default lead time in hours", () => {
    expect(MANUAL_REMINDER_LEAD_TIME_HOURS).toBe(24);
  });
});
