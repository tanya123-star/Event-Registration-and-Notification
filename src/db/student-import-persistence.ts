/**
 * Persistence primitives for the Administrator CSV student import.
 *
 * L2. Constructs queries, reads rows, writes rows. Decides nothing: row
 * validity, duplicates and audit shape are judged in `src/l4/`.
 *
 * Provisioning writes run as erns_app: 0001 grants full application-data
 * access on app_user and student_profile, and 0009 adds INSERT on user_role
 * for exactly this path.
 */

import type { PoolClient } from "pg";

import { UNIQUE_VIOLATION } from "./client.js";

/** Insert one account. Returns the new id, or null when the email is taken. */
export async function insertStudentAccountRow(
  client: PoolClient,
  input: { email: string; displayName: string },
): Promise<{ inserted: boolean; userId: string | null }> {
  try {
    const { rows } = await client.query<{ user_id: string }>(
      `INSERT INTO erns.app_user (email, display_name)
       VALUES ($1, $2)
       RETURNING user_id`,
      [input.email, input.displayName],
    );
    const row = rows[0];
    if (row === undefined) {
      throw new Error("insertStudentAccountRow returned no row");
    }
    return { inserted: true, userId: row.user_id };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if ((error as { code?: unknown }).code === UNIQUE_VIOLATION) {
        return { inserted: false, userId: null };
      }
    }
    throw error;
  }
}

export interface StudentProfileProvisionInput {
  readonly userId: string;
  readonly programme: string;
  readonly yearLevel: number;
  readonly organizationId: string | null;
}

/**
 * Insert one StudentProfile. Plain INSERT, not the upsert: a provisioned
 * account is new, so a profile for it cannot exist; an existing row here
 * means a concurrent import provisioned the same account, which the caller
 * treats as a duplicate rather than silently rewriting.
 */
export async function insertStudentProfileRow(
  client: PoolClient,
  input: StudentProfileProvisionInput,
): Promise<{ inserted: boolean }> {
  try {
    await client.query(
      `INSERT INTO erns.student_profile (user_id, programme, year_level, organization_id, is_eligible)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [input.userId, input.programme, input.yearLevel, input.organizationId],
    );
    return { inserted: true };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if ((error as { code?: unknown }).code === UNIQUE_VIOLATION) {
        return { inserted: false };
      }
    }
    throw error;
  }
}

/** Grant the STUDENT role to one provisioned account (USER-ROLES.md line 328). */
export async function insertStudentRoleRow(
  client: PoolClient,
  userId: string,
): Promise<void> {
  await client.query(`INSERT INTO erns.user_role (user_id, role) VALUES ($1, 'STUDENT')`, [userId]);
}

/** Case-insensitive email lookup for the duplicate pre-read. */
export async function studentEmailExists(client: PoolClient, email: string): Promise<boolean> {
  const { rows } = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM erns.app_user WHERE lower(email) = lower($1)) AS exists`,
    [email],
  );
  return rows[0]?.exists ?? false;
}
