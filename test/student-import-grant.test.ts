/**
 * MVP T8 (issue #9) — student-import role-grant migration, static assertions.
 *
 * Runs WITHOUT a database (same rationale as test/notification-schema.test.ts).
 *
 * Context: migration 0005 granted erns_app SELECT only on erns.user_role,
 * because identity resolution only reads. The Administrator CSV import
 * (USER-ROLES.md line 328: Student is granted by default on provisioning)
 * must INSERT that row, so the least privilege for this milestone grows by
 * exactly one grant. UPDATE and DELETE stay withheld: role revocation is a
 * later milestone with its own ticket.
 *
 * Requirements covered:
 *   - USER-ROLES.md line 328 (Student granted by default on provisioning).
 *   - NFR-SEC-015 (minimum privilege: one new grant, on one table).
 *   - FR-AUD-006 (no cascade; this migration creates no foreign key at all).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { schemaDirectory } from "../src/db/migrate.js";

const FILENAME = "0009_student_import_role_grant.sql";

function migrationSql(): string {
  return readFileSync(join(schemaDirectory(), FILENAME), "utf8");
}

function ddlSql(): string {
  return migrationSql().replace(/--.*$/gm, "");
}

describe("student import role-grant migration file", () => {
  it("adds exactly one grant and alters no table", () => {
    const sql = ddlSql();
    expect(sql).toMatch(/GRANT INSERT ON TABLE erns\.user_role TO erns_app/);
    expect(sql).not.toMatch(/CREATE TABLE/i);
    expect(sql).not.toMatch(/ALTER TABLE/i);
    expect(sql).not.toMatch(/DROP/i);
  });

  it("withholds update and delete on roles", () => {
    const sql = ddlSql();
    expect(sql).not.toMatch(/UPDATE|DELETE/);
  });

  it("creates no foreign key and deletes nothing by cascade", () => {
    const sql = ddlSql();
    expect(sql).not.toMatch(/REFERENCES/i);
    expect(sql).not.toMatch(/ON DELETE/i);
  });
});
