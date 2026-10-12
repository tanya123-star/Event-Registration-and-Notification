/**
 * L4: the registration use case.
 *
 * SYSTEM-ARCHITECTURE.md line 98 forbids L4 from "contain[ing] a validation rule that belongs to L3".
 * This module therefore contains NO rule. It gathers facts, hands them to the pure nine-step evaluator
 * in `src/domain/registration-validation.ts`, and acts on that verdict inside one SERIALIZABLE
 * transaction.
 *
 * NFR-INTEG-007 requires exactly this shape: "all registration validation rules inside the same
 * transaction as the registration write, so that a concurrent request cannot bypass a capacity check."
 * The fact read and the INSERT are in one transaction, on one connection, at SERIALIZABLE.
 *
 * THE READ IS WHAT MAKES IT WORK. The transaction SELECTs `erns.event` before deciding, which creates a
 * read-write dependency on that row. A concurrent capacity reduction WRITES the same row, so PostgreSQL
 * cannot serialize both and aborts one with 40001. `withTransaction` retries the loser, which re-reads
 * and sees the committed capacity. This is what CON-04 depends on, and it is why the facts are gathered
 * here rather than by the caller.
 *
 * NO AUTHORIZATION. Nothing decides whether the caller may register. USER-ROLES.md and FR-REG-027,
 * FR-REG-032 and FR-REG-036 govern that, and they belong to a milestone that introduces route handlers
 * and a session. Inventing an authority check now would create a gate with no defined caller.
 *
 * MANUAL REGISTRATION (FR-REG-035 mechanism, AUD-12). A non-SELF source records who registered the
 * student and why: the reason is required, because AUD-12 requires one for manual registrations.
 * Whether the caller holds the officer or administrator role is still the session layer's decision;
 * this enforces only that a manual registration is never reasonless.
 */

import type { Pool, PoolClient } from "pg";

import {
  validateRegistrationAttempt,
  type ValidationFailure,
} from "../domain/registration-validation.js";
import { isSerializationFailure, withTransaction } from "../db/client.js";
import { newConfirmationReference } from "../db/identifiers.js";
import {
  appendAuditRow,
  insertRegistrationRow,
  readEventRegistrationFacts,
} from "../db/registration-persistence.js";
import type {
  RegisterOutcome,
  RegisterParticipantInput,
  RegistrationRefusal,
} from "../db/registration-store.types.js";

/**
 * Facts the caller already holds and that the store cannot derive.
 *
 * `authenticated`, `accountStatus` and `eligible` are inputs to the validator rather than storage
 * reads. `accountStatus` IS a column on app_user, but reading it here would mean the store deciding
 * what a session means, which L3 explicitly may not do and L2 may not do either. The caller in a later
 * milestone supplies it from the authenticated identity.
 *
 * `eligible` covers FR-REG-011 (target audience) and FR-REG-012 (the ineligibility mark). Neither is
 * derivable: target_audience is an unspecified JSONB document and the ineligibility mark has no column,
 * because StudentProfile does not exist while OQ-07 is open.
 */
export interface RegisterParticipantFacts {
  readonly authenticated: boolean;
  readonly accountStatus: "ACTIVE" | "SUSPENDED" | null;
  readonly eligible: boolean;
  /** Names of required registration fields absent from the submission. FR-REG-015. */
  readonly missingRequiredFields?: readonly string[];
  /** Injected so the deadline step is deterministic. Defaults to the database clock. */
  readonly now?: Date;
}

/** AUD-12. AUDIT-PLAN.md line 63. */
const ACTION_REGISTRATION_CREATED = "AUD-12";

function refusalFromValidator(failure: ValidationFailure): RegistrationRefusal {
  return {
    reason: failure.step as RegistrationRefusal["reason"],
    message: failure.message,
    requirements: failure.requirements,
  };
}

/**
 * Register one participant.
 *
 * Reuses the nine-step evaluator unchanged; there is no second copy of the order in this module.
 * FR-REG-005's order therefore has exactly one implementation, which is what makes RV-03 and TST-03
 * meaningful rather than incidental.
 */
