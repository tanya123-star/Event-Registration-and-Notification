/**
 * L4: the Administrator CSV student import use case (MVP story 33).
 *
 * MVP gap 7 (validated rows, per-row result, full audit), FR-USR-004,
 * USER-ROLES.md line 328 (Student granted by default), AUD-01 per
 * provisioned account.
 *
 * Per-row application: a refused row never blocks a valid row, and the
 * summary makes partial application explicit — never silent. Each valid row
 * is provisioned (account, profile, STUDENT role, AUD-01 audit) in its own
 * transaction, so one row's failure rolls back only that row.
 *
 * NO AUTHORIZATION. Whether the caller holds the Administrator role is
 * decided by the handler core; `adminUserId` is recorded as the actor on
 * every audit row, it decides nothing.
 */

import type { Pool, PoolClient } from "pg";

import { RollbackSignal, withTransaction } from "../db/client.js";
import { appendAuditRow } from "../db/registration-persistence.js";
import {
  insertStudentAccountRow,
  insertStudentProfileRow,
  insertStudentRoleRow,
  studentEmailExists,
} from "../db/student-import-persistence.js";
import {
  parseStudentImportCsv,
  validateStudentImportRow,
} from "../domain/student-import.js";
import type {
  ImportStudentsInput,
  ImportStudentsOutcome,
  StudentImportRowResult,
} from "../db/student-import-store.types.js";

/** AUD-01, account provisioned. AUDIT-PLAN.md line 52. */
const ACTION_ACCOUNT_PROVISIONED = "AUD-01";

/**
 * Import one CSV file.
 *
 * The header is judged before anything is written: an invalid header
 * refuses the whole file with nothing applied. Every subsequent row gets
 * its own result; valid rows are provisioned even when siblings fail.
 */
export async function importStudents(
  pool: Pool,
  input: ImportStudentsInput,
): Promise<ImportStudentsOutcome> {
  const parsed = parseStudentImportCsv(input.csvText);
  if (!parsed.ok) {
    return {
      ok: false,
      refusal: {
        reason: "INVALID_HEADER",
        message: parsed.detail,
        requirements: "MVP story 33",
      },
    };
  }

  const seen = new Set<string>();
  const rows: StudentImportRowResult[] = [];
  let importedCount = 0;

  for (const row of parsed.rows) {
    if (!("fields" in row)) {
      rows.push({ rowNumber: row.rowNumber, ok: false, reason: "MALFORMED_ROW", message: row.error.detail });
      continue;
    }
    const validated = validateStudentImportRow(row.rowNumber, row.fields);
    if (!validated.ok) {
      rows.push({
        rowNumber: row.rowNumber,
        ok: false,
        reason: validated.reason,
        message: validated.detail,
      });
      continue;
    }
    const normalized = validated.value.email.toLowerCase();
    if (seen.has(normalized)) {
      rows.push({
        rowNumber: row.rowNumber,
        ok: false,
        reason: "DUPLICATE_ROW",
        message: `Row ${row.rowNumber} repeats an email from this file`,
      });
      continue;
    }
    seen.add(normalized);

    const provisioned = await provisionOneRow(pool, input.adminUserId, validated.value);
    if (provisioned.duplicate) {
      rows.push({
        rowNumber: row.rowNumber,
        ok: false,
        reason: "DUPLICATE_ACCOUNT",
        message: `Row ${row.rowNumber} matches an existing account`,
      });
      continue;
    }
    importedCount += 1;
    rows.push({ rowNumber: row.rowNumber, ok: true });
  }

  return { ok: true, summary: { importedCount, rows } };
}

interface ProvisionedValue {
  readonly email: string;
  readonly displayName: string;
  readonly programme: string;
  readonly yearLevel: number;
  readonly organizationId: string | null;
}

/**
 * Provision one validated row in its own transaction: account, profile,
 * STUDENT role and AUD-01 audit together, or nothing for this row.
 *
 * A UNIQUE collision on the account (or profile) means a concurrent import
 * provisioned the same address first: the row is a duplicate, never a
 * double-provision.
 */
async function provisionOneRow(
  pool: Pool,
  adminUserId: string,
  value: ProvisionedValue,
): Promise<{ duplicate: boolean }> {
  return withTransaction(
    pool,
    async (client: PoolClient): Promise<{ duplicate: boolean }> => {
      if (await studentEmailExists(client, value.email)) {
        return { duplicate: true };
      }
      const account = await insertStudentAccountRow(client, {
        email: value.email,
        displayName: value.displayName,
      });
      if (!account.inserted || account.userId === null) {
        return { duplicate: true };
      }
      const profile = await insertStudentProfileRow(client, {
        userId: account.userId,
        programme: value.programme,
        yearLevel: value.yearLevel,
        organizationId: value.organizationId,
      });
      if (!profile.inserted) {
        // A concurrent import provisioned the same account first: roll this
        // row back and report a duplicate, never a double-provision.
        throw new RollbackSignal({ duplicate: true });
      }
      await insertStudentRoleRow(client, account.userId);
      await appendAuditRow(client, {
        actorUserId: adminUserId,
        action: ACTION_ACCOUNT_PROVISIONED,
        entityType: "User",
        entityId: account.userId,
        previousState: null,
        newState: {
          role: "STUDENT",
          programme: value.programme,
          year_level: value.yearLevel,
        },
        reason: "CSV student import",
      });
      return { duplicate: false };
    },
    { label: "import-student-row" },
  );
}
