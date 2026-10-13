/**
 * Attendance window evaluation — pure.
 *
 * Source: docs/planning/ATTENDANCE-WORKFLOW.md section 7; FR-ATT-005,
 * FR-ATT-007; DATA-MODEL.md line 194 (`attendance_window_open`,
 * `attendance_window_close` on the Event).
 *
 * The schema carries one configured window pair per Event. Membership is
 * inclusive at both ends: the pair admits its endpoints. Attribution splits
 * the pair at the event start so a report can distinguish arrive-early
 * (pre-event) from arrive-on-time (event), per section 7.1.
 *
 * This module is L3 and pure: no I/O, no session, no external imports (enforced by
 * the `no-restricted-imports` rule scoped to `src/domain/**` in eslint.config.mjs).
 */

/** Which configured window admitted the record (FR-ATT-005). */
export const ATTENDANCE_WINDOWS = ["PRE_EVENT", "EVENT"] as const;
export type AttendanceWindowLabel = (typeof ATTENDANCE_WINDOWS)[number];

export interface AttendanceWindowInput {
  /** The configured window. Both null means no window is configured. */
  readonly open: Date | null;
  readonly close: Date | null;
  /** The moment attendance is recorded. Injected so the check is deterministic. */
  readonly now: Date;
  /** The event start (event_date plus start_time), for attribution. */
  readonly eventStart: Date;
}

export type AttendanceWindowRefusalReason = "WINDOW_NOT_CONFIGURED" | "OUTSIDE_WINDOW";

export type AttendanceWindowResult =
  | { readonly ok: true; readonly window: AttendanceWindowLabel }
  | { readonly ok: false; readonly reason: AttendanceWindowRefusalReason; readonly detail: string };

/**
 * FR-ATT-007: admit only inside the configured window. A null pair means no
 * window is configured, which is zero configured windows — the record is
 * outside all of them.
 */
export function evaluateAttendanceWindow(input: AttendanceWindowInput): AttendanceWindowResult {
  if (input.open === null && input.close === null) {
    return {
      ok: false,
      reason: "WINDOW_NOT_CONFIGURED",
      detail: "FR-ATT-007: the event has no configured attendance window",
    };
  }
  const afterOpen = input.open === null || input.now >= input.open;
  const beforeClose = input.close === null || input.now <= input.close;
  if (!afterOpen || !beforeClose) {
    return {
      ok: false,
      reason: "OUTSIDE_WINDOW",
      detail: "FR-ATT-007: attendance is outside all configured windows",
    };
  }
  return { ok: true, window: input.now < input.eventStart ? "PRE_EVENT" : "EVENT" };
}
