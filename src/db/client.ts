/**
 * PostgreSQL connection, transaction isolation, and the bounded serialization-failure retry.
 *
 * Requirements addressed:
 *   C-02 (TECH-STACK.md): "The data store MUST support serialisable or repeatable-read transactions
 *   around a check-then-write."
 *   NFR-INTEG-007 (NON-FUNCTIONAL-REQUIREMENTS.md): check-then-write must be atomic.
 *   CON-01, CON-02, CON-03, CON-04, TST-09 (TESTING-STRATEGY.md): concurrent write behaviour.
 *
 * Why SERIALIZABLE and not REPEATABLE READ: both satisfy C-02, but only SERIALIZABLE makes the
 * predicate read in step 8 (does an active registration exist) and the capacity count in step 7
 * participate in the serialization graph. Under REPEATABLE READ PostgreSQL permits a write skew:
 * two transactions can each read count=9 of capacity=10, each conclude a slot is free, and both
 * commit with count=11. CON-04 forbids exactly that. SERIALIZABLE aborts one of them with SQLSTATE
 * 40001 instead, which is the behaviour the retry below exists to absorb.
 *
 * Retry policy, stated in full because it is a correctness decision and not a tuning knob:
 *   - Retries SQLSTATE 40001 (serialization_failure) ONLY. Nothing else is retried.
 *   - 3 attempts total (1 initial + 2 retries).
 *   - Backoff 50ms, 100ms. Full jitter would be marginally better under load; the bound matters more
 *     here than the distribution.
 *   - Every other SQLSTATE propagates on the first attempt. Notably 23514 (check_violation) and
 *     23505 (unique_violation) are NEVER retried: they are deterministic statements about the data
 *     that will fail identically every time. Retrying them would turn a correct refusal into a
 *     latency cost and, worse, would hide the conflict from the caller.
 *   - The whole transaction body re-runs on retry, including its reads. Retrying only the write
 *     would defeat the purpose, since the aborted transaction's snapshot is what was wrong.
 *
 * Roles, per the project-owner decision recorded in PROJECT-OWNER-DECISIONS.md and required by
 * NFR-SEC-015 and SECURITY-ARCHITECTURE.md section 9.2:
 *   DATABASE_URL     the owner/migration role. Used by the migration runner only.
 *   ERNS_APP_URL     the application role `erns_app`. Used by every runtime query.
 *
 * The application role must be the one used for all runtime traffic. A module-level guard makes a
 * silent mistake loud, because SECURITY-ARCHITECTURE.md line 380 requires the application role to
 * hold no schema-altering privilege in production.
 */

import { Pool } from "pg";
import type { PoolClient } from "pg";

/** SQLSTATE raised by PostgreSQL when a SERIALIZABLE transaction cannot be serialized. */
export const SERIALIZATION_FAILURE = "40001";

/** SQLSTATE for a check-constraint violation. Never retried. */
export const CHECK_VIOLATION = "23514";

/** SQLSTATE for a unique-constraint violation. Never retried. */
export const UNIQUE_VIOLATION = "23505";

/** SQLSTATE for insufficient privilege. Never retried. */
export const INSUFFICIENT_PRIVILEGE = "42501";

export interface RetryPolicy {
  /** Total attempts, including the first. */
  readonly maxAttempts: number;
  /** Backoff before attempt N, in milliseconds, indexed from 0. */
  readonly backoffMs: readonly number[];
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffMs: [50, 100],
} as const;

export class SerializationExhaustedError extends Error {
  public readonly attempts: number;

  constructor(attempts: number) {
    super(
      `Transaction failed with SQLSTATE ${SERIALIZATION_FAILURE} after ${attempts} attempts. ` +
        "The contention here is genuine; a caller retrying later may succeed.",
    );
    this.name = "SerializationExhaustedError";
    this.attempts = attempts;
  }
}

