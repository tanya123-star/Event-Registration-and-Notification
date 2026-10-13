/**
 * CSV student-import row parsing and validation — pure.
 *
 * Source: MVP story 33, MVP gap 7; DATA-MODEL.md section 2.4;
 * migration 0006 (programme non-blank, year_level >= 1, organization
 * optional, is_eligible default TRUE).
 *
 * Shape only: duplicates against storage, role grants and audit live in the
 * L4 use case; who may import lives in the handler core.
 *
 * No student-number field: OQ-07 is open and no column exists, so a number
 * is neither accepted nor required.
 *
 * This module is L3 and pure: no I/O, no session, no external imports (enforced by
 * the `no-restricted-imports` rule scoped to `src/domain/**` in eslint.config.mjs).
 */

/** The locked CSV columns, in header order. */
export const STUDENT_IMPORT_COLUMNS = [
  "email",
  "display_name",
  "programme",
  "year_level",
  "organization_id",
] as const;

export type StudentImportColumn = (typeof STUDENT_IMPORT_COLUMNS)[number];

export interface ParsedImportRow {
  /** 1-based line number in the source file, header included. */
  readonly rowNumber: number;
  readonly fields: Record<StudentImportColumn, string>;
}

export interface MalformedImportRow {
  readonly rowNumber: number;
  readonly error: { readonly reason: "MALFORMED_ROW"; readonly detail: string };
}

export type ParseImportResult =
  | { readonly ok: true; readonly rows: readonly (ParsedImportRow | MalformedImportRow)[] }
  | { readonly ok: false; readonly reason: "INVALID_HEADER"; readonly detail: string };

const EXPECTED_HEADER = STUDENT_IMPORT_COLUMNS.join(",");

function splitLine(line: string): string[] | null {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      // Quotes are only meaningful at a field boundary; anywhere else the
      // line is not a shape this parser understands.
      if (current !== "") {
        return null;
      }
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (inQuotes) {
    return null;
  }
  fields.push(current);
  return fields;
}

/**
 * Parse one CSV file. Minimal quoting: a field may be wrapped in double
 * quotes to carry a comma; an unterminated quote is malformed rather than
 * guessed at. Line endings CRLF and LF both accepted.
 */
export function parseStudentImportCsv(text: string): ParseImportResult {
  const lines = text.split(/\r?\n/);
  // A trailing newline terminates the last row; it is not another row.
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  const header = lines.shift();
  if (header === undefined) {
    return {
      ok: false,
      reason: "INVALID_HEADER",
      detail: `The header must be exactly: ${EXPECTED_HEADER}`,
    };
  }
  const headerFields = splitLine(header)?.map((field) => field.trim());
  if (
    headerFields === undefined ||
    headerFields.length !== STUDENT_IMPORT_COLUMNS.length ||
    !STUDENT_IMPORT_COLUMNS.every((column, index) => headerFields[index] === column)
  ) {
    return {
      ok: false,
      reason: "INVALID_HEADER",
      detail: `The header must be exactly: ${EXPECTED_HEADER}`,
    };
  }
  const rows: (ParsedImportRow | MalformedImportRow)[] = [];
  lines.forEach((line, index) => {
    const rowNumber = index + 2;
    const values = splitLine(line);
    if (values === null || values.length !== STUDENT_IMPORT_COLUMNS.length) {
      rows.push({
        rowNumber,
        error: {
          reason: "MALFORMED_ROW",
          detail: `Row ${rowNumber} does not have ${STUDENT_IMPORT_COLUMNS.length} fields`,
        },
      });
      return;
    }
    const fields = {} as Record<StudentImportColumn, string>;
    STUDENT_IMPORT_COLUMNS.forEach((column, position) => {
      fields[column] = (values[position] ?? "").trim();
    });
    rows.push({ rowNumber, fields });
  });
  return { ok: true, rows };
}

export interface ValidatedImportRow {
  readonly email: string;
  readonly displayName: string;
  readonly programme: string;
  readonly yearLevel: number;
  readonly organizationId: string | null;
}

export type ImportRowRefusalReason = "INVALID_EMAIL" | "BLANK_FIELD" | "INVALID_YEAR_LEVEL";

export type ValidateImportRowResult =
  | { readonly ok: true; readonly value: ValidatedImportRow }
  | {
      readonly ok: false;
      readonly rowNumber: number;
      readonly reason: ImportRowRefusalReason;
      readonly detail: string;
    };

/** Judge one parsed row. No email-domain gate: none is locked (OQ-07 open). */
export function validateStudentImportRow(
  rowNumber: number,
  fields: Record<string, string>,
): ValidateImportRowResult {
  const email = (fields["email"] ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      rowNumber,
      reason: "INVALID_EMAIL",
      detail: `Row ${rowNumber} has an email that is not shaped like an address`,
    };
  }
  const displayName = (fields["display_name"] ?? "").trim();
  const programme = (fields["programme"] ?? "").trim();
  if (displayName === "" || programme === "") {
    return {
      ok: false,
      rowNumber,
      reason: "BLANK_FIELD",
      detail: `Row ${rowNumber} has a blank display name or programme`,
    };
  }
  const yearLevelText = (fields["year_level"] ?? "").trim();
  if (!/^[1-9][0-9]*$/.test(yearLevelText)) {
    return {
      ok: false,
      rowNumber,
      reason: "INVALID_YEAR_LEVEL",
      detail: `Row ${rowNumber} has a year level that is not a positive integer`,
    };
  }
  const organization = (fields["organization_id"] ?? "").trim();
  return {
    ok: true,
    value: {
      email,
      displayName,
      programme,
      yearLevel: Number.parseInt(yearLevelText, 10),
      organizationId: organization === "" ? null : organization,
    },
  };
}
