/**
 * Registration attempt validation, in the locked nine-step order.
 *
 * Source: docs/planning/REGISTRATION-WORKFLOW.md section 4, table at lines 93-103.
 * Requirement: FR-REG-005, which mandates the order. Line 90 states the order "is **locked** and is
 * not a preference. Each check is cheap relative to the next, and the order places the most
 * security-relevant and most commonly failing checks first."
 *
 * Covers FR-REG-006 through FR-REG-015 in the same order. The failure messages are reproduced
 * verbatim from the "Failure message states" column so that the interface cannot reword a
 * requirement's user-visible refusal.
 *
 * This module is L3 and pure. It performs no I/O, reads no session, and imports nothing external
 * (enforced by the `no-restricted-imports` rule scoped to `src/domain/**` in eslint.config.mjs).
 * Every fact it needs arrives in the input, including the current time and the counts read from
 * storage. Persistence-side re-checking is still required inside the write transaction: this
 * function proves the ORDER of the checks, not their atomicity. CON-01 through CON-04 and TST-09
 * in TESTING-STRATEGY.md govern that, and are exercised in test/concurrency.test.ts.
 */

import type { EventStatus } from "./event-status.js";

/** The locked order. Length is asserted at compile time below. */
export const VALIDATION_STEPS = [
  "AUTHENTICATED",
  "ACCOUNT_ACTIVE",
  "EVENT_PUBLISHED",
  "REGISTRATION_OPEN",
  "DEADLINE",
  "ELIGIBILITY",
  "CAPACITY",
  "DUPLICATE",
  "REQUIRED_FIELDS",
] as const;

export type ValidationStep = (typeof VALIDATION_STEPS)[number];

/** Compile-time proof that FR-REG-005's nine checks are all present, and no more. */
export const VALIDATION_STEP_COUNT = VALIDATION_STEPS.length as 9;

/** Step-to-requirement mapping, as recorded at REGISTRATION-WORKFLOW.md lines 95-103. */
export const STEP_REQUIREMENTS = {
  AUTHENTICATED: "FR-REG-006",
  ACCOUNT_ACTIVE: "FR-REG-007",
  EVENT_PUBLISHED: "FR-REG-008",
  REGISTRATION_OPEN: "FR-REG-009",
  DEADLINE: "FR-REG-010",
  ELIGIBILITY: "FR-REG-011, FR-REG-012",
  CAPACITY: "FR-REG-013",
  DUPLICATE: "FR-REG-014",
  REQUIRED_FIELDS: "FR-REG-015",
} as const satisfies Record<ValidationStep, string>;

/**
 * Failure messages, verbatim from REGISTRATION-WORKFLOW.md lines 95-103.
 *
 * DUPLICATE embeds the existing status (the column reads "Already registered, with status shown")
 * and REQUIRED_FIELDS is field-specific, so neither is a constant.
 */
export const STEP_MESSAGES = {
  AUTHENTICATED: "Sign in to register",
  ACCOUNT_ACTIVE: "Account suspended, contact the office",
  EVENT_PUBLISHED: "Event not available for registration",
  REGISTRATION_OPEN: "Registration has not opened yet",
  DEADLINE: "Registration deadline has passed",
  ELIGIBILITY: "Not eligible for this event",
  CAPACITY: "Event is full",
} as const satisfies Partial<Record<ValidationStep, string>>;

/** A registration attempt that must be refused, with the step that refused it. */
export interface ValidationFailure {
  readonly step: ValidationStep;
  readonly message: string;
  /** The requirement this step enforces, so a refusal can always be traced to a source. */
  readonly requirements: string;
}

export type ValidationOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly failure: ValidationFailure };

/**
 * Everything the nine steps need, gathered before validation runs.
 *
 * The fields are facts, not queries. A caller in L4 fetches them; this module only judges them.
 */
