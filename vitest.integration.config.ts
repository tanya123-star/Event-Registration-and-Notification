/**
 * Vitest configuration for the real-PostgreSQL integration suites.
 *
 * Separate from vitest.config.ts for one reason: FILE PARALLELISM IS DISABLED.
 *
 * schema.test.ts, audit-permission.test.ts, concurrency.test.ts and migration.test.ts all call
 * `truncateAll()` in `beforeEach`. Vitest runs test FILES in parallel worker processes by default, so
 * with parallelism on, one file's `TRUNCATE` lands in the middle of another file's test. The symptom is
 * a row count of 0 where 1 was expected — a failure caused by the harness, not by the code under test,
 * and one that would make a real regression indistinguishable from a race.
 *
 * Within a file, tests still run sequentially, and the concurrency tests open their own dedicated
 * connections, so CON-01 and CON-02 continue to exercise genuine parallel database sessions. Disabling
 * file parallelism removes inter-file interference without weakening the concurrency coverage.
 *
 * Migrations are additionally guarded by a PostgreSQL advisory lock in test/db-harness.ts, so the
 * serialisation holds even if this file is later run alongside another project.
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The list is explicit rather than a `test/integration-*.test.ts` glob, because the two conventions
    // disagree about which files are integration tests. Explicit inclusion means a new database test is
    // added here deliberately, and a pure test added to `test/` is not silently run against a database
    // it does not need.
    include: [
      "test/schema.test.ts",
      "test/audit-permission.test.ts",
      "test/concurrency.test.ts",
      "test/migration.test.ts",
      "test/capacity.test.ts",
      "test/register-participant.test.ts",
      "test/capacity-concurrency.test.ts",
      "test/negative-boundaries.test.ts",
      "test/cancel-registration.test.ts",
      "test/create-event.test.ts",
      "test/registration-reads.test.ts",
      "test/api-operations.test.ts",
      "test/registration-open.test.ts",
    ],
    // Ordered, because test/concurrency.test.ts and test/capacity-concurrency.test.ts both
    // demonstrate CON-04 from different angles: one via hand-rolled SQL to show what SERIALIZABLE can
    // and cannot protect, the other through the L4 use cases that enforce FR-REG-037.
    environment: "node",
    fileParallelism: false,
    // Each file builds its own pools; a longer timeout accommodates the advisory lock and the
    // container's first-run overhead.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    teardownTimeout: 15_000,
  },
});