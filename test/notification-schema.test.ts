/**
 * MVP T5 (issue #6) — notification centre migration shape, static assertions.
 *
 * This suite reads the migration file as text and asserts the guards issue #6
 * requires. It runs WITHOUT a database: the live-constraint suites
 * (test/schema.test.ts, test/migration.test.ts) verify the same guards
 * against real PostgreSQL when ERNS_DATABASE_URL and ERNS_APP_URL are set,
 * and skip explicitly otherwise.
 *
 * Requirements covered:
 *   - FR-NOT-002  in-app states CREATED, READ, ACKNOWLEDGED only.
 *   - FR-NOT-003  four-state email model (QUEUED, SENT, FAILED, BOUNCED).
 *   - FR-NOT-004  no Delivered or Opened state anywhere.
 *   - FR-NOT-006  requires_acknowledgement is true exactly for IMPORTANT.
 *   - FR-NOT-009  acknowledged_at requires read_at.
 *   - FR-NOT-014  unique on (notification_id, user_id).
 *   - FR-NOT-016  empty body refused.
 *   - FR-AUD-006  no cascade: attribution and history survive (no ON DELETE
 *     CASCADE, SET NULL, or SET DEFAULT in the erns schema).
 *   - NFR-SEC-015  least privilege: grants touch the new tables only, the
 *     application role receives no schema-altering privilege.
 *   - DATA-MODEL.md 2.9/2.10 and NOTIFICATION-WORKFLOW.md section 4.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { schemaDirectory } from "../src/db/migrate.js";

const FILENAME = "0007_notification_centre.sql";

function migrationSql(): string {
  return readFileSync(join(schemaDirectory(), FILENAME), "utf8");
}

/**
 * The DDL under test. Comments document deliberately ABSENT states (no
 * Delivered, no Opened, no NOT_REQUESTED), so assertions about the value
 * domain run against the code, not the prose.
 */
function ddlSql(): string {
  return migrationSql().replace(/--.*$/gm, "");
}

describe("notification centre migration file", () => {
  it("exists as an additive migration", () => {
    const sql = migrationSql();
    expect(sql).toContain("erns.notification");
    expect(sql).not.toMatch(/ALTER TABLE erns\.(app_user|event|registration|audit_log)\b/i);
    expect(sql).not.toMatch(/DROP TABLE/i);
  });

  it("constrains in-app states to CREATED, READ, ACKNOWLEDGED (FR-NOT-002)", () => {
    const sql = migrationSql();
    expect(sql).toContain("in_app_state");
    expect(sql).toContain("'CREATED'");
    expect(sql).toContain("'READ'");
    expect(sql).toContain("'ACKNOWLEDGED'");
  });

  it("constrains email to the four locked states and never Delivered or Opened (FR-NOT-003, FR-NOT-004)", () => {
    const sql = ddlSql();
    for (const state of ["'QUEUED'", "'SENT'", "'FAILED'", "'BOUNCED'"] as const) {
      expect(sql).toContain(state);
    }
    expect(sql).not.toMatch(/Delivered|Opened|NOT_REQUESTED/);
  });

  it("couples acknowledgement to IMPORTANT priority (FR-NOT-006)", () => {
    const sql = migrationSql();
    expect(sql).toContain("'IMPORTANT'");
    expect(sql).toContain("requires_acknowledgement");
    expect(sql).toContain("priority = 'IMPORTANT'");
  });

  it("requires read_at before acknowledged_at (FR-NOT-009)", () => {
    const sql = migrationSql();
    expect(sql).toContain("acknowledged_at");
    expect(sql).toContain("read_at");
    expect(sql).toMatch(/acknowledged_at IS NULL OR read_at IS NOT NULL/);
  });

  it("enforces one recipient record per student per notification (FR-NOT-014)", () => {
    const sql = migrationSql();
    expect(sql).toMatch(/UNIQUE\s*\(\s*notification_id\s*,\s*user_id\s*\)/i);
  });

  it("refuses an empty notification body (FR-NOT-016)", () => {
    const sql = migrationSql();
    expect(sql).toMatch(/btrim\(body\) <> ''/);
  });

  it("deletes nothing by cascade (FR-AUD-006)", () => {
    const sql = migrationSql();
    expect(sql).not.toMatch(/ON DELETE (CASCADE|SET NULL|SET DEFAULT)/i);
  });

  it("grants least privilege on the new tables only (NFR-SEC-015)", () => {
    const sql = migrationSql();
    expect(sql).toContain("OWNER TO erns_owner");
    expect(sql).toContain("REVOKE ALL");
    expect(sql).toMatch(/GRANT SELECT, INSERT ON TABLE erns\.notification TO erns_app/);
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE ON TABLE erns\.notification_recipient TO erns_app/);
  });
});
