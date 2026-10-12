import { describe, expect, it } from "vitest";
import {
  EVENT_STATUSES,
  isTerminal,
  isVisibleToStudents,
  type EventStatus,
} from "../src/domain/event-status.js";
import {
  TRANSITIONS,
  TRANSITION_IDS,
  applyVerified,
  availableTransitions,
  canTransition,
  type TransitionRequest,
  type VerifiedTransitionRequest,
} from "../src/domain/lifecycle.js";

const base = (over: Partial<VerifiedTransitionRequest> = {}): VerifiedTransitionRequest => ({
  transitionId: "T-02",
  actorRole: "EVENT_OFFICER",
  actorUserId: "officer-1",
  state: { status: "DRAFT", registrationOpen: false },
  conditionsVerified: true,
  ...over,
});

describe("event statuses", () => {
  it("stores exactly twelve statuses", () => {
    expect(EVENT_STATUSES).toHaveLength(12);
  });

  it("does not include REGISTRATION_OPEN or REGISTRATION_CLOSED", () => {
    expect(EVENT_STATUSES).not.toContain("REGISTRATION_OPEN");
    expect(EVENT_STATUSES).not.toContain("REGISTRATION_CLOSED");
  });

  it("treats CANCELLED and ARCHIVED as terminal", () => {
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("ARCHIVED")).toBe(true);
    expect(isTerminal("DRAFT")).toBe(false);
    expect(isTerminal("COMPLETED")).toBe(false);
  });

  it("hides unpublished statuses from students", () => {
    expect(isVisibleToStudents("PUBLISHED")).toBe(true);
    for (const s of ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PENDING_APPROVAL", "APPROVED"] as EventStatus[]) {
      expect(isVisibleToStudents(s)).toBe(false);
    }
  });
});

describe("transition matrix", () => {
  it("defines all twenty transitions with no duplicates", () => {
    expect(TRANSITIONS).toHaveLength(20);
    const ids = TRANSITIONS.map((t) => t.id);
    expect(new Set(ids).size).toBe(20);
    expect([...ids].sort()).toEqual([...TRANSITION_IDS].sort());
  });

  it("routes each non-creating transition to a valid status", () => {
    for (const t of TRANSITIONS) {
      if (t.to !== null) {
        expect(EVENT_STATUSES).toContain(t.to);
      }
    }
  });

  it("emits an audit class for every transition except the system-initiated one", () => {
    const audited = TRANSITIONS.filter((t) => t.audit !== null);
    expect(audited).toHaveLength(19);
    expect(TRANSITIONS.find((t) => t.id === "T-14")?.audit).toBeNull();
  });

  it("makes T-11, T-12 and T-13 act on the registration flag, not on status", () => {
    for (const id of ["T-11", "T-12", "T-13"] as const) {
      const t = TRANSITIONS.find((x) => x.id === id);
      expect(t?.to).toBeNull();
      expect(t?.toRegistrationOpen).toBeTypeOf("boolean");
    }
  });
});

