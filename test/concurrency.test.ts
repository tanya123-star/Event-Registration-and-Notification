/**
 * CON-01, CON-02, CON-04 and TST-09 — concurrent registration behaviour against real PostgreSQL.
 *
 * REQUIRES POSTGRESQL. Skipped explicitly when the URL variables are unset; a skipped run leaves
 * concurrency UNVERIFIED and must not be reported as passing.
 *
 * TESTING-STRATEGY.md lines 126-127 are the reason this file exists:
 *   "Only a real storage layer against concurrent clients demonstrates the guarantee. A unit test
 *   with a mocked database cannot demonstrate either."
 *
 * HOW VACUITY IS AVOIDED. Three things are done deliberately, because each would make these tests
 * pass without proving anything:
 *
 *   1. SEPARATE CONNECTIONS. Every concurrent actor gets its own `pg.Client`. Vitest's transaction
 *      helpers and any shared single connection would serialise the two actors and CON-01 would pass
 *      trivially.
 *   2. REAL COMMITS. Both transactions reach `COMMIT`. A test that never commits, or that rolls back,
 *      demonstrates nothing about the constraint.
 *   3. BOTH ACTORS ACTUALLY OVERLAP. Each actor reads, then awaits a barrier, then writes. Without
 *      the barrier the second actor would begin after the first commits and never contend.
 *
 * TST-09 — "Capacity check moves outside the transaction | CON-01 fails" — is proved by building a
 * deliberately unsafe writer whose capacity check runs on a READ COMMITTED connection BEFORE opening
 * the SERIALIZABLE transaction, and asserting that it produces two registrations for one slot. That
 * is the mutation witness: it shows the safety depends on the capacity read being inside the
 * transaction.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Client } from "pg";
import type { Pool } from "pg";

import {
  UNIQUE_VIOLATION,
  appUrl,
  createAppPoolForTests,
  applyMigrationsOnce,
  createOwnerPoolForTests,
  isDatabaseConfigured,
  ownerUrl,
  seedEvent,
  seedUser,
  skipReason,
  truncateAll,
} from "./db-harness.js";
import {
  DEFAULT_RETRY_POLICY,
  SerializationExhaustedError,
  isSerializationFailure,
  withTransaction,
} from "../src/db/client.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/concurrency.test.ts — ${skipReason()}\n`);
}

/** A one-shot barrier. Both actors await it, so both are inside their transaction at the same time. */
class Barrier {
  private waiting = 0;
  private released = false;
  private readonly promise: Promise<void>;
  private resolveFn!: () => void;

  constructor(private readonly parties: number) {
    this.promise = new Promise<void>((resolve) => {
      this.resolveFn = resolve;
    });
  }

  async wait(): Promise<void> {
    this.waiting += 1;
    if (this.waiting >= this.parties) {
      this.released = true;
      this.resolveFn();
    }
    await this.promise;
  }

  get wasReleased(): boolean {
    return this.released;
  }
}

