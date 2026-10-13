/**
 * Persistence primitives for StudentProfile.
 *
 * L2. Constructs queries, reads rows, writes rows. Decides nothing: audience
 * membership is judged by the pure evaluator in `src/domain/audience.ts`, and
 * the decision to refuse a Registration lives in `src/l4/`.
 *
 * Provisioning writes run as erns_app (migration 0006 grants SELECT, INSERT,
 * UPDATE, DELETE on this table only). Reads run on the caller's connection —
 * inside the registration transaction when eligibility is evaluated, so the
 * profile read and the Registration write share one SERIALIZABLE transaction
 * per NFR-INTEG-007.
 */

import type { PoolClient } from "pg";

/** A stored StudentProfile row, in application vocabulary. */
export interface StudentProfileRow {
  readonly userId: string;
  readonly programme: string;
  readonly yearLevel: number;
  readonly organizationId: string | null;
  readonly isEligible: boolean;
}

/**
 * Read one StudentProfile.
 *
 * Null when the Student has no profile. A missing profile is not an error
 * here; the L4 caller decides what it means (transitional fallback while
 * provisioning completes — see `src/l4/register-participant.ts`).
 */
export async function readStudentProfile(
  client: PoolClient,
  userId: string,
): Promise<StudentProfileRow | null> {
  const { rows } = await client.query<{
    user_id: string;
    programme: string;
    year_level: number;
    organization_id: string | null;
    is_eligible: boolean;
  }>(
    `SELECT user_id, programme, year_level, organization_id, is_eligible
       FROM erns.student_profile
      WHERE user_id = $1`,
    [userId],
  );
  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  return {
    userId: row.user_id,
    programme: row.programme,
    yearLevel: row.year_level,
    organizationId: row.organization_id,
    isEligible: row.is_eligible,
  };
}

export interface StudentProfileWriteInput {
  readonly userId: string;
  readonly programme: string;
  readonly yearLevel: number;
  readonly organizationId: string | null;
  readonly isEligible: boolean;
}

/**
 * Provision or maintain one StudentProfile.
 *
 * Upsert by user_id: provisioning creates the row, eligibility maintenance
 * rewrites it. The one-profile-per-User invariant is the primary key, so a
 * second profile for the same Student is unwritable at the store.
 */
export async function upsertStudentProfileRow(
  client: PoolClient,
  input: StudentProfileWriteInput,
): Promise<void> {
  await client.query(
    `INSERT INTO erns.student_profile (user_id, programme, year_level, organization_id, is_eligible)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE
        SET programme = EXCLUDED.programme,
            year_level = EXCLUDED.year_level,
            organization_id = EXCLUDED.organization_id,
            is_eligible = EXCLUDED.is_eligible`,
    [input.userId, input.programme, input.yearLevel, input.organizationId, input.isEligible],
  );
}
