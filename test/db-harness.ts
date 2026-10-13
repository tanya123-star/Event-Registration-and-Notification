/**
 * Database test harness.
 *
 * Connection handling for the tests that need a real PostgreSQL.
 *
 * Two separate URLs, for two separate roles:
 *   ERNS_DATABASE_URL  the cluster superuser or erns_owner. Runs migrations, creates roles, truncates.
 *   ERNS_APP_URL       erns_app. Every privilege assertion connects as this role.
 *
 * Keeping them separate is the point. SECURITY-ARCHITECTURE.md section 9.2 requires the application
 * role to hold no schema-altering privilege, and a permission test run over the owner's connection
 * would prove nothing: the owner can always UPDATE a table it owns, regardless of any REVOKE. The
 * test is only meaningful if it authenticates as erns_app.
 *
 * SKIPPING IS EXPLICIT. `isDatabaseConfigured()` gates every database test suite. When the variables
 * are absent the suite is skipped with a reason naming the variable, and this file's `describe`
 * wrapper prints that reason to stderr. A skipped test is reported as skipped. It is never counted as
 * passing, and no summary may describe a run in which these were skipped as having verified the
 * constraints.
 *
 * TRUNCATION uses `erns_owner`, which owns the tables. erns_app has no TRUNCATE grant on audit_log
 * by design (0002), so an application-role connection could not clean up after itself.
 */

import { Pool } from "pg";

import { up } from "../src/db/migrate.js";

/** Schema and tables this milestone owns, in dependency order. */
export const MANAGEABLE_TABLES = [
  "erns.audit_log",
  "erns.registration",
  "erns.notification_recipient",
  "erns.notification",
  "erns.session",
  "erns.user_role",
  "erns.event",
  "erns.app_user",
] as const;

export function ownerUrl(): string | undefined {
  return process.env["ERNS_DATABASE_URL"];
}

export function appUrl(): string | undefined {
  return process.env["ERNS_APP_URL"];
}

export function isDatabaseConfigured(): boolean {
  return ownerUrl() !== undefined && appUrl() !== undefined;
}

/** A single human-readable sentence naming exactly what is missing. */
export function skipReason(): string {
  const missing: string[] = [];
  if (ownerUrl() === undefined) {
    missing.push("ERNS_DATABASE_URL");
  }
  if (appUrl() === undefined) {
    missing.push("ERNS_APP_URL");
  }
  return (
    `Real PostgreSQL not configured: ${missing.join(" and ")} not set. ` +
    "This test is NOT PASSING and NOT RUN. It verifies constraints and privileges that only a real " +
    "database can demonstrate (TESTING-STRATEGY.md lines 126-127). " +
    "Start PostgreSQL with `docker compose up -d` and copy .env.example to .env.test."
  );
}

export function createOwnerPoolForTests(): Pool {
  const url = ownerUrl();
  if (url === undefined) {
    throw new Error("ERNS_DATABASE_URL is not set");
  }
  return new Pool({ connectionString: url, max: 4 });
}

/**
 * Apply migrations exactly once per test PROCESS.
 *
 * Vitest runs test files in parallel worker processes by default. Four files each calling `up(pool)`
 * would execute 0001 concurrently, and PostgreSQL's `CREATE SCHEMA IF NOT EXISTS` is not atomic
 * against concurrent creators — two workers would race, and the loser fails with a duplicate key on
 * pg_namespace or pg_type rather than a comprehensible error.
 *
 * The advisory lock serialises them across processes, and the memo means a file that runs its
 * migrations in `beforeAll` does not pay for it twice. `pg_advisory_lock` is session-scoped, so it
 * is taken on a dedicated connection and released by `pg_advisory_unlock`; using a Pool's pooled
 * client would risk unlocking on a different connection than the one that locked.
 */
const appliedOnce = new Map<string, Promise<void>>();

export async function applyMigrationsOnce(pool: Pool): Promise<void> {
  const key = "erns-migrations";
  const existing = appliedOnce.get(key);
  if (existing !== undefined) {
    return existing;
  }

  const pending = (async () => {
    const client = await pool.connect();
    try {
      // Arbitrary but fixed namespace. Any other process using this constant would serialise against
      // us, which is the intent.
      await client.query("SELECT pg_advisory_lock(741852963)");
      try {
        await up(pool);
      } finally {
        await client.query("SELECT pg_advisory_unlock(741852963)");
      }
    } finally {
      client.release();
    }
  })();

  appliedOnce.set(key, pending);
  return pending;
}

export function createAppPoolForTests(): Pool {
  const url = appUrl();
  if (url === undefined) {
    throw new Error("ERNS_APP_URL is not set");
  }
  return new Pool({ connectionString: url, max: 4 });
}

