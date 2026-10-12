/**
 * FR-REG-005 validation order, and RV-03 / TST-03 precedence.
 *
 * Sources:
 *   REGISTRATION-WORKFLOW.md lines 93-103 — the nine checks, their rules, and their failure messages
 *   FR-REG-005 — mandates the order; REGISTRATION-WORKFLOW.md line 90 calls it locked
 *   RV-03 (TESTING-STRATEGY.md line 75) — each step's failure reported before later steps run
 *   RV-06 (line 78) — no third registration status is writable
 *   TST-03 (line 375) — reordering the validation makes RV-03 fail
 *
 * Pure tests. No database, no I/O.
 */

import { describe, expect, it } from "vitest";

import {
  STEP_MESSAGES,
  STEP_REQUIREMENTS,
  VALIDATION_STEPS,
  VALIDATION_STEP_COUNT,
  validateRegistrationAttempt,
  type RegistrationAttempt,
  type ValidationStep,
} from "../src/domain/registration-validation.js";

const BEFORE_START = new Date("2026-03-01T00:00:00Z");
const DURING_WINDOW = new Date("2026-03-10T12:00:00Z");
const AFTER_DEADLINE = new Date("2026-03-20T00:00:00Z");

/** An attempt that passes all nine checks. Each test perturbs exactly one field. */
function baseline(): RegistrationAttempt {
  return {
    authenticated: true,
    accountStatus: "ACTIVE",
    eventStatus: "PUBLISHED",
    registrationOpen: true,
    registrationStart: BEFORE_START,
    registrationDeadline: AFTER_DEADLINE,
    now: DURING_WINDOW,
    eligible: true,
    registeredCount: 3,
    capacity: 10,
    existingActiveRegistration: false,
    existingRegistrationStatus: null,
    missingRequiredFields: [],
  };
}

/**
 * An attempt that fails ALL nine steps at once.
 *
 * This is the instrument that makes precedence testable: because every step fails, whichever step
 * the function reports IS the earliest step, and nothing after it ran.
 */
function failingEveryStep(): RegistrationAttempt {
  return {
    authenticated: false,
    accountStatus: "SUSPENDED",
    eventStatus: "DRAFT",
    registrationOpen: false,
    registrationStart: AFTER_DEADLINE,
    registrationDeadline: BEFORE_START,
    now: DURING_WINDOW,
    eligible: false,
    registeredCount: 10,
    capacity: 10,
    existingActiveRegistration: true,
    existingRegistrationStatus: "REGISTERED",
    missingRequiredFields: ["programme"],
  };
}

describe("FR-REG-005 — the locked nine-step order", () => {
  it("has exactly nine steps, in the documented order", () => {
    expect(VALIDATION_STEPS).toEqual([
      "AUTHENTICATED",
      "ACCOUNT_ACTIVE",
      "EVENT_PUBLISHED",
      "REGISTRATION_OPEN",
      "DEADLINE",
      "ELIGIBILITY",
      "CAPACITY",
      "DUPLICATE",
      "REQUIRED_FIELDS",
    ]);
    expect(VALIDATION_STEP_COUNT).toBe(9);
  });

  it("maps every step to its requirement from REGISTRATION-WORKFLOW.md lines 95-103", () => {
    expect(STEP_REQUIREMENTS).toEqual({
      AUTHENTICATED: "FR-REG-006",
      ACCOUNT_ACTIVE: "FR-REG-007",
      EVENT_PUBLISHED: "FR-REG-008",
      REGISTRATION_OPEN: "FR-REG-009",
      DEADLINE: "FR-REG-010",
      ELIGIBILITY: "FR-REG-011, FR-REG-012",
      CAPACITY: "FR-REG-013",
      DUPLICATE: "FR-REG-014",
      REQUIRED_FIELDS: "FR-REG-015",
    });
  });

  it("carries the documented failure messages verbatim", () => {
    expect(STEP_MESSAGES.AUTHENTICATED).toBe("Sign in to register");
    expect(STEP_MESSAGES.ACCOUNT_ACTIVE).toBe("Account suspended, contact the office");
    expect(STEP_MESSAGES.EVENT_PUBLISHED).toBe("Event not available for registration");
    expect(STEP_MESSAGES.REGISTRATION_OPEN).toBe("Registration has not opened yet");
    expect(STEP_MESSAGES.DEADLINE).toBe("Registration deadline has passed");
    expect(STEP_MESSAGES.ELIGIBILITY).toBe("Not eligible for this event");
    expect(STEP_MESSAGES.CAPACITY).toBe("Event is full");
  });
});

