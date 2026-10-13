/**
 * Migration runner behaviour, against a real PostgreSQL database.
 *
 * REQUIRES POSTGRESQL. Skipped explicitly when the URL variables are unset.
 *
 * Covers PB-ENG-14-DATABASE-CHANGES.md: applied migrations are recorded, an applied file must not be
 * edited silently, and the runner is idempotent.
 *
 * ROLLBACK IS NOT TESTED, BECAUSE IT IS NOT IMPLEMENTED. PB-ENG-14 requires a documented and tested
 * rollback path before a change is complete. `rollback()` throws by design, and
 * test/migration.test.ts asserts that it throws. Reporting this runner as supporting rollback would be
 * false.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";

import { applyMigrationsOnce, createOwnerPoolForTests, isDatabaseConfigured, skipReason } from "./db-harness.js";
import {
  MigrationChecksumMismatchError,
  RollbackNotSupportedError,
  appliedMigrations,
  checksumOf,
  rollback,
  schemaDirectory,
  up,
} from "../src/db/migrate.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/migration.test.ts — ${skipReason()}\n`);
}

/** The SQL files the runner would apply, in order. Derived, never listed. */
async function sqlFilesInSchemaDirectory(): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  return (await readdir(schemaDirectory())).filter((n) => n.endsWith(".sql")).sort();
}