/**
 * Remove all rows, leaving the schema in place.
 *
 * Runs as the owner. RESTART IDENTITY is harmless here because every key is a UUID with no sequence,
 * and CASCADE handles foreign keys from registration to app_user and from audit_log to app_user.
 */
export async function truncateAll(pool: Pool): Promise<void> {
  await pool.query(`TRUNCATE TABLE ${MANAGEABLE_TABLES.join(", ")} RESTART IDENTITY CASCADE`);
}

/**
 * Insert an active user and return its id. Uses the owner connection because test fixtures are not
 * the thing under test.
 */
export async function seedUser(
  pool: Pool,
  overrides: { readonly email?: string; readonly displayName?: string } = {},
): Promise<string> {
  const email = overrides.email ?? `student-${crypto.randomUUID()}@example.test`;
  const displayName = overrides.displayName ?? "Test Student";
  const { rows } = await pool.query<{ user_id: string }>(
    `INSERT INTO erns.app_user (email, display_name) VALUES ($1, $2) RETURNING user_id`,
    [email, displayName],
  );
  const row = rows[0];
  if (row === undefined) {
    throw new Error("seedUser returned no row");
  }
  return row.user_id;
}

/**
 * Insert an event and return its id.
 *
 * Defaults produce a PUBLISHED event with registration open, which is the state the validation
 * function treats as registrable. Status is set directly rather than driven through the lifecycle
 * state machine, because the lifecycle transitions are not part of this milestone and the schema is
 * what is under test.
 *
 * `event_date` is derived from the registration deadline rather than fixed at a constant offset.
 * DATA-MODEL.md line 209 requires the deadline to be earlier than the event date, and the constraint
 * is on timestamps, so a fixed `CURRENT_DATE + 30` collides with a deadline of `now() + 30 days`
 * whenever the run happens after midnight. Deriving the date from the deadline makes the fixture
 * satisfy the constraint for every run time.
 */
export async function seedEvent(
  pool: Pool,
  overrides: {
    readonly status?: string;
    readonly registrationOpen?: boolean;
    readonly capacity?: number | null;
    readonly registrationStart?: string | null;
    readonly registrationDeadline?: string | null;
    readonly registrationRequired?: boolean;
    readonly eventType?: string;
  } = {},
): Promise<string> {
  // Resolve the clock ONCE, server-side, then derive the three related values in JavaScript.
  //
  // This replaces a chain of SQL COALESCE expressions, three of which failed in turn:
  //   - `COALESCE($8::timestamptz, <default>)` returned NULL for a JS null, because the cast propagates
  //     the NULL and the default branch is never reached. Result: a NULL deadline, and
  //     `event_window_required_check` refusing the insert.
  //   - the `NULLIF($8::text, '')` workaround then made COALESCE mix text with timestamptz:
  //     "COALESCE types text and timestamp with time zone cannot be matched".
  //   - a fixed `CURRENT_DATE + 30` event date cannot support a PAST deadline at all, which FR-REG-010
  //     needs in order to exercise the deadline validation step.
  //
  // Computing the values here keeps every constraint satisfiable by construction. The forms used were
  // verified directly against PostgreSQL before being adopted.
  const { rows: clockRows } = await pool.query<{ now: Date }>("SELECT now() AS now");
  const now = clockRows[0]?.now ?? new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const registrationDeadline = overrides.registrationDeadline
    ? new Date(overrides.registrationDeadline)
    : new Date(now.getTime() + 30 * oneDayMs);

  // The start must precede the deadline (DATA-MODEL.md line 210) AND, for the default fixture, must be
  // in the PAST so that step 4 of the validator admits the attempt.
  //
  // Both conditions at once. An earlier version derived the start from the deadline alone
  // (`deadline - 1 day`), which is 29 days in the FUTURE under the default deadline and therefore
  // refused every registration at REGISTRATION_OPEN. Deriving it from `now` alone breaks the opposite
  // way: a caller supplying a past deadline gets a start later than that deadline.
  //
  // `min` of the two satisfies both, for every deadline the fixture supports.
  const oneDayBeforeDeadline = new Date(registrationDeadline.getTime() - oneDayMs);
  const oneDayBeforeNow = new Date(now.getTime() - oneDayMs);
  const registrationStart = overrides.registrationStart
    ? new Date(overrides.registrationStart)
    : oneDayBeforeDeadline.getTime() < oneDayBeforeNow.getTime()
      ? oneDayBeforeDeadline
      : oneDayBeforeNow;

  // The event date must be strictly after the deadline (DATA-MODEL.md line 209). `event_date` is a DATE
  // and the deadline a TIMESTAMPTZ, so adding a day to the deadline's date guarantees it.
  const eventDate = new Date(registrationDeadline.getTime() + oneDayMs);

  const { rows } = await pool.query<{ event_id: string }>(
    `INSERT INTO erns.event
       (title, description, event_type, event_date, start_time, end_time, venue,
        status, registration_open, capacity, registration_start, registration_deadline,
        registration_required)
VALUES ($1, $2, $3, $8::date,
              '10:00', '12:00', 'Test Hall',
              $4, $5, $6,
              $9::timestamptz,
              $10::timestamptz,
              $7)
     RETURNING event_id`,
    [
      "Test Event",
      "Created by test/db-harness.ts",
      overrides.eventType ?? "TEST_EVENT_TYPE",
      overrides.status ?? "PUBLISHED",
      overrides.registrationOpen ?? true,
      overrides.capacity ?? null,
      overrides.registrationRequired ?? true,
      eventDate,
      registrationStart,
      registrationDeadline,
    ],
  );
  const row = rows[0];
  if (row === undefined) {
    throw new Error("seedEvent returned no row");
  }
  return row.event_id;
}

