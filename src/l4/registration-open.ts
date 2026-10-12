/**
 * L4: close or reopen registration for an event.
 *
 *   FR-REG-032  owning officer or administrator may close registration before the event starts
 *   FR-REG-033  either may reopen before the event starts, given a recorded reason
 *   FR-REG-034  reopening after the event start is refused (and so is closing: both directions
 *               require "before the event starts")
 *   RV-08       reopening without a reason is rejected
 *   RV-09       reopening after the event start is rejected
 *   AUD-05      event edited (reason required only when supplied — reopen always supplies one)
 *   FR-REG-039  every close/reopen recorded with actor, timestamp, and reason where applicable
 *   FR-EVT-016  the flag write carries updated_by/updated_at
 *
 * The "started" judgement comes from the database (`readEventWindow`), not from application date
 * arithmetic. The write and the AUD-05 row share one transaction (FAIL-05).
 *
 * NO AUTHORIZATION. Whether the caller owns the event or holds the officer/administrator role is
 * decided by the session layer. `actorUserId` records who, it decides nothing.
 */

import type { Pool, PoolClient } from "pg";

import { RollbackSignal, withTransaction } from "../db/client.js";
import {
  appendAuditRow,
  readEventWindow,
  updateEventRegistrationOpenRow,
} from "../db/registration-persistence.js";
import type {
  SetRegistrationOpenInput,
  SetRegistrationOpenOutcome,
  RegistrationOpenRefusal,
} from "../db/registration-store.types.js";

/** AUD-05, event edited. AUDIT-PLAN.md line 56. */
const ACTION_EVENT_EDITED = "AUD-05";

/**
 * Refuse by rolling back, mirroring capacity.ts: `withTransaction` commits any resolved body, so
 * every refusal path throws even though nothing is written before most of them.
 */
function refuse(refusal: RegistrationOpenRefusal): never {
  throw new RollbackSignal({ ok: false, refusal });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Set the registration flag.
 *
 * Order inside the transaction: read the window; refuse unknown events, started events, and
 * reasonless reopens; write the flag with metadata; append AUD-05.
 */
export async function setRegistrationOpen(
  pool: Pool,
  input: SetRegistrationOpenInput,
): Promise<SetRegistrationOpenOutcome> {
  return withTransaction(
    pool,
    async (client: PoolClient): Promise<SetRegistrationOpenOutcome> => {
      const window = isUuid(input.eventId) ? await readEventWindow(client, input.eventId) : null;
      if (window === null) {
        return refuse({
          reason: "EVENT_NOT_FOUND",
          message: "Event not found",
          requirements: "FR-REG-032",
        });
      }

      if (!window.notStarted) {
        return refuse({
          reason: "EVENT_STARTED",
          message: input.open
            ? "Registration cannot be reopened after the event start time"
            : "Registration cannot be closed after the event start time",
          requirements: input.open ? "FR-REG-033, FR-REG-034" : "FR-REG-032",
        });
      }

      const reason = typeof input.reason === "string" ? input.reason.trim() : "";
      if (input.open && reason === "") {
        return refuse({
          reason: "MISSING_REASON",
          message: "A recorded reason is required to reopen registration",
          requirements: "FR-REG-033",
        });
      }

      const actorUserId = input.actorUserId ?? null;
      const { updatedAt } = await updateEventRegistrationOpenRow(client, {
        eventId: input.eventId,
        open: input.open,
        actorUserId,
      });

      await appendAuditRow(client, {
        actorUserId,
        action: ACTION_EVENT_EDITED,
        entityType: "Event",
        entityId: input.eventId,
        previousState: { registration_open: window.registrationOpen },
        newState: { registration_open: input.open },
        reason: reason === "" ? null : reason,
      });

      return {
        ok: true,
        eventId: input.eventId,
        registrationOpen: input.open,
        updatedBy: actorUserId,
        updatedAt,
      };
    },
    { label: "set-registration-open" },
  );
}
