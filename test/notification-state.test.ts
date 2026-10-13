/**
 * MVP T5 (issue #6) — in-app Notification state and Acknowledgement guards.
 *
 * Seams under test (per the tdd skill; seams from the step-4 directive):
 *   - domain notification-state (pure, no I/O): the in-app source of truth.
 *
 * Vocabulary per GLOSSARY.md: Notification, Acknowledgement, Student.
 *
 * Requirements covered:
 *   - FR-NOT-001  the in-app notification centre is the authoritative record.
 *   - FR-NOT-002  in-app state is one of CREATED, READ, ACKNOWLEDGED.
 *   - FR-NOT-004  no Delivered or Opened state exists.
 *   - FR-NOT-006  acknowledgement is required only for IMPORTANT priority.
 *   - FR-NOT-008  refuse acknowledgement where it is not required.
 *   - FR-NOT-009  refuse acknowledgement before the Notification has been read.
 *   - NOTIFICATION-WORKFLOW.md section 4.1: states never regress.
 *
 * Issue #6 acceptance criterion: "Acknowledging a non-IMPORTANT Notification
 * is rejected with nothing recorded."
 */

import { describe, expect, it } from "vitest";

import {
  IN_APP_STATES,
  PRIORITIES,
  acknowledgeNotification,
  openNotification,
  requiresAcknowledgement,
  type ProhibitedInAppState,
} from "../src/domain/notification-state.js";

describe("in-app notification states (FR-NOT-002)", () => {
  it("contains exactly the three locked states", () => {
    expect([...IN_APP_STATES]).toEqual(["CREATED", "READ", "ACKNOWLEDGED"]);
  });

  it("cannot represent Delivered or Opened (FR-NOT-004)", () => {
    expect(IN_APP_STATES).not.toContain("Delivered" as ProhibitedInAppState);
    expect(IN_APP_STATES).not.toContain("Opened" as ProhibitedInAppState);
  });
});

describe("acknowledgement requirement (FR-NOT-006)", () => {
  it("requires acknowledgement only for IMPORTANT priority", () => {
    expect([...PRIORITIES]).toEqual(["NORMAL", "HIGH", "IMPORTANT"]);
    expect(requiresAcknowledgement("IMPORTANT")).toBe(true);
    expect(requiresAcknowledgement("NORMAL")).toBe(false);
    expect(requiresAcknowledgement("HIGH")).toBe(false);
  });
});

describe("opening a notification (FR-NOT-039)", () => {
  it("advances CREATED to READ", () => {
    expect(openNotification("CREATED")).toEqual({ ok: true, next: "READ" });
  });

  it("refuses to regress ACKNOWLEDGED back to READ", () => {
    const result = openNotification("ACKNOWLEDGED");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("STATE_REGRESSION");
    }
  });
});

describe("acknowledging a notification (FR-NOT-008, FR-NOT-009)", () => {
  it("rejects acknowledgement of a non-IMPORTANT notification with nothing recorded", () => {
    const result = acknowledgeNotification({ state: "READ", requiresAcknowledgement: false });
    expect(result).toEqual({
      ok: false,
      reason: "ACK_NOT_REQUIRED",
      detail: "FR-NOT-008: acknowledgement is required only for IMPORTANT notifications",
    });
  });

  it("rejects acknowledgement before the notification has been read", () => {
    const result = acknowledgeNotification({ state: "CREATED", requiresAcknowledgement: true });
    expect(result).toEqual({
      ok: false,
      reason: "ACK_BEFORE_READ",
      detail: "FR-NOT-009: a notification must be read before it is acknowledged",
    });
  });

  it("accepts acknowledgement of a read IMPORTANT notification", () => {
    expect(acknowledgeNotification({ state: "READ", requiresAcknowledgement: true })).toEqual({
      ok: true,
      next: "ACKNOWLEDGED",
    });
  });

  it("refuses a second acknowledgement once already acknowledged", () => {
    const result = acknowledgeNotification({ state: "ACKNOWLEDGED", requiresAcknowledgement: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("ALREADY_ACKNOWLEDGED");
    }
  });
});