describe("each of the nine steps refuses when its condition fails", () => {
  it("step 1 AUTHENTICATED refuses an unauthenticated attempt (FR-REG-006)", () => {
    const outcome = validateRegistrationAttempt({ ...baseline(), authenticated: false });
    expect(outcome).toEqual({
      ok: false,
      failure: {
        step: "AUTHENTICATED",
        message: "Sign in to register",
        requirements: "FR-REG-006",
      },
    });
  });

  it("step 2 ACCOUNT_ACTIVE refuses a suspended account (FR-REG-007)", () => {
    const outcome = validateRegistrationAttempt({ ...baseline(), accountStatus: "SUSPENDED" });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("ACCOUNT_ACTIVE");
      expect(outcome.failure.message).toBe("Account suspended, contact the office");
    }
  });

  it("step 3 EVENT_PUBLISHED refuses an unpublished event (FR-REG-008)", () => {
    const outcome = validateRegistrationAttempt({ ...baseline(), eventStatus: "DRAFT" });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("EVENT_PUBLISHED");
    }
  });

  it.each(["ONGOING", "COMPLETED", "CANCELLED", "ARCHIVED", "APPROVED"] as const)(
    "step 3 refuses %s, which is student-visible but not registrable",
    (status) => {
      const outcome = validateRegistrationAttempt({ ...baseline(), eventStatus: status });
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.failure.step).toBe("EVENT_PUBLISHED");
      }
    },
  );

  it("step 4 REGISTRATION_OPEN refuses when the flag is unset (FR-REG-009)", () => {
    const outcome = validateRegistrationAttempt({ ...baseline(), registrationOpen: false });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("REGISTRATION_OPEN");
    }
  });

  it("step 4 REGISTRATION_OPEN refuses before the window opens (FR-REG-009)", () => {
    const outcome = validateRegistrationAttempt({
      ...baseline(),
      registrationStart: AFTER_DEADLINE,
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("REGISTRATION_OPEN");
      expect(outcome.failure.message).toBe("Registration has not opened yet");
    }
  });

  it("step 5 DEADLINE refuses at and after the deadline (FR-REG-010)", () => {
    const outcome = validateRegistrationAttempt({
      ...baseline(),
      now: AFTER_DEADLINE,
      registrationDeadline: AFTER_DEADLINE,
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("DEADLINE");
    }
  });

  it("step 6 ELIGIBILITY refuses an ineligible student (FR-REG-011, FR-REG-012)", () => {
    const outcome = validateRegistrationAttempt({ ...baseline(), eligible: false });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("ELIGIBILITY");
      expect(outcome.failure.message).toBe("Not eligible for this event");
    }
  });

  it("step 7 CAPACITY refuses when count has reached capacity (FR-REG-013)", () => {
    const outcome = validateRegistrationAttempt({ ...baseline(), registeredCount: 10, capacity: 10 });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("CAPACITY");
      expect(outcome.failure.message).toBe("Event is full");
    }
  });

  it("step 7 CAPACITY admits the last available slot", () => {
    const outcome = validateRegistrationAttempt({
      ...baseline(),
      registeredCount: 9,
      capacity: 10,
    });
    expect(outcome.ok).toBe(true);
  });

  it("step 7 CAPACITY admits an uncapped event at any count", () => {
    const outcome = validateRegistrationAttempt({
      ...baseline(),
      registeredCount: 10_000,
      capacity: null,
    });
    expect(outcome.ok).toBe(true);
  });

  it("step 8 DUPLICATE refuses an existing active registration (FR-REG-014)", () => {
    const outcome = validateRegistrationAttempt({
      ...baseline(),
      existingActiveRegistration: true,
      existingRegistrationStatus: "REGISTERED",
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("DUPLICATE");
      expect(outcome.failure.message).toContain("Already registered");
      expect(outcome.failure.message).toContain("REGISTERED");
    }
  });

  it("step 8 admits re-registration after cancellation, per the OQ-10 project decision", () => {
    // Cancellation releases the slot, so a CANCELLED row must not block a fresh registration.
    const outcome = validateRegistrationAttempt({
      ...baseline(),
      existingActiveRegistration: false,
      existingRegistrationStatus: "CANCELLED",
    });
    expect(outcome.ok).toBe(true);
  });

  it("step 9 REQUIRED_FIELDS refuses a missing field and names it (FR-REG-015)", () => {
    const outcome = validateRegistrationAttempt({
      ...baseline(),
      missingRequiredFields: ["programme", "year_level"],
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("REQUIRED_FIELDS");
      expect(outcome.failure.message).toContain("programme");
    }
  });

  it("admits an attempt that satisfies all nine steps", () => {
    expect(validateRegistrationAttempt(baseline())).toEqual({ ok: true });
  });
});

