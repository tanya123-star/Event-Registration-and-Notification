/**
 * Migration CLI.
 *
 * Usage: pnpm db:migrate
 *
 * Runs `up(pool)` with the owner connection and prints what happened. Forward only: there is no
 * `--down`, deliberately, because no down-migration exists and PB-ENG-14 requires a tested rollback
 * path before one may be claimed. A `--rollback` flag would print the reason rather than perform
 * anything, so that a habit of typing it produces an explanation instead of a false success.
 *
 * THE SCRIPT RUNS THE COMPILED OUTPUT, NOT THIS SOURCE. `node --experimental-strip-types src/db/cli.ts`
 * fails, because the source uses NodeNext-style `./client.js` import specifiers (required by
 * `tsconfig.json` and correct for the compiled output) and Node's type-stripping does not rewrite a
 * `.js` specifier to the `.ts` file beside it. `pnpm db:build` compiles to `dist/`, where those
 * specifiers resolve. Compiling before migrating is also what PB-ENG-14 implies: a migration is run
 * from a build, not from whatever is in the working tree.
 *
 * ERNS_APP_URL is never read here. SECURITY-ARCHITECTURE.md line 380 requires the application role to
 * hold no schema-altering privilege, so nothing on this path may touch it.
 */

import { createOwnerPool } from "./client.js";
import { up } from "./migrate.js";

async function main(): Promise<void> {
  const ownerUrl = process.env["ERNS_DATABASE_URL"];
  if (ownerUrl === undefined) {
    console.error(
      "ERNS_DATABASE_URL is not set. Copy .env.example to .env and set it, or export it.\n" +
        "Migrations run as the schema owner; see docker/postgres-init/01-roles.sql.",
    );
    process.exitCode = 1;
    return;
  }

  if (process.argv.includes("--rollback")) {
    console.error(
      "Rollback is not implemented.\n" +
        "This migration runner is forward-only. PB-ENG-14-DATABASE-CHANGES.md requires a documented " +
        "and tested rollback path, and none exists for the migrations applied so far. Do not report " +
        "rollback support until one does.",
    );
    process.exitCode = 1;
    return;
  }

  const pool = createOwnerPool(ownerUrl);
  try {
    const result = await up(pool);
    if (result.applied.length === 0) {
      console.log(`No pending migrations. Already applied: ${result.alreadyApplied.join(", ")}`);
    } else {
      console.log(`Applied: ${result.applied.join(", ")}`);
      if (result.alreadyApplied.length > 0) {
        console.log(`Already applied: ${result.alreadyApplied.join(", ")}`);
      }
    }
  } finally {
    await pool.end();
  }
}

await main();