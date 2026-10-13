/**
 * MVP T8 (issue #9) — no student account-creation path outside the import.
 *
 * Static structural assertion, runs WITHOUT a database: the only production
 * modules that may write account or role rows are the import use case and
 * its persistence. Test fixtures (test/db-harness.ts) seed rows as the
 * owner and are not a product path.
 *
 * Issue #9 acceptance criterion: "No student account-creation path exists
 * outside this import" (MVP story 33: no self-service path).
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");

const ALLOWED_WRITERS = new Set([
  join("db", "student-import-persistence.ts"),
  join("l4", "import-students.ts"),
]);

async function productionSources(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await productionSources(full, out);
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("no account-creation path outside the Administrator import", () => {
  it("only the import modules write account or role rows", async () => {
    const offenders: string[] = [];
    for (const file of await productionSources(SRC)) {
      const contents = await readFile(file, "utf8");
      if (/INSERT INTO erns\.(app_user|user_role)/.test(contents)) {
        const relative = file.slice(SRC.length + 1);
        if (!ALLOWED_WRITERS.has(relative)) {
          offenders.push(relative);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