export interface RegistrationAttempt {
  /** Step 1. FR-REG-006. */
  readonly authenticated: boolean;
  /** Step 2. FR-REG-007. `null` only when unauthenticated, which step 1 has already refused. */
  readonly accountStatus: "ACTIVE" | "SUSPENDED" | null;
  /** Step 3. FR-REG-008. */
  readonly eventStatus: EventStatus;
  /** Step 4, flag half. The `registration_open` Boolean from EVENT-LIFECYCLE.md section 2.2. */
  readonly registrationOpen: boolean;
  /** Step 4, window half and step 5. */
  readonly registrationStart: Date | null;
  readonly registrationDeadline: Date | null;
  /** Injected so that ordering is deterministic and testable without a clock. */
  readonly now: Date;
  /** Step 6. FR-REG-011 audience membership and FR-REG-012 the ineligibility mark. */
  readonly eligible: boolean;
  /** Step 7. FR-REG-013. `null` capacity means uncapped, which cannot be full. */
  readonly registeredCount: number;
  readonly capacity: number | null;
  /** Step 8. FR-REG-014. Only an active registration counts, per the partial unique index. */
  readonly existingActiveRegistration: boolean;
  /** Step 8, for the "with status shown" clause of the failure message. */
  readonly existingRegistrationStatus: "REGISTERED" | "CANCELLED" | null;
  /** Step 9. FR-REG-015. Names of required registration fields absent from the submission. */
  readonly missingRequiredFields: readonly string[];
}

/**
 * Evaluate one attempt, returning the FIRST failing step.
 *
 * Precedence is the requirement, so evaluation stops at the first refusal. RV-03 (TESTING-STRATEGY.md
 * line 75) requires each step's failure to be reported before later steps run.
 */
export function validateRegistrationAttempt(attempt: RegistrationAttempt): ValidationOutcome {
  // Step 1. FR-REG-006. A valid session exists.
  if (!attempt.authenticated) {
    return refuse("AUTHENTICATED");
  }

  // Step 2. FR-REG-007. account_status is ACTIVE.
  if (attempt.accountStatus !== "ACTIVE") {
    return refuse("ACCOUNT_ACTIVE");
  }

  // Step 3. FR-REG-008. The event must be PUBLISHED. The rule at line 97 is "Event status permits
  // visibility", but a visible event is not necessarily registrable: ONGOING, COMPLETED and
  // CANCELLED are all student-visible (EVENT-LIFECYCLE.md) while none of them accepts a new
  // registration. FR-REG-008 governs the narrower condition, "not published".
  if (attempt.eventStatus !== "PUBLISHED") {
    return refuse("EVENT_PUBLISHED");
  }

  // Step 4. FR-REG-009. Registration period open AND flag set. Both are required: the flag may be
  // set while the window has not opened, or the window may be open while an officer has closed it.
  if (!attempt.registrationOpen) {
    return refuse("REGISTRATION_OPEN");
  }
  if (attempt.registrationStart !== null && attempt.now < attempt.registrationStart) {
    return refuse("REGISTRATION_OPEN");
  }

  // Step 5. FR-REG-010. Current time is before the deadline. An event with no deadline has none to
  // pass, so the step cannot fail.
  if (attempt.registrationDeadline !== null && attempt.now >= attempt.registrationDeadline) {
    return refuse("DEADLINE");
  }

  // Step 6. FR-REG-011 and FR-REG-012. Audience membership and the ineligibility mark both fail
  // here; the source records one message for the pair.
  if (!attempt.eligible) {
    return refuse("ELIGIBILITY");
  }

  // Step 7. FR-REG-013. Count strictly below capacity. A null capacity is uncapped and never full.
  if (attempt.capacity !== null && attempt.registeredCount >= attempt.capacity) {
    return refuse("CAPACITY");
  }

  // Step 8. FR-REG-014. An existing ACTIVE registration blocks a new one. A cancelled registration
  // does not: cancellation releases the slot, per the project-owner decision on OQ-10 recorded in
  // PROJECT-OWNER-DECISIONS.md, which adopts DATA-MODEL.md lines 409-411.
  if (attempt.existingActiveRegistration) {
    const status = attempt.existingRegistrationStatus ?? "REGISTERED";
    return {
      ok: false,
      failure: {
        step: "DUPLICATE",
        message: `Already registered, with status shown: ${status}`,
        requirements: STEP_REQUIREMENTS.DUPLICATE,
      },
    };
  }

  // Step 9. FR-REG-015. Field-specific refusal, naming the first missing field.
  const missing = attempt.missingRequiredFields[0];
  if (missing !== undefined) {
    return {
      ok: false,
      failure: {
        step: "REQUIRED_FIELDS",
        message: `Required field missing: ${missing}`,
        requirements: STEP_REQUIREMENTS.REQUIRED_FIELDS,
      },
    };
  }

  return { ok: true };
}

function refuse(step: Exclude<ValidationStep, "DUPLICATE" | "REQUIRED_FIELDS">): ValidationOutcome {
  const message: string = STEP_MESSAGES[step];
  return {
    ok: false,
    failure: { step, message, requirements: STEP_REQUIREMENTS[step] },
  };
}