/**
 * L4: the standalone cancellation use case.
 *
 * Closes the part of FR-REG-024 through FR-REG-029 that does not depend on a session:
 *   FR-REG-024  a student may cancel their own registration until registration closes (OQ-12
 *               default: yes until close; after closure cancellation requires an officer)
 *   FR-REG-025  the cancellation records timestamp, reason, and cancelling user
 *   FR-REG-026  the cancelled record is retained, never deleted
 *   FR-REG-027  cancellation by anyone other than the registering student is an officer or
 *               administrator act — the role check belongs to the session layer; what this use case
 *               enforces is that a non-self cancellation is recorded as one
 *   FR-REG-028  officer/administrator cancellations require a reason (here: every cancellation does,
 *               because migration 0003 requires a non-blank reason on every CANCELLED row)
 *   FR-REG-029  the original registration timestamp and source are never modified — the UPDATE
 *               touches only the cancellation columns, so this holds by construction
 *
 * SYSTEM-ARCHITECTURE.md line 98 forbids L4 from holding a rule that belongs to L3. The rules here
 * are consistency rules about storage (row exists, row active, window open), evaluated against rows
 * read inside the write transaction — the same placement rationale as
 * PROJECT-OWNER-DECISIONS.md §11.4 records for the capacity invariant.
 *
 * SLOT RELEASE. Setting status to CANCELLED removes the row from the partial unique index decided
 * for OQ-10 (`UNIQUE (user_id, event_id) WHERE status = 'REGISTERED'`), so the student may register
 * again. That is the default reading; OQ-10 itself remains OPEN.
 *
 * NO AUTHORIZATION. Whether the caller holds the Event Officer or Administrator role is decided by
 * the session layer, mirroring `actorUserId` in capacity.ts: `requestedByUserId` records who, it
 * decides nothing.
 */

import type { Pool, PoolClient } from "pg";

import { RollbackSignal, withTransaction } from "../db/client.js";
import {
  appendAuditRow,
  cancelRegistrationRow,
  readRegistrationById,
} from "../db/registration-persistence.js";
import type {
  CancelRegistrationInput,
  CancelRegistrationOutcome,
  CancelRegistrationRefusal,
} from "../db/registration-store.types.js";

/** AUD-13, registration cancelled. AUDIT-PLAN.md line 64. */
const ACTION_REGISTRATION_CANCELLED = "AUD-13";

const FR_REG_024 = "FR-REG-024";
const FR_REG_025 = "FR-REG-025";
const FR_REG_026 = "FR-REG-026";

/**
 * Refuse the cancellation by rolling the transaction back.
 *
 * Every refusal goes through here, mirroring capacity.ts: `withTransaction` commits any resolved
 * body, so a plain `return { ok: false }` after a write would commit it. Nothing is written before
 * any refusal below, but the mechanism must not depend on that ordering surviving future edits.
 */
function refuse(refusal: CancelRegistrationRefusal): never {
  throw new RollbackSignal({ ok: false, refusal });
}

/** A registration id that is not a UUID can never name a row. Reported as not found, not as a
 * database error: 22P02 carrying a cast detail is an internal shape leaking outward. */
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export interface CancelRegistrationFacts {
  /** Injected so the closure check is deterministic. Defaults to the database clock. */
  readonly now?: Date;
}

/**
 * Cancel one registration.
 *
 * Order of operations inside the transaction:
 *   1. read the registration with its event window
 *   2. refuse when the row is missing or already cancelled
 *   3. refuse when the reason is blank (the store cannot hold a reasonless cancellation)
 *   4. refuse a self-cancellation after registration closed
 *   5. write the cancellation; refuse when the row changed state underneath the read
 *   6. append the AUD-13 audit row
 */
export async function cancelRegistration(
  pool: Pool,
  input: CancelRegistrationInput,
  facts: CancelRegistrationFacts = {},
): Promise<CancelRegistrationOutcome> {
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

  return withTransaction(
    pool,
    async (client: PoolClient): Promise<CancelRegistrationOutcome> => {
      // STEP 1. Read the row with its window.
      const row = isUuid(input.registrationId)
        ? await readRegistrationById(client, input.registrationId)
        : null;
      if (row === null) {
        return refuse({
          reason: "REGISTRATION_NOT_FOUND",
          message: "Registration not found",
          requirements: FR_REG_025,
        });
      }

      // STEP 2. Already cancelled. The existing status is reported rather than only a rejection,
      // mirroring FR-REG-023's philosophy for duplicate attempts.
      if (row.status !== "REGISTERED") {
        return refuse({
          reason: "ALREADY_CANCELLED",
          message: `Registration is already ${row.status}`,
          requirements: FR_REG_026,
        });
      }

      // STEP 3. The store requires a non-blank reason on every CANCELLED row (migration 0003), so a
      // reasonless cancellation is refused here rather than as a constraint violation.
      const reason = typeof input.reason === "string" ? input.reason.trim() : "";
      if (reason === "") {
        return refuse({
          reason: "MISSING_REASON",
          message: "A reason is required to cancel a registration",
          requirements: FR_REG_025,
        });
      }

      // STEP 4. FR-REG-024. A self-cancellation is allowed until registration closes: the flag is on
      // and the deadline, when one exists, has not passed. A non-self cancellation is an officer or
      // administrator act, which the requirement permits after closure; the role itself is verified
      // by the session layer, not here.
      const selfCancellation = input.requestedByUserId === row.userId;
      if (selfCancellation) {
        const open =
          row.registrationOpen &&
          (row.registrationDeadline === null || now < row.registrationDeadline);
        if (!open) {
          return refuse({
            reason: "REGISTRATION_CLOSED",
            message: "Registration has closed; cancellation now requires an officer",
            requirements: FR_REG_024,
          });
        }
      }

      // STEP 5. Write. The `AND status = 'REGISTERED'` predicate re-checks the row: a concurrent
      // cancellation that committed between step 1 and this statement affects zero rows.
      const cancellation = await cancelRegistrationRow(client, {
        registrationId: row.registrationId,
        actorUserId: input.requestedByUserId,
        reason,
      });
      if (!cancellation.cancelled || cancellation.cancelledAt === null) {
        return refuse({
          reason: "ALREADY_CANCELLED",
          message: "Registration changed state during the cancellation",
          requirements: FR_REG_026,
        });
      }

      // STEP 6. AUD-13, in the same transaction: FAIL-05 forbids a state change whose audit entry
      // fails, and the transaction is what makes that atomic.
      // TODO(#6): emit the IMPORTANT notice to the Student here once the
      // notification centre lands. Schemas 0001–0006 hold no
      // Notification/Acknowledgement table, so cancellation today records
      // reason + audit only; the Student sees the reason via
      // listUserRegistrations.
      await appendAuditRow(client, {
        actorUserId: input.requestedByUserId,
        action: ACTION_REGISTRATION_CANCELLED,
        entityType: "Registration",
        entityId: row.registrationId,
        previousState: { status: "REGISTERED" },
        newState: {
          status: "CANCELLED",
          cancellation_reason: reason,
          cancelled_by: input.requestedByUserId,
          cancelled_at: cancellation.cancelledAt.toISOString(),
        },
        reason,
      });

      return {
        ok: true,
        registrationId: row.registrationId,
        eventId: row.eventId,
        userId: row.userId,
        cancelledAt: cancellation.cancelledAt,
        cancelledBy: input.requestedByUserId,
        selfCancellation,
      };
    },
    { label: "cancel-registration" },
  );
}
