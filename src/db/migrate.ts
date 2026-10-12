/**
 * Forward-only migration runner.
 *
 * Process requirement: PB-ENG-14-DATABASE-CHANGES.md.
 *
 * FORWARD ONLY, and this is a deliberate limitation rather than an oversight. PB-ENG-14 requires a
 * documented and tested rollback path before a change is considered complete. No down-migration exists
 * for any migration applied so far, so this runner implements only `up`, and `rollback()` throws
 * rather than pretend.
 * Calling code cannot mistake the absence for support.
 *
 * Why `up` is safe to run repeatedly:
 *   - Files are applied in lexicographic order, once each.
 *   - Applied files are recorded by filename and a SHA-256 checksum.
 *   - A file whose checksum no longer matches what was recorded is a REFUSAL, not a re-run. Editing an
 *     applied migration silently would leave the database and the repository describing different
 *     schemas, which is exactly the state PB-ENG-14 exists to prevent.
 *
 * Roles: this runner uses the OWNER connection only. SECURITY-ARCHITECTURE.md line 380 requires the
 * application role to hold no schema-altering privilege, so nothing here may touch ERNS_APP_URL.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Pool, PoolClient } from "pg";

/** Table recording what has been applied. Created by the runner, not by a migration. */
const LEDGER_TABLE = "erns.schema_migrations";

export interface AppliedMigration {
  readonly filename: string;
  readonly checksum: string;
  readonly appliedAt: Date;
}

export class MigrationChecksumMismatchError extends Error {
  public readonly filename: string;
  public readonly recorded: string;
  public readonly actual: string;

  constructor(filename: string, recorded: string, actual: string) {
    super(
      `Migration ${filename} has already been applied with checksum ${recorded}, but the file now ` +
        `hashes to ${actual}. An applied migration must not be edited. Add a new migration instead.`,
    );
    this.name = "MigrationChecksumMismatchError";
    this.filename = filename;
    this.recorded = recorded;
    this.actual = actual;
  }
}

export class RollbackNotSupportedError extends Error {
  constructor() {
    super(
      "This migration runner is forward-only. PB-ENG-14-DATABASE-CHANGES.md requires a documented and " +
        "tested rollback path, and none is implemented for any migration applied so far. " +
        "Do not report rollback " +
        "support until it exists and has been tested.",
    );
    this.name = "RollbackNotSupportedError";
  }
}

export function checksumOf(contents: string): string {
  return createHash("sha256").update(contents, "utf8").digest("hex");
}

/**
 * Absolute path of the directory holding the SQL files.
 *
 * The SQL is NOT compiled by `tsc`, so `dist/db/schema` does not exist. When this module runs from
 * `dist/` the SQL still lives in `src/db/schema`, one level up and across; when it runs from source
 * under Vitest, `src/db/schema` sits beside it. Both cases are resolved rather than assumed, because
 * guessing produces ENOENT at the first migration.
 *
 * The environment variable is an escape hatch for an unusual deployment, not the primary mechanism.
 */
export function schemaDirectory(): string {
  const override = process.env["ERNS_MIGRATIONS_DIR"];
  if (override !== undefined && override !== "") {
    return override;
  }

  const here = dirname(fileURLToPath(import.meta.url));

  // Compiled: dist/db/ -> ../../src/db/schema
  const fromDist = join(here, "..", "..", "src", "db", "schema");
  // Source: src/db/ -> ./schema
  const fromSource = join(here, "schema");

  return existsSync(fromDist) ? fromDist : fromSource;
}

/**
 * Create the schema and ledger table.
 *
 * The schema must exist before the ledger does, because the ledger lives inside it. 0001 uses
 * `CREATE SCHEMA IF NOT EXISTS` too, so this is belt-and-braces for the case where the ledger is
 * queried before any migration has run — `appliedMigrations()` calls this on every invocation,
 * including the ones that only want to read the ledger.
 */
async function ensureLedger(client: PoolClient): Promise<void> {
  await client.query(`CREATE SCHEMA IF NOT EXISTS erns`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (
      filename   TEXT PRIMARY KEY,
      checksum   TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

/** Filenames already applied, with their recorded checksums. */
export async function appliedMigrations(client: PoolClient): Promise<AppliedMigration[]> {
  await ensureLedger(client);
  const { rows } = await client.query<{
    filename: string;
    checksum: string;
    applied_at: Date;
  }>(`SELECT filename, checksum, applied_at FROM ${LEDGER_TABLE} ORDER BY filename`);

  return rows.map((row) => ({
    filename: row.filename,
    checksum: row.checksum,
    appliedAt: row.applied_at,
  }));
}

export interface UpResult {
  readonly applied: readonly string[];
  readonly alreadyApplied: readonly string[];
}

/**
 * Apply every pending migration in filename order.
 *
 * Each file runs in its own transaction, so a failure in 0002 leaves 0001 applied rather than rolling
 * the whole set back. That is the correct granularity: a partially applied schema is visible in the
 * ledger, whereas a half-applied multi-file transaction is not.
 */
export async function up(pool: Pool, directory = schemaDirectory()): Promise<UpResult> {
  const client = await pool.connect();
  const applied: string[] = [];
  const alreadyApplied: string[] = [];

  try {
    const done = new Map((await appliedMigrations(client)).map((m) => [m.filename, m.checksum]));
    const available = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();

    for (const filename of available) {
      const contents = await readFile(join(directory, filename), "utf8");
      const checksum = checksumOf(contents);
      const recorded = done.get(filename);

      if (recorded !== undefined) {
        if (recorded !== checksum) {
          throw new MigrationChecksumMismatchError(filename, recorded, checksum);
        }
        alreadyApplied.push(filename);
        continue;
      }

      // One transaction per file. The ledger insert is inside it, so a crash between the DDL and the
      // record cannot leave an applied migration looking pending.
      await client.query("BEGIN");
      try {
        await client.query(contents);
        await client.query(`INSERT INTO ${LEDGER_TABLE} (filename, checksum) VALUES ($1, $2)`, [
          filename,
          checksum,
        ]);
        await client.query("COMMIT");
        applied.push(filename);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(
          `Migration ${filename} failed and was rolled back. No later migration was attempted.`,
          { cause: error },
        );
      }
    }

    return { applied, alreadyApplied };
  } finally {
    client.release();
  }
}

/**
 * Roll back. Not implemented.
 *
 * Present only so that a caller reaching for symmetry gets a clear refusal instead of an
 * `undefined is not a function`, and so that no report can describe this runner as supporting
 * rollback.
 */
export async function rollback(): Promise<never> {
  throw new RollbackNotSupportedError();
}