function sqlstateOf(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function isSerializationFailure(error: unknown): boolean {
  return sqlstateOf(error) === SERIALIZATION_FAILURE;
}

/**
 * THROWN BY A TRANSACTION BODY TO ROLL IT BACK WITHOUT AN ERROR REACHING THE CALLER.
 *
 * WHY THIS EXISTS
 *
 * `withTransaction` commits whenever the body RESOLVES, whatever it resolves to. That is the correct
 * default for a body whose only failure mode is an exception, and it was correct while the only callers
 * were `registerParticipant`-style paths that return a refusal without having written anything.
 *
 * It is wrong for a body that performs partial work and then decides to refuse. `reduceEventCapacity`
 * cancels participants before it can evaluate FR-REG-037, so returning `{ ok: false }` at that point
 * COMMITTED the cancellations. The refusal was reported faithfully and the all-or-nothing requirement
 * was violated: two participants were removed from a reduction that never happened.
 *
 * A returned refusal is a business outcome, not an error, so it must not reach the caller as one.
 * Throwing `RollbackSignal` rolls the transaction back and is caught inside `withTransaction`, which
 * then rethrows the body's own value. A business refusal therefore surfaces as a refusal, and the
 * database state matches what the refusal claims.
 */
export class RollbackSignal extends Error {
  /** The value the body returned, handed back to the caller rather than lost. */
  public readonly value: unknown;

  constructor(value: unknown) {
    super("Transaction rolled back by the body via RollbackSignal");
    this.name = "RollbackSignal";
    this.value = value;
  }
}

export interface TransactionOptions {
  /** Defaults to SERIALIZABLE, the isolation level C-02 requires. */
  readonly isolation?: "SERIALIZABLE" | "REPEATABLE READ" | "READ COMMITTED";
  /** Defaults to {@link DEFAULT_RETRY_POLICY}. */
  readonly retry?: RetryPolicy;
  /** Optional label for the retry log line. */
  readonly label?: string;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Run `body` inside one transaction, retrying only SQLSTATE 40001.
 *
 * The client is always released, including on the failure paths. A leaked client exhausts the pool
 * and turns a serialization conflict into an outage.
 *
 * COMMIT SEMANTICS — READ THIS BEFORE ADDING A CALLER
 * A resolved body is COMMITTED. A thrown error is rolled back, except for `RollbackSignal`, which rolls
 * back and resolves to the value the body supplied.
 *
 * So a body that writes and then decides to refuse MUST throw `RollbackSignal` rather than return a
 * refusal. Returning commits the partial work. `reduceEventCapacity` is the case that made this
 * explicit: it cancels participants before evaluating FR-REG-037, so a returned refusal would have
 * committed those cancellations. test/capacity.test.ts asserts the rollback against committed state.
 */
export async function withTransaction<T>(
  pool: Pool,
  body: (client: PoolClient) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> {
  const isolation = options.isolation ?? "SERIALIZABLE";
  const policy = options.retry ?? DEFAULT_RETRY_POLICY;
  const label = options.label ?? "transaction";

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    const client = await pool.connect();
    try {
      await client.query(`BEGIN ISOLATION LEVEL ${isolation}`);
      const result = await body(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      if (error instanceof RollbackSignal) {
        // The body rolled itself back deliberately.
        //
        // The ROLLBACK runs FIRST, and its failure is tolerated. PostgreSQL refuses to roll back a
        // transaction that has already aborted itself with 40001, so a rollback failure here means the
        // transaction is already gone — which is the outcome RollbackSignal wanted. Skipping the
        // rollback would therefore be correct in that case but wrong in every other one, so it is
        // attempted and its error discarded.
        try {
          await client.query("ROLLBACK");
        } catch {
          /* Already aborted by PostgreSQL, or the connection is gone. Either way nothing is pending. */
        }
        // The value the body returned is handed back as an ordinary result. A business refusal is not an
        // error, and it is not retried: re-running it would reach the same answer.
        //
        // `return` rather than `throw`: the `finally` block releases the client on this path, and
        // returning keeps the release in one place instead of duplicating it per outcome.
        return error.value as T;
      }
      // Roll back on a best-effort basis. A failure here means the transaction is already broken
      // (aborted by PostgreSQL, or the connection died), so the error from ROLLBACK is discarded.
      try {
        await client.query("ROLLBACK");
      } catch {
        /* Connection is already unusable; releasing it below discards it. */
      }

      const isLastAttempt = attempt === policy.maxAttempts;
      if (!isSerializationFailure(error) || isLastAttempt) {
        if (isSerializationFailure(error)) {
          throw new SerializationExhaustedError(attempt);
        }
        throw error;
      }

      const delay = policy.backoffMs[attempt - 1] ?? 0;
      await sleep(delay);
      // Only the retry outcome is logged, and it names the policy rather than any row data.
      console.warn(
        `[db] ${label}: SQLSTATE ${SERIALIZATION_FAILURE}, attempt ${attempt}/${policy.maxAttempts}, ` +
          `retrying in ${delay}ms`,
      );
    } finally {
      client.release();
    }
  }

  // Unreachable: the loop either returns or throws. The throw exists so the function's return type
  // is total without a cast.
  throw new SerializationExhaustedError(policy.maxAttempts);
}

export interface PoolOptions {
  /** Maximum pooled connections. Kept small: ERNS is a single university deployment. */
  readonly max?: number;
  /** Connection timeout in milliseconds. */
  readonly connectionTimeoutMillis?: number;
}

/**
 * Build a pool for the application role.
 *
 * `applicationUrl` is deliberately required. There is no default and no fallback to `DATABASE_URL`,
 * because falling back would let a runtime query quietly run as the schema owner and void the
 * audit-log restriction that `test/audit-permission.test.ts` verifies.
 */
export function createAppPool(applicationUrl: string, options: PoolOptions = {}): Pool {
  return new Pool({
    connectionString: applicationUrl,
    max: options.max ?? 10,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 5_000,
  });
}

/**
 * Build a pool for the migration/owner role. Only the migration runner may use this.
 *
 * SECURITY-ARCHITECTURE.md line 380: the application role holds no schema-altering privilege. This
 * pool is the owner's, so nothing in the request path may reference it.
 */
export function createOwnerPool(ownerUrl: string, options: PoolOptions = {}): Pool {
  return new Pool({
    connectionString: ownerUrl,
    max: options.max ?? 2,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 10_000,
  });
}