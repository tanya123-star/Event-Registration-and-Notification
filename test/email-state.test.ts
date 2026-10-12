import { describe, expect, it } from "vitest";
import {
  EMAIL_STATES,
  applyEmailTransition,
  type EmailState,
  type ProhibitedEmailState,
} from "../src/domain/email-state.js";

describe("email state domain", () => {
  it("contains exactly four states", () => {
    expect(EMAIL_STATES).toHaveLength(4);
  });

  it("matches the locked four-state decision", () => {
    expect([...EMAIL_STATES]).toEqual(["QUEUED", "SENT", "FAILED", "BOUNCED"]);
  });

  it("does not implement NOT_REQUESTED, which OQ-56 leaves open", () => {
    expect(EMAIL_STATES).not.toContain("NOT_REQUESTED" as ProhibitedEmailState);
  });

  it("cannot represent Delivered or Opened", () => {
    expect(EMAIL_STATES).not.toContain("Delivered" as ProhibitedEmailState);
    expect(EMAIL_STATES).not.toContain("Opened" as ProhibitedEmailState);
    for (const s of EMAIL_STATES) {
      expect(["Delivered", "Opened"]).not.toContain(s);
    }
  });
});

describe("email transitions", () => {
  it("creates a QUEUED record", () => {
    const r = applyEmailTransition({ transition: "QUEUE", current: "QUEUED", maxAttempts: 3 });
    expect(r).toEqual({ ok: true, next: "QUEUED" });
  });

  it("records acceptance by the transport as SENT", () => {
    const r = applyEmailTransition({
      transition: "ACCEPTED_BY_TRANSPORT",
      current: "QUEUED",
      maxAttempts: 3,
    });
    expect(r).toEqual({ ok: true, next: "SENT" });
  });

  it("records a transport failure as FAILED", () => {
    const r = applyEmailTransition({
      transition: "DELIVERY_FAILED",
      current: "QUEUED",
      maxAttempts: 3,
    });
    expect(r).toEqual({ ok: true, next: "FAILED" });
  });

  it("allows a retry from FAILED back to SENT", () => {
    const r = applyEmailTransition({
      transition: "ACCEPTED_BY_TRANSPORT",
      current: "FAILED",
      maxAttempts: 3,
    });
    expect(r).toEqual({ ok: true, next: "SENT" });
  });

  it("refuses to leave a terminal state", () => {
    const from: EmailState = "BOUNCED";
    for (const transition of ["ACCEPTED_BY_TRANSPORT", "DELIVERY_FAILED"] as const) {
      const r = applyEmailTransition({ transition, current: from, maxAttempts: 3 });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("INVALID_SOURCE_STATE");
    }
  });

  it("refuses BOUNCED before the retry budget is exhausted (FR-NOT-048)", () => {
    const r = applyEmailTransition({
      transition: "RETRY_EXHAUSTED",
      current: "FAILED",
      attemptsMade: 1,
      maxAttempts: 3,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("RETRY_BUDGET_NOT_EXHAUSTED");
  });

  it("permits BOUNCED once the retry budget is exhausted", () => {
    const r = applyEmailTransition({
      transition: "RETRY_EXHAUSTED",
      current: "FAILED",
      attemptsMade: 3,
      maxAttempts: 3,
    });
    expect(r).toEqual({ ok: true, next: "BOUNCED" });
  });

  it("never produces Delivered or Opened from any reachable path", () => {
    // Exhausted retries: QUEUED -> FAILED -> BOUNCED.
    let state: EmailState = "QUEUED";
    for (const transition of ["DELIVERY_FAILED", "RETRY_EXHAUSTED"] as const) {
      const r = applyEmailTransition({
        transition,
        current: state,
        attemptsMade: 3,
        maxAttempts: 3,
      });
      if (r.ok) state = r.next;
    }
    expect(state).toBe("BOUNCED");
    expect(["Delivered", "Opened"]).not.toContain(state);
  });

  it("cannot reach BOUNCED from SENT, only from QUEUED or FAILED", () => {
    const r = applyEmailTransition({
      transition: "RETRY_EXHAUSTED",
      current: "SENT",
      attemptsMade: 3,
      maxAttempts: 3,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("INVALID_SOURCE_STATE");
  });
});