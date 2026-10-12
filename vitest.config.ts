import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // FILE PARALLELISM IS DISABLED. Most suites truncate shared tables in
    // `beforeEach` against one database, so parallel files wipe each other's
    // fixtures (deadlocks, vanishing rows, probe-file leakage into the
    // migration ledger assertions). Same rationale as
    // vitest.integration.config.ts; stated here so the DEFAULT command,
    // `pnpm test`, is green rather than only the integration entry point.
    // Within a file, tests still run sequentially and the concurrency suites
    // open their own connections, so CON-01/CON-02 coverage is unaffected.
    fileParallelism: false,
  },
});