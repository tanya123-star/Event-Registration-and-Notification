/**
 * FR-EVT-002, FR-EVT-003, FR-EVT-006, FR-EVT-008, FR-EVT-009 — event draft validation.
 *
 * Pure tests. FR-EVT-007 (deadline earlier than the event date) is owned by the store CHECK
 * `event_deadline_before_date_check`, whose midnight depends on the database session's TimeZone,
 * and is covered at the integration level in test/create-event.test.ts (RV-31's spirit, adapted:
 * the requirement is refused, by whichever layer can judge it).
 */

import { describe, expect, it } from "vitest";

import {
  validateEventDraft,
  type EventDraft,
} from "../src/domain/event-validation.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const base = new Date("2026-06-15T12:00:00Z");

function draft(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    title: "Orientation Assembly",
    description: "Welcome programme for first-year students",
    eventType: "ASSEMBLY",
    eventDate: "2026-07-01",
    startTime: "10:00",
    endTime: "12:00",
    venue: "Main Hall",
    registrationRequired: true,
    registrationStart: new Date(base.getTime() - 30 * DAY_MS),
    registrationDeadline: new Date(base.getTime() - 1 * DAY_MS),
    capacity: 200,
    ...overrides,
  };
}

describe("event draft validation", () => {
  it("accepts a complete draft", () => {
    expect(validateEventDraft(draft())).toEqual({ ok: true });
  });

  it.each([
    ["title", { title: "   " }, "TITLE_REQUIRED", "FR-EVT-002"],
    ["description", { description: "" }, "DESCRIPTION_REQUIRED", "FR-EVT-002"],
    ["event type", { eventType: "  " }, "EVENT_TYPE_REQUIRED", "FR-EVT-002"],
    ["venue", { venue: "" }, "VENUE_REQUIRED", "FR-EVT-002"],
  ])("refuses a blank %s", (_label, overrides, rule, requirements) => {
    const outcome = validateEventDraft(draft(overrides));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.rule).toBe(rule);
      expect(outcome.failure.requirements).toBe(requirements);
    }
  });

  it.each([
    ["null date", null],
    ["empty string", ""],
    ["wrong shape", "15-06-2026"],
    ["nonexistent day", "2026-02-30"],
    ["month thirteen", "2026-13-01"],
  ])("refuses event date %s", (_label, eventDate) => {
    const outcome = validateEventDraft(draft({ eventDate: eventDate as string | null }));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.rule).toBe("EVENT_DATE_REQUIRED");
    }
  });

  it.each([
    ["null times", null, null],
    ["unpadded hour", "9:00", "12:00"],
    ["wrong shape", "10am", "12:00"],
  ])("refuses start/end %s", (_label, startTime, endTime) => {
    const outcome = validateEventDraft(
      draft({ startTime: startTime as string | null, endTime: endTime as string | null }),
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.rule).toBe("TIMES_REQUIRED");
    }
  });

  it("refuses end equal to start, and end before start (FR-EVT-006, RV-31's rule)", () => {
    for (const [startTime, endTime] of [
      ["10:00", "10:00"],
      ["12:00", "10:00"],
    ]) {
      const outcome = validateEventDraft(draft({ startTime, endTime }));
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.failure.rule).toBe("END_AFTER_START");
        expect(outcome.failure.requirements).toBe("FR-EVT-006");
      }
    }
  });

  it("requires the window when registration is required, and not otherwise (FR-EVT-003)", () => {
    const missing = validateEventDraft(
      draft({ registrationStart: null, registrationDeadline: null }),
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.failure.rule).toBe("WINDOW_REQUIRED");
    }

    const notRequired = validateEventDraft(
      draft({
        registrationRequired: false,
        registrationStart: null,
        registrationDeadline: null,
        capacity: null,
      }),
    );
    expect(notRequired).toEqual({ ok: true });
  });

  it("refuses start at or after the deadline (FR-EVT-008)", () => {
    const at = new Date(base.getTime() - DAY_MS);
    for (const registrationStart of [at, new Date(at.getTime() + 1000)]) {
      const outcome = validateEventDraft(
        draft({ registrationStart, registrationDeadline: at }),
      );
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.failure.rule).toBe("WINDOW_ORDER");
        expect(outcome.failure.requirements).toBe("FR-EVT-008");
      }
    }
  });

  it("refuses zero, negative, and fractional capacity, and accepts an absent one (FR-EVT-009)", () => {
    for (const capacity of [0, -5, 2.5]) {
      const outcome = validateEventDraft(draft({ capacity }));
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.failure.rule).toBe("CAPACITY_POSITIVE");
        expect(outcome.failure.requirements).toBe("FR-EVT-009");
      }
    }
    expect(validateEventDraft(draft({ capacity: null }))).toEqual({ ok: true });
  });

  it("checks presence before relations: a blank title beats a bad window", () => {
    const outcome = validateEventDraft(draft({ title: "", registrationStart: null }));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.rule).toBe("TITLE_REQUIRED");
    }
  });
});