export interface SeedRegistrationOverrides {
  readonly userId: string;
  readonly eventId: string;
  readonly status?: "REGISTERED" | "CANCELLED";
  readonly confirmationReference?: string;
  readonly registrationSource?: "SELF" | "OFFICER" | "ADMINISTRATOR";
  readonly cancelledAt?: string | null;
  readonly cancellationReason?: string | null;
  readonly cancelledBy?: string | null;
  readonly studentContext?: Record<string, unknown> | null;
}

export async function seedRegistration(
  pool: Pool,
  overrides: SeedRegistrationOverrides,
): Promise<string> {
  // `cancelled_at` is built in SQL rather than passed as a parameter, so that "now()" is evaluated by
  // the server at insert time and the caller can leave it unset.
  const { rows } = await pool.query<{ registration_id: string }>(
    `INSERT INTO erns.registration
       (user_id, event_id, status, registration_source, confirmation_reference,
        cancelled_at, cancellation_reason, cancelled_by, student_context)
     VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8, $9)
     RETURNING registration_id`,
    [
      overrides.userId,
      overrides.eventId,
      overrides.status ?? "REGISTERED",
      overrides.registrationSource ?? "SELF",
      overrides.confirmationReference ?? `REF-${crypto.randomUUID()}`,
      // A CANCELLED row must carry its cancellation fields, per DATA-MODEL.md line 401 and the
      // registration_cancellation_fields_check constraint. Supplying them here means a test that
      // simply asks for a cancelled registration does not first have to know that rule; the tests
      // that assert the RULE insert the rows themselves, bypassing this helper.
      overrides.status === "CANCELLED"
        ? (overrides.cancelledAt ?? "now()")
        : (overrides.cancelledAt ?? null),
      overrides.cancellationReason ?? (overrides.status === "CANCELLED" ? "seeded cancellation" : null),
      overrides.cancelledBy ?? (overrides.status === "CANCELLED" ? overrides.userId : null),
      overrides.studentContext === undefined
        ? { programme: "Computer Science", year_level: 3, organization_id: null }
        : overrides.studentContext === null
          ? null
          : JSON.stringify(overrides.studentContext),
    ],
  );
  const row = rows[0];
  if (row === undefined) {
    throw new Error("seedRegistration returned no row");
  }
  return row.registration_id;
}

/**
 * Extract the SQLSTATE from a pg error.
 *
 * `pg`'s DatabaseError carries the state as `code`. When a query is issued on a client that has been
 * released, or after a connection-level failure, the error thrown is a plain `Error` with no `code`
 * at all — which is why this returns `undefined` rather than guessing.
 */
export function sqlstateOf(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/** Assert that `body` fails with the given SQLSTATE, and return the error for further inspection. */
/**
 * Assert that `body` fails with the given SQLSTATE, and return the error for further inspection.
 *
 * The comparison is on `expected === actual`. Every failure message reported by a running suite had
 * the form "Expected SQLSTATE undefined, got 23514", which means `actual` was undefined — NOT that the
 * driver omitted the code, but that the two were compared with `===` against a value the caller had
 * not been given. `pg` reports the state reliably: a CHECK violation surfaces as 23514, a privilege
 * failure as 42501. The mismatch was in this helper, not in PostgreSQL or the driver.
 */
export async function expectSqlstate(
  sqlstate: string,
  body: () => Promise<unknown>,
): Promise<unknown> {
  try {
    await body();
  } catch (error) {
    const actual = sqlstateOf(error);
    if (actual === sqlstate) {
      return error;
    }
    throw new Error(
      `Expected SQLSTATE ${sqlstate}, but got ${actual ?? "an error with no code property"}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  throw new Error(`Expected SQLSTATE ${sqlstate}, but the statement succeeded`);
}