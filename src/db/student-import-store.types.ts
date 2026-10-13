/**
 * Types for the L4 Administrator CSV student import.
 *
 * Split from the store so callers depend on shapes without importing queries,
 * mirroring `registration-store.types.ts`.
 *
 * REQUIREMENTS
 *   MVP story 33  provision Student accounts by CSV import, no self-service
 *   MVP gap 7     validated rows, per-row result, full audit of the import
 *   FR-USR-004    Administrator provisions user accounts
 *   USER-ROLES.md line 328: Student granted by default on provisioning
 *   AUD-01        account provisioned         AUDIT-PLAN.md line 52
 *
 * NO AUTHORIZATION MODEL. Nothing here decides who may import. The
 * Administrator-only gate belongs to the handler core; L4 records the
 * administrator identity on every audit row it writes.
 */

export interface ImportStudentsInput {
  /** The raw CSV text, header included. */
  readonly csvText: string;
  /**
   * The Administrator performing the import. Recorded as the actor on every
   * AUD-01 row. Records who, decides nothing.
   */
  readonly adminUserId: string;
}

/** Why one CSV row was not provisioned. */
export type StudentImportRowReason =
  /** The row does not have the locked field count. */
  | "MALFORMED_ROW"
  /** The email is not shaped like an address. */
  | "INVALID_EMAIL"
  /** Display name or programme is blank. */
  | "BLANK_FIELD"
  /** Year level is not a positive integer. */
  | "INVALID_YEAR_LEVEL"
  /** The normalized email already appeared in this file. */
  | "DUPLICATE_ROW"
  /** The normalized email already names an account. */
  | "DUPLICATE_ACCOUNT";

export type StudentImportRowResult =
  | { readonly rowNumber: number; readonly ok: true }
  | {
      readonly rowNumber: number;
      readonly ok: false;
      readonly reason: StudentImportRowReason;
      readonly message: string;
    };

/**
 * The per-row result contract. Carries row numbers, never addresses or
 * names: the Administrator locates a refused row by its line in the source
 * file (RA 10173 minimum-necessary, ADR-0001).
 */
export interface StudentImportSummary {
  readonly importedCount: number;
  readonly rows: readonly StudentImportRowResult[];
}

export type ImportStudentsOutcome =
  | { readonly ok: true; readonly summary: StudentImportSummary }
  | {
      readonly ok: false;
      readonly refusal: {
        readonly reason: "INVALID_HEADER";
        readonly message: string;
        readonly requirements: string;
      };
    };
