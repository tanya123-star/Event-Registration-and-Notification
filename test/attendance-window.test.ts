/**
 * MVP T7 (issue #8) — attendance window evaluation and attribution.
 *
 * Seams under test (per the tdd skill; seams from the directive):
 *   - domain attendance-window (pure, no I/O): window membership and the
 *     recorded window label.
 *
 * Vocabulary per GLOSSARY.md: Attendance, Event.
 *
 * Requirements covered:
 *   - FR-ATT-005  each record carries which configured window it belongs to.
 *   - FR-ATT-007  attendance outside a configured window is refused.
 *   - ATTENDANCE-WORKFLOW.md section 7.1: the window pair admits early
 *     arrival (pre-event) and core attendance (event), so a report can
 *     distinguish arrive-early from arrive-on-time.
 *   - DATA-MODEL.md line 194: the window is `attendance_window_open` /
 *     `attendance_window_close` on the Event. When neither is configured,
 *     there are no configured windows, so the record is outside all of them.
 *
 * Issue #8 acceptance criterion: "Attendance outside all configured windows
 * is refused."
 */

import { describe, expect, it } from "vitest";

import {
  evaluateAttendanceWindow,
  type AttendanceWindowLabel,
} from "../src/domain/attendance-window.js";

const OPEN = new Date("2026-03-14T07:00:00Z");
const CLOSE = new Date("2026-03-14T12:00:00Z");
const EVENT_START = new Date("2026-03-14T09:00:00Z");

describe("attendance window evaluation (FR-ATT-007)", () => {
  it("admits a record inside the configured window", () => {
    expect(
      evaluateAttendanceWindow({ open: OPEN, close: CLOSE, now: new Date("2026-03-14T08:00:00Z"), eventStart: EVENT_START }),
    ).toEqual({ ok: true, window: "PRE_EVENT" satisfies AttendanceWindowLabel });
  });

  it("admits the window endpoints", () => {
    expect(evaluateAttendanceWindow({ open: OPEN, close: CLOSE, now: OPEN, eventStart: EVENT_START }).ok).toBe(true);
    expect(evaluateAttendanceWindow({ open: OPEN, close: CLOSE, now: CLOSE, eventStart: EVENT_START }).ok).toBe(true);
  });

  it("refuses a record before the window opens", () => {
    expect(
      evaluateAttendanceWindow({ open: OPEN, close: CLOSE, now: new Date("2026-03-14T06:59:59Z"), eventStart: EVENT_START }),
    ).toEqual({
      ok: false,
      reason: "OUTSIDE_WINDOW",
      detail: "FR-ATT-007: attendance is outside all configured windows",
    });
  });

  it("refuses a record after the window closes", () => {
    expect(
      evaluateAttendanceWindow({ open: OPEN, close: CLOSE, now: new Date("2026-03-14T12:00:01Z"), eventStart: EVENT_START }),
    ).toEqual({
      ok: false,
      reason: "OUTSIDE_WINDOW",
      detail: "FR-ATT-007: attendance is outside all configured windows",
    });
  });

  it("refuses when no window is configured: zero configured windows means outside all of them", () => {
    expect(
      evaluateAttendanceWindow({ open: null, close: null, now: new Date("2026-03-14T09:30:00Z"), eventStart: EVENT_START }),
    ).toEqual({
      ok: false,
      reason: "WINDOW_NOT_CONFIGURED",
      detail: "FR-ATT-007: the event has no configured attendance window",
    });
  });
});

describe("attendance window attribution (FR-ATT-005)", () => {
  it("attributes arrival before the event start to the pre-event window", () => {
    const result = evaluateAttendanceWindow({ open: OPEN, close: CLOSE, now: new Date("2026-03-14T08:00:00Z"), eventStart: EVENT_START });
    expect(result).toEqual({ ok: true, window: "PRE_EVENT" });
  });

  it("attributes arrival at or after the event start to the event window", () => {
    const at = evaluateAttendanceWindow({ open: OPEN, close: CLOSE, now: EVENT_START, eventStart: EVENT_START });
    expect(at).toEqual({ ok: true, window: "EVENT" });
    const after = evaluateAttendanceWindow({ open: OPEN, close: CLOSE, now: new Date("2026-03-14T10:00:00Z"), eventStart: EVENT_START });
    expect(after).toEqual({ ok: true, window: "EVENT" });
  });
});