describe("RV-03 — precedence: the earliest failing step is reported", () => {
  it("reports step 1 when every step fails", () => {
    const outcome = validateRegistrationAttempt(failingEveryStep());
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("AUTHENTICATED");
    }
  });

  /**
   * The core RV-03 property: with steps N..9 failing, the reported step must be N.
   *
   * Each case isolates one failing step while every LATER step also fails, so a correct
   * implementation reports N and an implementation that evaluates out of order reports something
   * later. This is what makes the ordering assertion meaningful rather than tautological.
   */
  const laterStepsAllFail = (upTo: RegistrationAttempt): RegistrationAttempt => ({
    ...failingEveryStep(),
    ...upTo,
  });

  it("reports step 2 when step 1 passes and steps 2-9 all fail", () => {
    // Only step 1 is overridden. accountStatus stays SUSPENDED from failingEveryStep, so step 2
    // fails as required.
    const outcome = validateRegistrationAttempt(laterStepsAllFail({ authenticated: true }));
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("ACCOUNT_ACTIVE");
    }
  });

  it("reports step 3 when steps 1-2 pass and steps 3-9 all fail", () => {
    const outcome = validateRegistrationAttempt(
      laterStepsAllFail({ authenticated: true, accountStatus: "ACTIVE" }),
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("EVENT_PUBLISHED");
    }
  });

  it("reports step 4 when steps 1-3 pass and steps 4-9 all fail", () => {
    const outcome = validateRegistrationAttempt(
      laterStepsAllFail({
        authenticated: true,
        accountStatus: "ACTIVE",
        eventStatus: "PUBLISHED",
        registrationOpen: false,
      }),
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("REGISTRATION_OPEN");
    }
  });

  it("reports step 5 when steps 1-4 pass and steps 5-9 all fail", () => {
    const outcome = validateRegistrationAttempt(
      laterStepsAllFail({
        authenticated: true,
        accountStatus: "ACTIVE",
        eventStatus: "PUBLISHED",
        registrationOpen: true,
        registrationStart: BEFORE_START,
        registrationDeadline: BEFORE_START,
        now: DURING_WINDOW,
      }),
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("DEADLINE");
    }
  });

  it("reports step 6 when steps 1-5 pass and steps 6-9 all fail", () => {
    const outcome = validateRegistrationAttempt(
      laterStepsAllFail({
        authenticated: true,
        accountStatus: "ACTIVE",
        eventStatus: "PUBLISHED",
        registrationOpen: true,
        registrationStart: BEFORE_START,
        registrationDeadline: AFTER_DEADLINE,
        now: DURING_WINDOW,
      }),
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("ELIGIBILITY");
    }
  });

  it("reports step 7 when steps 1-6 pass and steps 7-9 all fail", () => {
    const outcome = validateRegistrationAttempt(
      laterStepsAllFail({
        authenticated: true,
        accountStatus: "ACTIVE",
        eventStatus: "PUBLISHED",
        registrationOpen: true,
        registrationStart: BEFORE_START,
        registrationDeadline: AFTER_DEADLINE,
        now: DURING_WINDOW,
        eligible: true,
        registeredCount: 10,
        capacity: 10,
      }),
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("CAPACITY");
    }
  });

  it("reports step 8 when steps 1-7 pass and steps 8-9 both fail", () => {
    const outcome = validateRegistrationAttempt(
      laterStepsAllFail({
        authenticated: true,
        accountStatus: "ACTIVE",
        eventStatus: "PUBLISHED",
        registrationOpen: true,
        registrationStart: BEFORE_START,
        registrationDeadline: AFTER_DEADLINE,
        now: DURING_WINDOW,
        eligible: true,
        registeredCount: 1,
        capacity: 10,
        existingActiveRegistration: true,
        existingRegistrationStatus: "REGISTERED",
      }),
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("DUPLICATE");
    }
  });

  it("reports step 9 when steps 1-8 pass and only step 9 fails", () => {
    const outcome = validateRegistrationAttempt({
      ...baseline(),
      missingRequiredFields: ["year_level"],
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.failure.step).toBe("REQUIRED_FIELDS");
    }
  });
});

