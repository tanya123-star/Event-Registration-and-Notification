/**
 * MVP T7 (issue #8) — attendance migration shape, static assertions.
 *
 * Runs WITHOUT a database (same rationale as test/notification-schema.test.ts):
 * the live-constraint suites verify the same guards against real PostgreSQL
 * when ERNS_DATABASE_URL and ERNS_APP_URL are set.
 *
 * Requirements covered:
 *   - FR-ATT-002  uniqueness of attendance on the registration reference.
 *   - FR-ATT-004  no attendance row without a registration reference.
 *   - FR-ATT-005  the window label is PRE_EVENT or EVENT.
 *   - FR-ATT-011  staff-assisted records carry the recorder identity.
 *   - FR-ATT-015  a correction carries reason, corrector and timestamp.
 *   - FR-ATT-018  attendance creates no registration (no path here writes
 *     to erns.registration).
 *   - Walk-in exception (issue #8): reason mandatory, stored apart from
 *     Attendance so the registered count can never include it.
 *   - FR-AUD-006  no cascade anywhere in the erns schema.
 *   - NFR-SEC-015  least privilege: grants touch the new tables only.
 *   - DATA-MODEL.md 2.12 and ATTENDANCE-WORKFLOW.md sections 3, 6, 8.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { schemaDirectory } from "../src/db/migrate.js";

const FILENAME = "0008_attendance.sql";

function migrationSql(): string {
  return readFileSync(join(schemaDirectory(), FILENAME), "utf8");
}

/** Assertions about the value domain run against the DDL, not the prose. */
function ddlSql(): string {
  return migrationSql().replace(/--.*$/gm, "");
}

describe("attendance migration file", () => {
  it("exists as an additive migration", () => {
    const sql = migrationSql();
    expect(sql).toContain("erns.attendance");
    expect(sql).toContain("erns.walk_in");
    expect(sql).not.toMatch(/ALTER TABLE erns\.(app_user|event|registration|audit_log|notification)\b/i);
    expect(sql).not.toMatch(/DROP TABLE/i);
  });

  it("enforces one attendance record per registration at the store (FR-ATT-002)", () => {
    // Column-level UNIQUE on the registration reference: a second insert for
    // the same registration collides here.
    expect(ddlSql()).toContain("registration_id UUID NOT NULL UNIQUE");
  });

  it("requires a registration reference on every attendance row (FR-ATT-004)", () => {
    expect(ddlSql()).toContain("REFERENCES erns.registration (registration_id)");
  });

  it("constrains the window label to the two derived windows (FR-ATT-005)", () => {
    const sql = ddlSql();
    expect(sql).toMatch(/CHECK\s*\(\s*attendance_window IN \('PRE_EVENT', 'EVENT'\)/);
  });

  it("requires the recorder on staff-assisted rows and forbids it on QR rows (FR-ATT-011)", () => {
    const sql = ddlSql();
    expect(sql).toContain("recorded_by");
    expect(sql).toMatch(/method = 'QR' AND recorded_by IS NULL/);
    expect(sql).toMatch(/method <> 'QR' AND recorded_by IS NOT NULL/);
  });

  it("requires reason, corrector and timestamp together on a correction (FR-ATT-015)", () => {
    const sql = ddlSql();
    expect(sql).toContain("correction_reason");
    expect(sql).toContain("corrected_by");
    expect(sql).toContain("corrected_at");
    expect(sql).toMatch(/corrected_at IS NULL OR \(.*correction_reason.*corrected_by.*\)/s);
  });

  it("stores walk-ins apart with a mandatory reason, never as attendance", () => {
    const sql = ddlSql();
    expect(sql).toMatch(/reason TEXT NOT NULL/);
    expect(sql).toMatch(/btrim\(reason\) <> ''/);
    expect(sql).not.toMatch(/registration_id UUID[^\n]*walk_in|walk_in[^\n]*registration_id/i);
  });

  it("creates no registration from any attendance path (FR-ATT-018)", () => {
    const sql = ddlSql();
    expect(sql).not.toMatch(/INSERT INTO erns\.registration/i);
  });

  it("deletes nothing by cascade (FR-AUD-006)", () => {
    expect(ddlSql()).not.toMatch(/ON DELETE (CASCADE|SET NULL|SET DEFAULT)/i);
  });

  it("grants least privilege on the new tables only (NFR-SEC-015)", () => {
    const sql = migrationSql();
    expect(sql).toContain("OWNER TO erns_owner");
    expect(sql).toContain("REVOKE ALL");
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE ON TABLE erns\.attendance TO erns_app/);
    expect(sql).toMatch(/GRANT SELECT, INSERT ON TABLE erns\.walk_in TO erns_app/);
    expect(sql).not.toMatch(/GRANT .* ON TABLE erns\.(app_user|event|registration|audit_log)/);
  });
});