describe("permission to transition", () => {
  it("refuses a transition from an invalid source status", () => {
    const r = applyVerified(base({ transitionId: "T-16", state: { status: "DRAFT", registrationOpen: false } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("INVALID_SOURCE_STATUS");
  });

  it("refuses a role that the matrix does not list", () => {
    const r = applyVerified(base({ transitionId: "T-03", actorRole: "STUDENT" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ACTOR_NOT_PERMITTED");
  });

  it("refuses publication by the final approver (SD-1)", () => {
    const r = applyVerified(base({
      transitionId: "T-10",
      actorRole: "EVENT_OFFICER",
      actorUserId: "approver-1",
      finalApproverUserId: "approver-1",
      state: { status: "APPROVED", registrationOpen: false },
    }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("SD-1_PUBLISHER_IS_FINAL_APPROVER");
  });

  it("allows publication by a user other than the final approver", () => {
    const r = applyVerified(base({
      transitionId: "T-10",
      actorRole: "EVENT_OFFICER",
      actorUserId: "officer-9",
      finalApproverUserId: "approver-1",
      state: { status: "APPROVED", registrationOpen: false },
    }));
    expect(r.ok).toBe(true);
  });

  it("refuses an owner approving their own event (SD-3)", () => {
    // T-08 is reachable from UNDER_REVIEW; T-09 only from PENDING_APPROVAL.
    const cases = [
      { id: "T-08", status: "UNDER_REVIEW" },
      { id: "T-09", status: "PENDING_APPROVAL" },
    ] as const;
    for (const { id, status } of cases) {
      const r = applyVerified(base({
        transitionId: id,
        actorRole: "APPROVER",
        actorUserId: "officer-1",
        ownerUserId: "officer-1",
        state: { status, registrationOpen: false },
      }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("SD-3_OWNER_CANNOT_APPROVE_OWN_EVENT");
    }
  });

  it("allows a non-owner approver to decide", () => {
    const r = applyVerified(base({
      transitionId: "T-09",
      actorRole: "APPROVER",
      actorUserId: "approver-7",
      ownerUserId: "officer-1",
      state: { status: "PENDING_APPROVAL", registrationOpen: false },
    }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.next.status).toBe("APPROVED");
  });

  it("refuses unverified conditions so a partial check cannot pass as complete", () => {
    const req: TransitionRequest = {
      transitionId: "T-03",
      actorRole: "EVENT_OFFICER",
      actorUserId: "officer-1",
      state: { status: "DRAFT", registrationOpen: false },
    };
    const r = canTransition(req);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("DOCUMENTED_CONDITIONS_UNVERIFIED");
  });

  it("refuses any transition out of a terminal status", () => {
    for (const terminal of ["CANCELLED", "ARCHIVED"] as EventStatus[]) {
      const r = applyVerified(base({ state: { status: terminal, registrationOpen: false } }));
      expect(r.ok).toBe(false);
    }
  });
});

describe("state effects", () => {
  it("T-01 creates a DRAFT with registration closed", () => {
    const r = applyVerified(base({
      transitionId: "T-01",
      state: { status: "DRAFT", registrationOpen: false },
    }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.next.status).toBe("DRAFT");
      expect(r.next.registrationOpen).toBe(false);
      expect(r.audit).toBe("AUD-05");
    }
  });

  it("T-11 opens registration without changing status", () => {
    const r = applyVerified(base({
      transitionId: "T-11",
      state: { status: "PUBLISHED", registrationOpen: false },
    }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.next.status).toBe("PUBLISHED");
      expect(r.next.registrationOpen).toBe(true);
    }
  });

  it("T-12 closes registration without changing status", () => {
    const r = applyVerified(base({
      transitionId: "T-12",
      state: { status: "PUBLISHED", registrationOpen: true },
    }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.next.status).toBe("PUBLISHED");
      expect(r.next.registrationOpen).toBe(false);
    }
  });

  it("T-14 writes no audit entry", () => {
    const r = applyVerified(base({
      transitionId: "T-14",
      actorRole: "ADMINISTRATOR",
      state: { status: "PUBLISHED", registrationOpen: false },
    }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.audit).toBeNull();
  });
});

describe("available transitions for a UI", () => {
  it("offers no approval action to a Student", () => {
    expect(availableTransitions("UNDER_REVIEW", "STUDENT")).toHaveLength(0);
  });

  it("offers attendance finalisation to Attendance Staff while ONGOING", () => {
    const ids = availableTransitions("ONGOING", "ATTENDANCE_STAFF").map((t) => t.id);
    expect(ids).toContain("T-15");
    expect(ids).not.toContain("T-16");
  });

  it("offers no transitions out of ARCHIVED", () => {
    expect(availableTransitions("ARCHIVED", "ADMINISTRATOR")).toHaveLength(0);
  });
});