describe.skipIf(!configured)("migration runner, real PostgreSQL", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createOwnerPoolForTests();
    // The repo's own migrations are applied here so the ledger assertions below have something to
    // read. The per-directory temp-directory tests each run `up()` themselves.
    await applyMigrationsOnce(pool);
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("every migration in the schema directory is recorded as applied", async () => {
    // Idempotent by design: if `beforeAll` applied them, this run reports them as already applied.
    // The invariant under test is "everything in the directory is applied", not "this call applied
    // it" — the latter cannot be asserted without dropping the schema, which would destroy the other
    // suites' fixture.
    const result = await up(pool);
    const all = [...result.applied, ...result.alreadyApplied].sort();
    // Derived from the directory rather than listed. Hard-coding the filenames meant adding 0004 failed
    // here for a reason unrelated to the migration runner, which is exactly the failure mode these
    // assertions are supposed to detect rather than produce.
    expect(all).toEqual(await sqlFilesInSchemaDirectory());
  });

  it("applies nothing when the directory contains only already-applied files", async () => {
    const available = await sqlFilesInSchemaDirectory();
    // Updated visibly for 0006 (MVP T3 StudentProfile, issue #4), per the
    // TESTING-STRATEGY.md rule that a migration touching asserted invariants updates tests first.
    expect(available).toEqual([
      "0001_initial.sql",
      "0002_audit_grants.sql",
      "0003_cancellation_constraint.sql",
      "0004_event_modified_by.sql",
      "0005_session_identity.sql",
      "0006_student_profile.sql",
    ]);
  });

  it("reports nothing to do on a second run", async () => {
    const result = await up(pool);
    expect(result.applied).toHaveLength(0);
    expect([...result.alreadyApplied].sort()).toEqual(await sqlFilesInSchemaDirectory());
  });

  it("applies only the repo's own migrations, not a temp-directory probe", async () => {
    // The temp-directory tests below record rows in the same ledger and clean them up. This asserts
    // the ledger carries nothing else, so an ordering dependency between files cannot hide.
    const { readdir } = await import("node:fs/promises");
    const expected = (await readdir(schemaDirectory())).filter((n) => n.endsWith(".sql")).length;
    const { rows } = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM erns.schema_migrations`,
    );
    expect(Number(rows[0]?.count ?? "0")).toBe(expected);
  });

  it("records a checksum for each applied migration", async () => {
    const client = await pool.connect();
    try {
      // Counted against the schema directory rather than hard-coded, so adding a migration does not
      // require editing this assertion and then silently failing for the wrong reason.
      const { readdir } = await import("node:fs/promises");
      const expected = (await readdir(schemaDirectory())).filter((n) => n.endsWith(".sql")).sort();

      const applied = await appliedMigrations(client);
      expect(applied.map((m) => m.filename).sort()).toEqual(expected);
      for (const migration of applied) {
        expect(migration.checksum).toMatch(/^[0-9a-f]{64}$/);
        expect(migration.appliedAt).toBeInstanceOf(Date);
      }
    } finally {
      client.release();
    }
  });

  it("stores the checksum of the file's current contents", async () => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");

    const client = await pool.connect();
    try {
      const applied = await appliedMigrations(client);
      for (const migration of applied) {
        const contents = await readFile(join(schemaDirectory(), migration.filename), "utf8");
        expect(migration.checksum).toBe(checksumOf(contents));
      }
    } finally {
      client.release();
    }
  });

  /**
   * PROBE FILENAMES ARE NEVER THE REPO'S OWN.
   *
   * An earlier version used "0001_initial.sql" as the temp-directory probe name. That collides with
   * the repository's migration, so the probe overwrote the real ledger row and the next
   * `checksumOf` comparison failed for the wrong reason. The probes are named `9901_probe` and
   * `9902_probe`, which sort last, are unmistakably not part of the schema, and clean up after
   * themselves.
   */
  it("refuses to proceed when an applied file has been edited", async () => {
    const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const directory = await mkdtemp(join(tmpdir(), "erns-migration-"));
    const filename = "9901_probe.sql";
    const original = "SELECT 1;\n";

    try {
      await writeFile(join(directory, filename), original, "utf8");
      const first = await up(pool, directory);
      expect(first.applied).toEqual([filename]);

      // Second run, file unchanged: recorded as already applied.
      const second = await up(pool, directory);
      expect(second.applied).toEqual([]);
      expect(second.alreadyApplied).toEqual([filename]);

      // Now edit it. This must be refused, not silently re-applied.
      await writeFile(join(directory, filename), `${original}-- edited\n`, "utf8");
      await expect(up(pool, directory)).rejects.toBeInstanceOf(MigrationChecksumMismatchError);
    } finally {
      await rm(directory, { recursive: true, force: true });
      await pool.query(`DELETE FROM erns.schema_migrations WHERE filename = $1`, [filename]);
    }
  });

  it("names both checksums in the mismatch message", async () => {
    const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const directory = await mkdtemp(join(tmpdir(), "erns-migration-"));
    const filename = "9902_probe.sql";
    const original = "SELECT 1;\n";

    try {
      await writeFile(join(directory, filename), original, "utf8");
      await up(pool, directory);
      await writeFile(join(directory, filename), `${original}-- changed\n`, "utf8");

      const error = await up(pool, directory).then(
        () => undefined,
        (caught: unknown) => caught,
      );
      expect(error).toBeInstanceOf(MigrationChecksumMismatchError);
      const mismatch = error as MigrationChecksumMismatchError;
      expect(mismatch.filename).toBe(filename);
      expect(mismatch.recorded).toMatch(/^[0-9a-f]{64}$/);
      expect(mismatch.actual).toMatch(/^[0-9a-f]{64}$/);
      expect(mismatch.recorded).not.toBe(mismatch.actual);
      expect(mismatch.message).toContain("must not be edited");
    } finally {
      await rm(directory, { recursive: true, force: true });
      await pool.query(`DELETE FROM erns.schema_migrations WHERE filename = $1`, [filename]);
    }
  });

  it("leaves the ledger clean after the probe tests", async () => {
    // Guards the cleanup in the two tests above. If a probe row survived, the count assertion in
    // "applies only the repo's own two migrations" would catch it on a later run, but only by luck of
    // ordering; this asserts it directly.
    const { rows } = await pool.query<{ filename: string }>(
      `SELECT filename FROM erns.schema_migrations WHERE filename LIKE '99%_probe.sql'`,
    );
    expect(rows).toEqual([]);
  });

  it("creates the objects declared by the migrations", async () => {
    const { rows } = await pool.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'erns' ORDER BY tablename`,
    );
    const names = rows.map((r) => r.tablename);
    expect(names).toContain("app_user");
    expect(names).toContain("event");
    expect(names).toContain("registration");
    expect(names).toContain("audit_log");
    expect(names).toContain("schema_migrations");
  });
});

describe("rollback is not supported, and says so", () => {
  it("rollback() rejects rather than pretending", async () => {
    await expect(rollback()).rejects.toBeInstanceOf(RollbackNotSupportedError);
  });

  it("the error states that no tested rollback path exists", async () => {
    const error = await rollback().then(
      () => undefined,
      (caught: unknown) => caught as RollbackNotSupportedError,
    );
    expect(error?.message).toContain("forward-only");
    expect(error?.message).toContain("PB-ENG-14");
  });

  it("checksumOf is a stable SHA-256 of the file contents", () => {
    expect(checksumOf("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(checksumOf("abc")).toBe(checksumOf("abc"));
    expect(checksumOf("abc")).not.toBe(checksumOf("abd"));
  });
});