/** Connect a dedicated client. Each concurrent actor needs its own. */
async function connectActor(): Promise<Client> {
  const url = appUrl();
  if (url === undefined) {
    throw new Error("ERNS_APP_URL is not set");
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

/**
 * The registration write, exactly as an L4 handler would perform it: a check-then-write inside one
 * SERIALIZABLE transaction.
 *
 * The capacity count and the duplicate check are both READ INSIDE the transaction. That placement is
 * the whole point, and TST-09 below proves it.
 */
async function registerInTransaction(
  client: Client,
  userId: string,
  eventId: string,
  barrier?: Barrier,
): Promise<{ ok: boolean; sqlstate?: string }> {
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  try {
    // Step 7: capacity. Read inside the transaction.
    const capacityResult = await client.query<{ capacity: number | null }>(
      `SELECT capacity FROM erns.event WHERE event_id = $1`,
      [eventId],
    );
    const capacity = capacityResult.rows[0]?.capacity ?? null;

    if (capacity !== null) {
      const countResult = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.registration
          WHERE event_id = $1 AND status = 'REGISTERED'`,
        [eventId],
      );
      const current = Number(countResult.rows[0]?.count ?? "0");
      if (current >= capacity) {
        await client.query("ROLLBACK");
        return { ok: false };
      }
    }

    // Step 8: duplicate. Also read inside the transaction.
    const duplicate = await client.query(
      `SELECT 1 FROM erns.registration WHERE user_id = $1 AND event_id = $2 AND status = 'REGISTERED'`,
      [userId, eventId],
    );
    if ((duplicate.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      return { ok: false };
    }

    // Hold the transaction open so both actors overlap before either writes.
    if (barrier !== undefined) {
      await barrier.wait();
    }

    await client.query(
      `INSERT INTO erns.registration (user_id, event_id, registration_source, confirmation_reference)
       VALUES ($1, $2, 'SELF', $3)`,
      [userId, eventId, `REF-${crypto.randomUUID()}`],
    );
    await client.query("COMMIT");
    return { ok: true };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* Connection already broken. */
    }
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;
    // A unique violation means the partial index caught a race the read missed. A serialization
    // failure means the isolation level caught it. Both are correct outcomes; the caller retries.
    if (code === UNIQUE_VIOLATION || code === "40001") {
      return { ok: false, sqlstate: code };
    }
    throw error;
  }
}

describe.skipIf(!configured)("concurrency, real PostgreSQL", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createOwnerPoolForTests();
    await applyMigrationsOnce(pool);
  });

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await pool?.end();
  });

  describe("the harness is not vacuous", () => {
    it("two actors really do hold open transactions at the same time", async () => {
      // If this fails, the concurrency tests below prove nothing, because the actors would not have
      // overlapped.
      const userId = await seedUser(pool);
      const eventId = await seedEvent(pool, { capacity: 2 });

      const first = await connectActor();
      const second = await connectActor();
      try {
        const barrier = new Barrier(2);
        const results = await Promise.all([
          registerInTransaction(first, userId, eventId, barrier),
          registerInTransaction(second, userId, eventId, barrier),
        ]);
        expect(barrier.wasReleased).toBe(true);
        expect(results).toHaveLength(2);
      } finally {
        await first.end();
        await second.end();
      }
    });

    it("two actors really do use two distinct server connections", async () => {
      const first = await connectActor();
      const second = await connectActor();
      try {
        const [{ rows: a }, { rows: b }] = await Promise.all([
          first.query<{ pid: number }>("SELECT pg_backend_pid() AS pid"),
          second.query<{ pid: number }>("SELECT pg_backend_pid() AS pid"),
        ]);
        expect(a[0]?.pid).not.toBe(b[0]?.pid);
      } finally {
        await first.end();
        await second.end();
      }
    });
  });

  describe("CON-02 — two simultaneous registrations by the same student: exactly one succeeds", () => {
    it("admits one row when the same user registers twice concurrently", async () => {
      const userId = await seedUser(pool);
      const eventId = await seedEvent(pool, { capacity: 100 });

      const first = await connectActor();
      const second = await connectActor();
      try {
        const barrier = new Barrier(2);
        const results = await Promise.all([
          registerInTransaction(first, userId, eventId, barrier),
          registerInTransaction(second, userId, eventId, barrier),
        ]);

        const succeeded = results.filter((r) => r.ok);
        expect(succeeded).toHaveLength(1);

        const { rows } = await pool.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM erns.registration
            WHERE user_id = $1 AND event_id = $2 AND status = 'REGISTERED'`,
          [userId, eventId],
        );
        expect(rows[0]?.count).toBe("1");
      } finally {
        await first.end();
        await second.end();
      }
    });
  });

  describe("CON-01 — two simultaneous registrations for the last slot: exactly one succeeds", () => {
    it("admits one row when two different users race for one remaining place", async () => {
      // Capacity 1 with a pre-existing registration would be simpler, but a fresh event with
      // capacity 1 is equivalent and does not depend on a seed row being counted correctly.
      const eventId = await seedEvent(pool, { capacity: 1 });
      const firstUser = await seedUser(pool);
      const secondUser = await seedUser(pool);

      const first = await connectActor();
      const second = await connectActor();
      try {
        const barrier = new Barrier(2);
        const results = await Promise.all([
          registerInTransaction(first, firstUser, eventId, barrier),
          registerInTransaction(second, secondUser, eventId, barrier),
        ]);

        const succeeded = results.filter((r) => r.ok);
        expect(succeeded).toHaveLength(1);

        const { rows } = await pool.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM erns.registration
            WHERE event_id = $1 AND status = 'REGISTERED'`,
          [eventId],
        );
        expect(rows[0]?.count).toBe("1");
      } finally {
        await first.end();
        await second.end();
      }
    });

    it("never exceeds capacity across ten concurrent writers for one slot", async () => {
      const eventId = await seedEvent(pool, { capacity: 1 });
      const users: string[] = [];
      for (let i = 0; i < 10; i += 1) {
        users.push(await seedUser(pool));
      }

      const actors: Client[] = [];
      try {
        for (let i = 0; i < 10; i += 1) {
          actors.push(await connectActor());
        }
        const barrier = new Barrier(10);
        await Promise.all(
          actors.map((actor, index) =>
            registerInTransaction(actor, users[index] as string, eventId, barrier),
          ),
        );
      } finally {
        await Promise.all(actors.map((actor) => actor.end()));
      }

      const { rows } = await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.registration
          WHERE event_id = $1 AND status = 'REGISTERED'`,
        [eventId],
      );
      expect(rows[0]?.count).toBe("1");
    });
  });

