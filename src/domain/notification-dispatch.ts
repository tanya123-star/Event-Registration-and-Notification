/**
 * Dispatch audience resolution — pure.
 *
 * Source: docs/planning/NOTIFICATION-WORKFLOW.md sections 6-7; FR-NOT-013,
 * FR-NOT-014, FR-NOT-022, FR-NOT-024, FR-NOT-025; MVP.md (manual reminder at
 * the default lead time); SYSTEM-SCOPE.md (the default 24-hour rule suffices
 * initially; OQ-16 leaves 24 vs 48 hours open).
 *
 * This module resolves WHO receives a dispatch from facts already read from
 * storage. It performs no I/O itself: the caller reads the candidate profiles
 * (StudentProfile rows plus the registered-only set) and passes them in, so
 * the snapshot under test is exactly the snapshot at send time.
 *
 * This module is L3 and pure: no I/O, no session, no external imports (enforced by
 * the `no-restricted-imports` rule scoped to `src/domain/**` in eslint.config.mjs).
 */

import {
  isStudentInAudience,
  type AudienceDefinition,
  type AudienceStudentProfile,
} from "./audience.js";

/**
 * Manual-reminder default lead time in hours. A NAMED default, not a decision:
 * OQ-16 (24 vs 48 hours) is open and SYSTEM-SCOPE.md records that the default
 * 24-hour rule suffices initially. Automated scheduling is out of scope.
 */
export const MANUAL_REMINDER_LEAD_TIME_HOURS = 24 as const;

/** One dispatch candidate: the Student facts read from storage at send time. */
export interface AudienceSnapshotInput {
  readonly userId: string;
  readonly profile: AudienceStudentProfile;
}

export type DispatchRefusalReason = "EMPTY_AUDIENCE";

export type DispatchResolution =
  | readonly string[]
  | { readonly ok: false; readonly reason: DispatchRefusalReason; readonly detail: string };

/**
 * Resolve the addressed recipients for one dispatch.
 *
 * FR-NOT-014: exactly one record per target Student — a Student matching two
 * criteria (e.g. programme plus registered-only) appears once. Order follows
 * the candidate order, so the result is deterministic.
 *
 * FR-NOT-024: an empty resolved audience is refused, never dispatched silently.
 */
export function resolveRecipientUserIds(
  candidates: readonly AudienceSnapshotInput[],
  audience: AudienceDefinition | null,
): DispatchResolution {
  const seen = new Set<string>();
  const resolved: string[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.userId)) {
      continue;
    }
    if (!isStudentInAudience(candidate.profile, audience)) {
      continue;
    }
    seen.add(candidate.userId);
    resolved.push(candidate.userId);
  }
  if (resolved.length === 0) {
    return {
      ok: false,
      reason: "EMPTY_AUDIENCE",
      detail: "FR-NOT-024: a dispatch whose resolved audience is empty is refused",
    };
  }
  return resolved;
}

/**
 * FR-NOT-013: freeze the audience definition as issued. The frozen copy is
 * what the Notification row stores; it is never re-evaluated, so a later
 * roster change cannot rewrite dispatch history (NFR-INTEG-012, DATA-19).
 */
export function freezeAudienceDefinition<T>(definition: T): T {
  if (definition === null || typeof definition !== "object") {
    return definition;
  }
  const copy = (Array.isArray(definition) ? [...definition] : { ...definition }) as T;
  return Object.freeze(copy);
}
