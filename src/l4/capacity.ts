/**
 * L4: the capacity-reduction use case.
 *
 * Closes FR-REG-037 — "The system shall refuse to reduce capacity below the count of existing
 * registrations" (FUNCTIONAL-REQUIREMENTS.md line 200) — and with it RV-11
 * (TESTING-STRATEGY.md line 83, expected outcome "Rejected") and CON-04
 * (TESTING-STRATEGY.md line 121, "Registered count never exceeds capacity").
 *
 * SYSTEM-ARCHITECTURE.md line 98 forbids L4 from holding a rule that belongs to L3. The capacity
 * invariant is not in L3 because it cannot be: it compares a stored value against a count of rows, and
 * the domain layer may not perform I/O. It is a consistency rule about storage, so it belongs here,
 * where facts and writes share one transaction.
 *
 * THE BEHAVIOUR, AS APPROVED
 * Option A. A reduction below the remaining registered count is REJECTED. Capacity is never clamped
 * automatically, and a refusal leaves both the capacity and every registration untouched.
 *
 * DATA-MODEL.md lines 212-213 permit the one case that a bare "below the count" rule would forbid:
 *   "capacity MUST NOT be reduced below the count of existing registrations WITHOUT SIMULTANEOUS
 *    PARTICIPANT REMOVAL"
 * That carve-out is why `removeRegistrationIds` exists. Removals and the capacity write are ONE
 * transaction. If any removal is invalid, or the remaining count still exceeds the requested capacity,
 * the whole transaction is rolled back and neither the cancellations nor the capacity change survives.
 *
 * WHY THIS PREVENTS CON-04
 * Both this operation and registration SELECT `erns.event` before writing. When they overlap, PostgreSQL
 * has a read-write dependency and aborts one with 40001 under SERIALIZABLE. The aborted one is retried by
 * `withTransaction`, re-reads the committed state, and then decides correctly: a registration retried
 * after a reduction refuses on FR-REG-013, and a reduction retried after registrations refuses on
 * FR-REG-037. Neither can commit a state where the count exceeds capacity.
 *
 * NO AUTHORIZATION. Who may reduce capacity is FR-REG-032's territory and belongs to the milestone that
 * adds route handlers and a session. `actorUserId` records who, per FR-EVT-016; it decides nothing.
 */

import type { Pool, PoolClient } from "pg";

import { RollbackSignal, withTransaction } from "../db/client.js";
import {
  appendAuditRow,
  cancelRegistrationRow,
  countActiveRegistrations,
  readEventCapacity,
  readRegistrationsForRemoval,
  updateEventCapacityRow,
} from "../db/registration-persistence.js";
import type {
  CapacityReductionInput,
  CapacityReductionOutcome,
  CapacityReductionRefusal,
  RemovalRejection,
  RemovalRejectionReason,
} from "../db/registration-store.types.js";

/** AUD-13, registration cancelled. AUDIT-PLAN.md line 64. */
const ACTION_REGISTRATION_CANCELLED = "AUD-13";
/** AUD-05, event edited. AUDIT-PLAN.md line 56. */
const ACTION_EVENT_EDITED = "AUD-05";

const FR_REG_037 = "FR-REG-037";
const FR_EVT_009 = "FR-EVT-009";
const FR_REG_014 = "FR-REG-014";

/**
 * Refuse the reduction by rolling the transaction back.
 *
 * EVERY refusal in this module goes through here rather than returning a value directly. This is the
 * whole reason the function exists: `withTransaction` commits any resolved body, so a plain `return
 * { ok: false }` would COMMIT the cancellations applied earlier in the same transaction. That was a real
 * defect, caught by test/capacity.test.ts asserting committed state after a refusal. Two participants
 * were being removed from a reduction that had been refused.
 *
 * `RollbackSignal` rolls back and resolves to the refusal, so the caller still receives a structured
 * `CapacityReductionOutcome` and never sees an error for what is a business decision.
 */
function refuse(refusal: CapacityReductionRefusal | RemovalRejection): never {
  throw new RollbackSignal({ ok: false, refusal });
}

/**
 * Declare the result type explicitly.
 *
 * It is not inferred from `refuse(...)` because that function only ever throws, so TypeScript infers
 * `never` for its return and every call site becomes a type error. The declaration is also what documents
 * the contract: a removal rejection is one of the two refusal shapes.
 */