export async function registerParticipant(
  pool: Pool,
  input: RegisterParticipantInput,
  facts: RegisterParticipantFacts,
): Promise<RegisterOutcome> {
  // AUD-12 requires a reason for a manual registration. Checked before any database work: a
  // reasonless manual attempt is refused the same way regardless of state, and nothing is written.
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (input.source !== "SELF" && reason === "") {
    return {
      ok: false,
      refusal: {
        reason: "MISSING_REASON",
        message: "A reason is required for a manual registration",
        requirements: "AUD-12",
      },
    };
  }

  // The clock is read from the database when the caller supplies none, so the deadline check and the
  // registered_at timestamp agree on which "now" they mean.
  let effectiveNow = facts.now;
  if (effectiveNow === undefined) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{ now: Date }>("SELECT now() AS now");
      effectiveNow = rows[0]?.now ?? new Date();
    } finally {
      client.release();
    }
  }
  const now = effectiveNow;

  try {
    return await withTransaction(
      pool,
      async (client: PoolClient): Promise<RegisterOutcome> => {
        // STEP A. Facts, inside the transaction. This SELECT is what arms CON-04.
        const eventFacts = await readEventRegistrationFacts(client, input.eventId, input.userId);

        if (!eventFacts.eventExists) {
          // No event means no validation step can be evaluated. Reported as EVENT_PUBLISHED rather than
          // inventing a tenth step: the registration is refused because the event is not available.
          return {
            ok: false,
            refusal: {
              reason: "EVENT_PUBLISHED",
              message: "Event not available for registration",
              requirements: "FR-REG-008",
            },
          };
        }

        // STEP B. The nine steps, in the documented order, with no rule of its own.
        const outcome = validateRegistrationAttempt({
          authenticated: facts.authenticated,
          accountStatus: facts.accountStatus,
          eventStatus: eventFacts.status as Parameters<
            typeof validateRegistrationAttempt
          >[0]["eventStatus"],
          registrationOpen: eventFacts.registrationOpen,
          registrationStart: eventFacts.registrationStart,
          registrationDeadline: eventFacts.registrationDeadline,
          now,
          eligible: facts.eligible,
          registeredCount: eventFacts.registeredCount,
          capacity: eventFacts.capacity,
          existingActiveRegistration: eventFacts.existingRegistrationStatus === "REGISTERED",
          existingRegistrationStatus: eventFacts.existingRegistrationStatus,
          missingRequiredFields: facts.missingRequiredFields ?? [],
        });

        if (!outcome.ok) {
          return { ok: false, refusal: refusalFromValidator(outcome.failure) };
        }

        // STEP C. Write. FR-REG-016 is the partial unique index's job, not this code's.
        const confirmationReference = newConfirmationReference();
        let registrationId: string;
        let registeredAt: Date;
        try {
          const inserted = await insertRegistrationRow(client, {
            userId: input.userId,
            eventId: input.eventId,
            source: input.source,
            confirmationReference,
            studentContext:
              input.studentContext === undefined || input.studentContext === null
                ? null
                : {
                    // FR-REG-017 names three snapshot fields. The key names are the store's own, not
                    // the caller's, so a caller using camelCase cannot silently produce a snapshot that
                    // reads as empty to a human reviewing the row.
                    programme: input.studentContext.programme,
                    year_level: input.studentContext.yearLevel,
                    organization_id: input.studentContext.organizationId ?? null,
                    ...input.studentContext,
                  },
          });
          registrationId = inserted.registrationId;
          registeredAt = inserted.registeredAt;
        } catch (error) {
          if (sqlstate(error) === "23505") {
            // FR-REG-016. The duplicate read passed but the storage layer refused, which means a
            // concurrent transaction inserted first. Reported as a refusal, not retried: a duplicate is
            // a fact about the data, and retrying cannot change it.
            return {
              ok: false,
              refusal: {
                reason: "STORAGE_DUPLICATE",
                message: "Already registered, with status shown: REGISTERED",
                requirements: "FR-REG-016",
              },
            };
          }
          throw error;
        }

        // STEP D. Audit, in the same transaction. AUD-12 requires no reason for a self
        // registration; a manual one carries the reason checked above.
        await appendAuditRow(client, {
          actorUserId: input.userId,
          action: ACTION_REGISTRATION_CREATED,
          entityType: "Registration",
          entityId: registrationId,
          newState: {
            status: "REGISTERED",
            event_id: input.eventId,
            user_id: input.userId,
            confirmation_reference: confirmationReference,
            registration_source: input.source,
          },
          reason: reason === "" ? null : reason,
        });

        return { ok: true, registrationId, confirmationReference, registeredAt };
      },
      { label: "register-participant" },
    );
  } catch (error) {
    // A 40001 that survived the bounded retry policy is CONTENTION, not a refusal.
    //
    // This distinction is load-bearing. Collapsing it into a business refusal would tell a student
    // "Event is full" when the truth is "the system was busy", which is both wrong and unactionable. It
    // is rethrown rather than converted, so the caller above L4 can distinguish the two.
    if (isSerializationFailure(error)) {
      throw error;
    }
    throw error;
  }
}

function sqlstate(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}