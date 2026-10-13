/**
 * MVP T8 (issue #9) — CSV student-import row parsing and validation.
 *
 * Seams under test (per the tdd skill; seams from the directive):
 *   - domain student-import (pure, no I/O): CSV shape and per-row validity.
 *
 * Vocabulary per GLOSSARY.md: Student, Administrator.
 *
 * Requirements covered:
 *   - MVP story 33: provision Student accounts by CSV import.
 *   - MVP gap 7: validated rows with per-row results.
 *   - DATA-MODEL.md 2.4 (StudentProfile: programme, year level, org,
 *     is_eligible) and 0006 (programme non-blank, year_level >= 1,
 *     organization optional, is_eligible default TRUE).
 *   - OQ-07 OPEN: no student-number column exists, so no student-number
 *     field is accepted or required.
 *
 * What this module does NOT decide: duplicates against storage, role grants
 * and audit live in the L4 use case; who may import lives in the handler
 * core. This module judges shape only.
 */

import { describe, expect, it } from "vitest";

import {
  STUDENT_IMPORT_COLUMNS,
  parseStudentImportCsv,
  validateStudentImportRow,
} from "../src/domain/student-import.js";

describe("student import CSV shape", () => {
  it("names the five locked columns", () => {
    expect([...STUDENT_IMPORT_COLUMNS]).toEqual([
      "email",
      "display_name",
      "programme",
      "year_level",
      "organization_id",
    ]);
  });

  it("parses a well-formed file into rows", () => {
    const result = parseStudentImportCsv(
      "email,display_name,programme,year_level,organization_id\n" +
        "ana@example.test, Ana Reyes, BSIT, 3, \n",
    );
    expect(result).toEqual({
      ok: true,
      rows: [
        {
          rowNumber: 2,
          fields: {
            email: "ana@example.test",
            display_name: "Ana Reyes",
            programme: "BSIT",
            year_level: "3",
            organization_id: "",
          },
        },
      ],
    });
  });

  it("refuses a file with the wrong header and applies nothing", () => {
    expect(
      parseStudentImportCsv("email,display_name\nana@example.test,Ana\n"),
    ).toEqual({
      ok: false,
      reason: "INVALID_HEADER",
      detail: "The header must be exactly: email,display_name,programme,year_level,organization_id",
    });
  });

  it("refuses a row with the wrong field count", () => {
    const result = parseStudentImportCsv(
      "email,display_name,programme,year_level,organization_id\nana@example.test,Ana\n",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.rows).toEqual([
      {
        rowNumber: 2,
        error: {
          reason: "MALFORMED_ROW",
          detail: "Row 2 does not have 5 fields",
        },
      },
    ]);
  });

  it("rejects an embedded double quote rather than guessing", () => {
    const result = parseStudentImportCsv(
      'email,display_name,programme,year_level,organization_id\n"ana@example.test,Ana,BSIT,3,\n',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.rows[0]).toMatchObject({ rowNumber: 2 });
    expect("error" in (result.rows[0] as object)).toBe(true);
  });
});

describe("student import row validation", () => {
  function fields(overrides: Record<string, string> = {}): Record<string, string> {
    return {
      email: "ana@example.test",
      display_name: "Ana Reyes",
      programme: "BSIT",
      year_level: "3",
      organization_id: "",
      ...overrides,
    };
  }

  it("accepts a valid row with normalized values", () => {
    expect(validateStudentImportRow(2, fields())).toEqual({
      ok: true,
      value: {
        email: "ana@example.test",
        displayName: "Ana Reyes",
        programme: "BSIT",
        yearLevel: 3,
        organizationId: null,
      },
    });
  });

  it("refuses a shapeless email", () => {
    expect(validateStudentImportRow(2, fields({ email: "not-an-email" }))).toEqual({
      ok: false,
      rowNumber: 2,
      reason: "INVALID_EMAIL",
      detail: "Row 2 has an email that is not shaped like an address",
    });
  });

  it("refuses a blank display name or programme", () => {
    expect(validateStudentImportRow(2, fields({ display_name: "   " })).ok).toBe(false);
    expect(validateStudentImportRow(2, fields({ programme: "" })).ok).toBe(false);
  });

  it("refuses a non-positive-integer year level", () => {
    for (const yearLevel of ["0", "-1", "2.5", "three", ""]) {
      const result = validateStudentImportRow(2, fields({ year_level: yearLevel }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("INVALID_YEAR_LEVEL");
      }
    }
  });

  it("keeps a provided organization id", () => {
    const result = validateStudentImportRow(2, fields({ organization_id: "KASAMA" }));
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.value.organizationId).toBe("KASAMA");
    }
  });
});