describe("CON-04 — MOVED, AND WHY", () => {
    /**
     * TEST HISTORY, RECORDED PER THE PROJECT OWNER'S DIRECTION.
     *
     * The first milestone carried three tests here under a `CON-04` heading. One was named
     * "documents the gap: a reduction to 1 admits an overfill the schema cannot prevent", and it asserted
     * that TWO registrations were committed against capacity 1. It passed.
     *
     * A passing test over the violating behaviour is a trap: it reads as evidence that the overfill is
     * acceptable. It has been replaced by regression tests asserting that the invariant IS preserved,
     * which now live in test/capacity-concurrency.test.ts. They exercise `reduceEventCapacity` and
     * `registerParticipant` — the code that enforces FR-REG-037 — rather than hand-rolled SQL, and they
     * assert the final committed database state.
     *
     * WHAT SURVIVES HERE IS TRUE ABOUT POSTGRESQL, not a gap in ERNS.
     *
     * A transaction that writes WITHOUT reading `event` has no read-write dependency, so SERIALIZABLE
     * correctly permits it. That is the limit of the isolation level, and it is precisely why the L4 use
     * case reads capacity inside its transaction: the read is what arms the protection. The test below
     * demonstrates the limit so that the design decision it motivated stays visible.
     */

    it("a bare INSERT with no capacity read is not protected, which is why the read is mandatory", async () => {
      const eventId = await seedEvent(pool, { capacity: 1 });
      const firstUser = await seedUser(pool);
      const secondUser = await seedUser(pool);

      // A participant registers properly, taking the single slot.
      const solo = await connectActor();
      try {
        expect((await registerInTransaction(solo, firstUser, eventId)).ok).toBe(true);
      } finally {
        await solo.end();
      }

      // A raw INSERT that reads nothing. No dependency, so nothing to abort it.
      const unguarded = await connectActor();
      try {
        await unguarded.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
        await unguarded.query(
          `INSERT INTO erns.registration (user_id, event_id, registration_source, confirmation_reference)
           VALUES ($1, $2, 'SELF', $3)`,
          [secondUser, eventId, `REF-${crypto.randomUUID()}`],
        );
        await unguarded.query("COMMIT");
      } finally {
        await unguarded.end();
      }

      // Two rows against capacity 1. Permitted here precisely because nothing read the capacity.
      // `reduceEventCapacity` refuses the equivalent operation under FR-REG-037; see
      // test/capacity-concurrency.test.ts for that assertion.
      const { rows } = await pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.registration
          WHERE event_id = $1 AND status = 'REGISTERED'`,
        [eventId],
      );
      expect(Number(rows[0]?.count ?? "0")).toBe(2);
    });
  });
  describe("TST-09 — moving the capacity check outside the transaction breaks CON-01", () => {
    /**
     * The deliberate defect. The capacity count is taken on a READ COMMITTED connection BEFORE the
     * SERIALIZABLE transaction opens, so it is not part of the serialization graph and does not
     * protect the write.
     */
    async function registerWithCapacityCheckOutsideTransaction(
      check: Client,
      client: Client,
      userId: string,
      eventId: string,
      barrier?: Barrier,
    ): Promise<{ ok: boolean }> {
      // THE DEFECT, in two parts.
      //
      // (a) The capacity count is taken on a DIFFERENT CONNECTION, in its own committed
      //     transaction, before the write transaction does anything. That read is therefore outside
      //     the serialization graph of the write and cannot protect it.
      //
      //     `check` is passed in rather than created here: `Client` cannot be reconnected once
      //     connected, so the helper takes both connections from the caller.
      //
      // (b) The write transaction is SERIALIZABLE but has already committed nothing and read nothing
      //     relevant, so there is no read-write dependency that would force PostgreSQL to abort it.
      const countResult = await check.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM erns.registration
          WHERE event_id = $1 AND status = 'REGISTERED'`,
        [eventId],
      );
      const current = Number(countResult.rows[0]?.count ?? "0");
      const capacityResult = await check.query<{ capacity: number | null }>(
        `SELECT capacity FROM erns.event WHERE event_id = $1`,
        [eventId],
      );
      const capacity = capacityResult.rows[0]?.capacity ?? null;

      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      try {
        if (capacity !== null && current >= capacity) {
          await client.query("ROLLBACK");
          return { ok: false };
        }
        if (barrier !== undefined) {
          await barrier.wait();
        }
        await client.query(
          `INSERT INTO erns.registration (user_id, event_id, registration_source, confirmation_reference)
           VALUES ($1, $2, 'SELF', $3)`,
          [userId, eventId, `REF-${crypto.randomUUID()}`],
        );
        await client.query("COMMIT");
        return { ok: true };
      } catch {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* already broken */
        }
        return { ok: false };
      }
    }

    it("produces two registrations for one slot, which is the failure CON-01 forbids", async () => {
      // THE WITNESS. CON-01 passes above because the capacity read happens INSIDE the transaction.
      // This test removes only that property and asserts the invariant is then violated, which is what
      // makes the passing result above attributable to the transaction boundary rather than to luck.
      //
      // Two users race for one slot. Four connections: two for the outside check, two for the write.
      const eventId = await seedEvent(pool, { capacity: 1 });
      const firstUser = await seedUser(pool);
      const secondUser = await seedUser(pool);

      const checkA = await connectActor();
      const writeA = await connectActor();
      const checkB = await connectActor();
      const writeB = await connectActor();
      try {
        const barrier = new Barrier(2);
        const results = await Promise.all([
          registerWithCapacityCheckOutsideTransaction(checkA, writeA, firstUser, eventId, barrier),
          registerWithCapacityCheckOutsideTransaction(checkB, writeB, secondUser, eventId, barrier),
        ]);

        // Both writers' capacity checks ran before either wrote, so both saw count=0 against
        // capacity=1 and both concluded a slot was free.
        const succeeded = results.filter((r) => r.ok).length;
        expect(succeeded).toBe(2);

        const { rows } = await pool.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM erns.registration
            WHERE event_id = $1 AND status = 'REGISTERED'`,
          [eventId],
        );
        // The violation CON-01 forbids: two registrations against one slot.
        expect(Number(rows[0]?.count ?? "0")).toBe(2);
      } finally {
        await checkA.end();
        await writeA.end();
        await checkB.end();
        await writeB.end();
      }
    });
  });

  describe("the 40001 retry policy", () => {
    it("retries a serialization failure and can succeed", async () => {
      let attempts = 0;
      const result = await withTransaction(
        pool,
        async () => {
          attempts += 1;
          if (attempts < 2) {
            const error = new Error("simulated serialization failure") as Error & { code: string };
            error.code = "40001";
            throw error;
          }
          return "committed";
        },
        { label: "retry-test" },
      );

      expect(result).toBe("committed");
      expect(attempts).toBe(2);
    });

    it("does NOT retry a check violation", async () => {
      // A 23514 is a deterministic statement about the data. Retrying it would cost latency and hide
      // the conflict from the caller.
      let attempts = 0;
      const error = new Error("simulated check violation") as Error & { code: string };
      error.code = "23514";

      await expect(
        withTransaction(pool, async () => {
          attempts += 1;
          throw error;
        }),
      ).rejects.toThrow("simulated check violation");
      expect(attempts).toBe(1);
    });

    it("does NOT retry a unique violation", async () => {
      let attempts = 0;
      const error = new Error("simulated unique violation") as Error & { code: string };
      error.code = "23505";

      await expect(
        withTransaction(pool, async () => {
          attempts += 1;
          throw error;
        }),
      ).rejects.toThrow("simulated unique violation");
      expect(attempts).toBe(1);
    });

    it("gives up after the documented bound and reports the attempt count", async () => {
      let attempts = 0;
      const fail = async (): Promise<never> => {
        attempts += 1;
        const error = new Error("always conflicts") as Error & { code: string };
        error.code = "40001";
        throw error;
      };

      await expect(
        withTransaction(pool, fail, { retry: { maxAttempts: 3, backoffMs: [1, 2] } }),
      ).rejects.toBeInstanceOf(SerializationExhaustedError);
      expect(attempts).toBe(3);
    });

    it("the default policy is bounded at 3 attempts", () => {
      expect(DEFAULT_RETRY_POLICY.maxAttempts).toBe(3);
      expect(DEFAULT_RETRY_POLICY.backoffMs).toEqual([50, 100]);
    });

    it("identifies only 40001 as a serialization failure", () => {
      const serialization = Object.assign(new Error("x"), { code: "40001" });
      const check = Object.assign(new Error("x"), { code: "23514" });
      const unique = Object.assign(new Error("x"), { code: "23505" });
      expect(isSerializationFailure(serialization)).toBe(true);
      expect(isSerializationFailure(check)).toBe(false);
      expect(isSerializationFailure(unique)).toBe(false);
      expect(isSerializationFailure(new Error("no code"))).toBe(false);
    });

    it("commits a real transaction through the helper", async () => {
      const userId = await seedUser(pool, { email: `helper-${crypto.randomUUID()}@example.test` });
      const result = await withTransaction(pool, async (client) => {
        const { rows } = await client.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM erns.app_user WHERE user_id = $1`,
          [userId],
        );
        return Number(rows[0]?.count ?? "0");
      });
      expect(result).toBe(1);
    });

    it("releases its client after a failure, so the pool is not exhausted", async () => {
      const before = pool.totalCount;
      const beforeIdle = pool.idleCount;
      for (let i = 0; i < 6; i += 1) {
        await expect(
          withTransaction(pool, async () => {
            throw new Error("deliberate");
          }),
        ).rejects.toThrow("deliberate");
      }
      expect(pool.totalCount).toBe(before);
      expect(pool.idleCount).toBeGreaterThanOrEqual(beforeIdle);
    });
  });
});

