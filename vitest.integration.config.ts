/**
 * Vitest configuration for the real-PostgreSQL integration suites.
 *
 * FILE PARALLELISM IS DISABLED here and in vitest.config.ts — both configs
 * run test files serially. See vitest.config.ts for the shared rationale;
 * not repeated here to avoid drift.
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
      "test/registration-completion.test.ts",
      "test/session-identity.test.ts",
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