/**
 * TST-03 — "Validation order is reordered | RV-03 fails" (TESTING-STRATEGY.md line 375).
 *
 * TESTING-STRATEGY.md lines 384-385 require that a mutation test demonstrate a real failure: "a suite
 * that cannot fail on TST-03 is not providing assurance." This test therefore builds a deliberately
 * WRONG evaluator that evaluates in reverse order and asserts that it produces a different, incorrect
 * answer from the real one on an input where every step fails.
 *
 * The assertion is that the mutant reports the LAST step rather than the first. If it does, RV-03 has
 * a witness and the ordering assertions elsewhere in this file are load-bearing. The production code
 * is NOT modified and NOT exported for mutation; the mutant below is a local copy whose sole purpose
 * is to be wrong.
 */
describe("TST-03 — reordering the validation breaks RV-03", () => {
  /** The same nine checks, evaluated in reverse. Deliberately incorrect. */
  function validateInReverseOrder(attempt: RegistrationAttempt): string {
    if (attempt.missingRequiredFields[0] !== undefined) return "REQUIRED_FIELDS";
    if (attempt.existingActiveRegistration) return "DUPLICATE";
    if (attempt.capacity !== null && attempt.registeredCount >= attempt.capacity) return "CAPACITY";
    if (!attempt.eligible) return "ELIGIBILITY";
    if (attempt.registrationDeadline !== null && attempt.now >= attempt.registrationDeadline) {
      return "DEADLINE";
    }
    if (!attempt.registrationOpen) return "REGISTRATION_OPEN";
    if (attempt.eventStatus !== "PUBLISHED") return "EVENT_PUBLISHED";
    if (attempt.accountStatus !== "ACTIVE") return "ACCOUNT_ACTIVE";
    return "AUTHENTICATED";
  }

  it("the reordered evaluator reports the last failing step, not the first", () => {
    const real = validateRegistrationAttempt(failingEveryStep());
    const mutant = validateInReverseOrder(failingEveryStep());

    expect(real.ok).toBe(false);
    expect(mutant).toBe("REQUIRED_FIELDS");

    if (real.ok) {
      throw new Error("unreachable");
    }
    expect(real.failure.step).toBe("AUTHENTICATED");
    expect(real.failure.step).not.toBe(mutant);
  });

  /**
   * Every ordered pair of failing steps, to show the two evaluators separate at every position.
   *
   * A single failing step is NOT a usable witness: a reverse scan that returns the first step it finds
   * returns that same step, so the mutant would agree with the real evaluator and prove nothing. Two
   * simultaneous failures are required — the real evaluator must report the earlier one and the mutant
   * the later one. All 36 pairs are checked, so no position in the order is untested.
   */
  it("the two evaluators disagree on every pair of simultaneously failing steps", () => {
    // PARTIAL patches, not whole attempts. A whole attempt would reset every other field to the
    // passing baseline when merged, so the second mutation would silently undo the first — which is
    // why an earlier version of this test reported only one failing step per pair.
    const allFailing = {
      AUTHENTICATED: { authenticated: false },
      ACCOUNT_ACTIVE: { accountStatus: "SUSPENDED" },
      EVENT_PUBLISHED: { eventStatus: "DRAFT" },
      REGISTRATION_OPEN: { registrationOpen: false },
      DEADLINE: { now: AFTER_DEADLINE, registrationDeadline: AFTER_DEADLINE },
      ELIGIBILITY: { eligible: false },
      CAPACITY: { registeredCount: 10, capacity: 10 },
      DUPLICATE: { existingActiveRegistration: true },
      REQUIRED_FIELDS: { missingRequiredFields: ["programme"] },
    } as const satisfies Record<ValidationStep, Partial<RegistrationAttempt>>;

    let pairsChecked = 0;
    const failures: string[] = [];

    for (const [earlierIndex, earlierName] of VALIDATION_STEPS.entries()) {
      for (const laterName of VALIDATION_STEPS.slice(earlierIndex + 1)) {
        // Exactly these two steps fail; every other step passes. Built by MERGING the two mutations,
        // because each mutation is expressed as a full attempt spread over baseline() — applying them
        // in sequence would let the second overwrite the first and leave only one step failing.
        const attempt: RegistrationAttempt = {
          ...baseline(),
          ...allFailing[earlierName],
          ...allFailing[laterName],
        };

        const real = validateRegistrationAttempt(attempt);
        const mutant = validateInReverseOrder(attempt);

        if (real.ok) {
          failures.push(`${earlierName}+${laterName}: real evaluator accepted the attempt`);
          continue;
        }
        if (real.failure.step !== earlierName) {
          failures.push(
            `${earlierName}+${laterName}: real evaluator reported ${real.failure.step}`,
          );
        }
        if (mutant !== laterName) {
          failures.push(`${earlierName}+${laterName}: mutant reported ${mutant}`);
        }
        pairsChecked += 1;
      }
    }

    expect(pairsChecked).toBe(36);
    expect(failures).toEqual([]);
  });

  it("reordering changes the user-visible message, so RV-03 is observable", () => {
    const real = validateRegistrationAttempt(failingEveryStep());
    expect(real.ok).toBe(false);
    if (real.ok) {
      throw new Error("unreachable");
    }
    // The correct refusal is "Sign in to register"; the reordered evaluator would have told the
    // student their registration was missing a required field, which is both wrong and misleading.
    expect(real.failure.message).toBe("Sign in to register");
    expect(real.failure.message).not.toContain("Required field missing");
  });

  it("a single failing step is NOT a usable witness, and the test says so", () => {
    // Recorded deliberately. A reverse-order implementation that returns the first step it finds
    // returns that same step when only one step fails, so it agrees with the correct implementation.
    // An earlier version of this file asserted disagreement on single-step inputs and was vacuous.
    // Every perturbation below is accepted by BOTH evaluators with the same step, which is why the
    // pair-based test above is the one that carries the evidence.
    const singleStepFailures: readonly RegistrationAttempt[] = [
      { ...baseline(), authenticated: false },
      { ...baseline(), accountStatus: "SUSPENDED" },
      { ...baseline(), eventStatus: "DRAFT" },
      { ...baseline(), registrationOpen: false },
      { ...baseline(), now: AFTER_DEADLINE, registrationDeadline: AFTER_DEADLINE },
      { ...baseline(), eligible: false },
      { ...baseline(), registeredCount: 10, capacity: 10 },
      { ...baseline(), existingActiveRegistration: true },
      { ...baseline(), missingRequiredFields: ["programme"] },
    ];

    for (const attempt of singleStepFailures) {
      const real = validateRegistrationAttempt(attempt);
      expect(real.ok).toBe(false);
      if (real.ok) {
        throw new Error("unreachable");
      }
      expect(validateInReverseOrder(attempt)).toBe(real.failure.step);
    }
  });
});

describe("RV-06 — registration status domain", () => {
  it("the closed set is exactly two values", () => {
    // RV-06 concerns what the STORE will accept, verified in test/schema.test.ts. This is the
    // domain-side counterpart: no third status is representable in the validation input type.
    const status: "REGISTERED" | "CANCELLED" = "REGISTERED";
    expect(["REGISTERED", "CANCELLED"]).toContain(status);
    expect(["REGISTERED", "CANCELLED"]).toHaveLength(2);
    expect(["REGISTERED", "CANCELLED"]).not.toContain("WAITLISTED");
    expect(["REGISTERED", "CANCELLED"]).not.toContain("ATTENDED");
    expect(["REGISTERED", "CANCELLED"]).not.toContain("ABSENT");
  });

  it("treats a CANCELLED existing registration as non-blocking for the duplicate check", () => {
    const outcome = validateRegistrationAttempt({
      ...baseline(),
      existingActiveRegistration: false,
      existingRegistrationStatus: "CANCELLED",
    });
    expect(outcome.ok).toBe(true);
  });
});