describe("pool construction requires an explicit URL", () => {
  it("createAppPoolForTests throws when ERNS_APP_URL is absent", async () => {
    // A fallback to ERNS_DATABASE_URL would let a runtime query run as the schema owner and void the
    // audit restriction verified in test/audit-permission.test.ts.
    const previous = process.env["ERNS_APP_URL"];
    delete process.env["ERNS_APP_URL"];
    try {
      expect(() => createAppPoolForTests()).toThrow("ERNS_APP_URL is not set");
    } finally {
      if (previous !== undefined) {
        process.env["ERNS_APP_URL"] = previous;
      }
    }
  });

  it("createOwnerPoolForTests throws when ERNS_DATABASE_URL is absent", () => {
    const previous = process.env["ERNS_DATABASE_URL"];
    delete process.env["ERNS_DATABASE_URL"];
    try {
      expect(() => createOwnerPoolForTests()).toThrow("ERNS_DATABASE_URL is not set");
    } finally {
      if (previous !== undefined) {
        process.env["ERNS_DATABASE_URL"] = previous;
      }
    }
  });

  it("isDatabaseConfigured requires both URLs, not one", () => {
    const previousOwner = process.env["ERNS_DATABASE_URL"];
    const previousApp = process.env["ERNS_APP_URL"];
    try {
      process.env["ERNS_DATABASE_URL"] = "postgresql://owner@localhost/erns";
      delete process.env["ERNS_APP_URL"];
      expect(isDatabaseConfigured()).toBe(false);

      delete process.env["ERNS_DATABASE_URL"];
      process.env["ERNS_APP_URL"] = "postgresql://app@localhost/erns";
      expect(isDatabaseConfigured()).toBe(false);
    } finally {
      if (previousOwner === undefined) delete process.env["ERNS_DATABASE_URL"];
      else process.env["ERNS_DATABASE_URL"] = previousOwner;
      if (previousApp === undefined) delete process.env["ERNS_APP_URL"];
      else process.env["ERNS_APP_URL"] = previousApp;
    }
  });

  it("the URL accessors are pure reads of the environment", () => {
    expect(appUrl()).toBe(process.env["ERNS_APP_URL"]);
    expect(ownerUrl()).toBe(process.env["ERNS_DATABASE_URL"]);
  });
});