function removalRejection(
  registrationId: string,
  reason: RemovalRejectionReason,
  message: string,
  requirements: string,
): { ok: false; refusal: RemovalRejection } {
  // `refuse` always throws, so this function never returns. The `throw` here is therefore unreachable and
  // is written explicitly to satisfy the declared return type: with it, the compiler enforces that a
  // future edit cannot make this path resolve, which would silently reintroduce the commit-on-refusal
  // defect documented on `refuse`.
  throw new RollbackSignal({
    ok: false,
    refusal: { kind: "REMOVAL_REJECTED", registrationId, reason, message, requirements },
  });
}

/**
 * Reduce an event's capacity, optionally cancelling participants in the same transaction.
 *
 * The order of operations inside the transaction is load-bearing and matches the approved sequence:
 *
 *   1. read the event and its capacity
 *   2. validate the requested capacity              (FR-EVT-009)
 *   3. validate every requested removal             (belongs-to-event, active, no duplicates)
 *   4. apply removals and their audit entries
 *   5. recount, in this transaction
 *   6. refuse if the count still exceeds the request (FR-REG-037)
 *   7. update capacity and FR-EVT-016 metadata      (only now)
 *
 * Step 7 happens last, so a refusal at step 6 has written nothing. The transaction is nonetheless the
 * guarantee: if any statement fails, PostgreSQL discards every earlier statement in it. The ordering
 * makes the intent legible; the transaction makes it correct.
 */
export async function reduceEventCapacity(
  pool: Pool,
  input: CapacityReductionInput,
): Promise<CapacityReductionOutcome> {
  const requestedRemovalIds = input.removeRegistrationIds ?? [];

  // A duplicate id in the request is rejected before any database work. Accepting it would cancel the
  // same registration twice and produce two AUD-13 entries for one cancellation.
  const seen = new Set<string>();
  for (const id of requestedRemovalIds) {
    if (seen.has(id)) {
      // This check sits OUTSIDE the transaction, so there is no transaction to roll back and
      // `RollbackSignal` would escape to the caller as an error. A plain refusal is correct here, and
      // nothing has been written.
      //
      // (An earlier version called `removalRejection` from this position. Inside the transaction that
      // was the right mechanism; outside it, RollbackSignal had nothing to catch, and a business refusal
      // surfaced as "Transaction rolled back by the body via RollbackSignal".)
      return {
        ok: false,
        refusal: {
          kind: "REMOVAL_REJECTED",
          registrationId: id,
          reason: "DUPLICATE_REMOVAL_REQUEST",
          message: "Registration listed more than once for removal",
          requirements: FR_REG_037,
        },
      };
    }
    seen.add(id);
  }

  return withTransaction(
    pool,
    async (client: PoolClient): Promise<CapacityReductionOutcome> => {
      // STEP 1. Read the event. The SELECT arms the CON-04 dependency.
      const event = await readEventCapacity(client, input.eventId);
      if (event === null) {
        return removalRejection(
          input.eventId,
          "REGISTRATION_NOT_FOUND",
          "Event not found",
          FR_EVT_009,
        );
      }

      // STEP 2. FR-EVT-009. A capacity that is not a positive integer is refused here as well as by
      // `event_capacity_positive_check`, because a clear refusal is better than a constraint violation
      // carrying a constraint name. The CHECK remains as the storage-layer backstop.
      if (!Number.isInteger(input.requestedCapacity) || input.requestedCapacity < 1) {
        return removalRejection(
          input.eventId,
          "REGISTRATION_NOT_FOUND",
          "Capacity must be a positive integer",
          FR_EVT_009,
        );
      }

      const currentCount = await countActiveRegistrations(client, input.eventId);

      // STEP 3. Validate every removal BEFORE applying any of them.
      const existing = await readRegistrationsForRemoval(client, requestedRemovalIds);
      const byId = new Map(existing.map((row) => [row.registrationId, row]));

      for (const id of requestedRemovalIds) {
        const row = byId.get(id);
        if (row === undefined) {
          return removalRejection(
            id,
            "REGISTRATION_NOT_FOUND",
            "Registration not found",
            FR_REG_014,
          );
        }
        if (row.eventId !== input.eventId) {
          return removalRejection(
            id,
            "WRONG_EVENT",
            "Registration belongs to a different event",
            FR_REG_014,
          );
        }
        if (row.status !== "REGISTERED") {
          return removalRejection(
            id,
            "NOT_ACTIVE",
            "Registration is not currently registered",
            FR_REG_014,
          );
        }
      }

      // STEP 4. Apply removals with their audit entries.
      //
      // AUD-13 requires a reason for a non-student cancellation. The reason is mandatory here because a
      // removal in a capacity reduction is never a student's own cancellation — it is an officer or
      // administrator action, and cancellation by anyone other than the registering student requires a
      // reason under FR-REG-028.
      const reason = input.reason?.trim() ?? "";
      if (requestedRemovalIds.length > 0 && reason === "") {
        return removalRejection(
          requestedRemovalIds[0] ?? input.eventId,
          "NOT_ACTIVE",
          "A reason is required to remove a participant during a capacity reduction",
          "FR-REG-028",
        );
      }

      const removedRegistrationIds: string[] = [];
      for (const id of requestedRemovalIds) {
        const row = byId.get(id);
        // `row` was validated in step 3, so it is defined. Re-checked because `byId.get` returns
        // `T | undefined` and this function must not trust its own earlier proof across a loop.
        if (row === undefined) {
          return removalRejection(id, "REGISTRATION_NOT_FOUND", "Registration not found", FR_REG_014);
        }

        const cancellation = await cancelRegistrationRow(client, {
          registrationId: id,
          // Migration 0003 requires cancelled_by on a CANCELLED row. When no actor is supplied the
          // registering student is the only actor the row can name, so the caller must supply one for a
          // genuine officer action. That is a limitation of the schema, not an inference about identity.
          actorUserId: input.actorUserId ?? row.userId,
          reason,
        });

        if (!cancellation.cancelled) {
          // The row changed state between the read in step 3 and this update. Refuse rather than
          // proceed: the count this operation computed is no longer trustworthy.
          return removalRejection(
            id,
            "NOT_ACTIVE",
            "Registration changed state during the reduction",
            FR_REG_014,
          );
        }

        removedRegistrationIds.push(id);

        await appendAuditRow(client, {
          actorUserId: input.actorUserId ?? row.userId,
          action: ACTION_REGISTRATION_CANCELLED,
          entityType: "Registration",
          entityId: id,
          previousState: { status: "REGISTERED" },
          newState: { status: "CANCELLED", cancellation_reason: reason },
          reason,
        });
      }

      // STEP 5. Recount from storage, in this transaction. The pre-removal count is not reused: the
      // invariant is about what is registered NOW.
      const remainingRegisteredCount = await countActiveRegistrations(client, input.eventId);

      // STEP 6. FR-REG-037. The refusal carries the arithmetic so a caller can act on it.
      if (remainingRegisteredCount > input.requestedCapacity) {
        const exceedsBy = remainingRegisteredCount - input.requestedCapacity;
        const refusal: CapacityReductionRefusal = {
          kind: "CAPACITY_REDUCTION_REFUSED",
          eventId: input.eventId,
          requestedCapacity: input.requestedCapacity,
          currentRegisteredCount: currentCount,
          remainingRegisteredCount,
          exceedsBy,
          message:
            `Capacity cannot be reduced to ${input.requestedCapacity}: ${remainingRegisteredCount} ` +
            `registrations remain, which exceeds it by ${exceedsBy}.`,
          requirements: FR_REG_037,
        };
        // `refuse` THROWS RollbackSignal, so every cancellation applied in step 4 is discarded. That is
        // the all-or-nothing behaviour the project owner required, and it is now explicit rather than
        // dependent on withTransaction committing only successful bodies — which it does not do.
        return refuse(refusal);
      }

      // STEP 7. Only now is capacity written.
      //
      // `actorUserId` is normalised once here rather than at each use site. It is optional in the input
      // type because FR-EVT-016 permits an unknown modifier — a seed or a migration has no human actor —
      // and the column is nullable for that reason. Normalising `undefined` to `null` in one place keeps
      // both the write and the audit row consistent.
      const actorUserId = input.actorUserId ?? null;
      const previousCapacity = event.capacity;
      const { updatedAt } = await updateEventCapacityRow(client, {
        eventId: input.eventId,
        capacity: input.requestedCapacity,
        actorUserId,
      });

      // AUD-05 for the event modification itself. FR-NOT-031 would additionally require a HIGH
      // notification to affected participants; that is deferred and cannot be satisfied here, because
      // the Notification tables do not exist while OQ-56 is open.
      await appendAuditRow(client, {
        actorUserId,
        action: ACTION_EVENT_EDITED,
        entityType: "Event",
        entityId: input.eventId,
        previousState: { capacity: previousCapacity },
        newState: { capacity: input.requestedCapacity },
        reason: reason === "" ? null : reason,
      });

      return {
        ok: true,
        eventId: input.eventId,
        previousCapacity: previousCapacity ?? 0,
        newCapacity: input.requestedCapacity,
        removedRegistrationIds,
        remainingRegisteredCount,
        updatedBy: actorUserId,
        updatedAt,
      };
    },
    { label: "reduce-event-capacity" },
  );
}