/**
 * MVP T11 (issue #12) — mock SMS adapter seam, boundary proof only.
 *
 * Seams under test: the SMS send port and its mock implementation.
 *
 * Vocabulary per GLOSSARY.md: Notification (SMS is never the record, only a
 * future delivery layer beside email).
 *
 * Requirements covered:
 *   - MVP-SPEC.md line 101/106: port plus mock implementation, wired to
 *     nothing in the MVP; interface plus mock only, no MVP send path calls it.
 *   - PROJECT-GUIDELINES.md section 6: port plus mock only; nothing calls it.
 *   - INTEGRATION-BOUNDARIES.md BR rules: minimum data sent (recipient plus
 *     body only — never registration context, attendance or profile fields,
 *     mirroring the IB-1 row), failures as values not exceptions.
 *   - SMS sending deferred (MVP-SPEC.md decision 10): no provider, no
 *     credentials, no network calls, no delivery guarantees.
 *
 * Issue #12 acceptance criteria:
 *   - mock records sends in memory for future tests
 *   - no MVP path imports or calls the seam (static test below)
 *   - swapping mock for a real adapter touches exactly one binding
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  mockSmsAdapter,
  smsSendPort,
} from "../src/messaging/sms-binding.js";
import { MockSmsAdapter } from "../src/messaging/mock-sms-adapter.js";

describe("mock SMS adapter (issue #12)", () => {
  it("records sends in memory for future tests", async () => {
    const adapter = new MockSmsAdapter();
    const result = await adapter.send({ to: "+10000000001", body: "Doors open at nine" });
    expect(result).toEqual({ ok: true });
    expect(adapter.sentMessages()).toEqual([
      { to: "+10000000001", body: "Doors open at nine" },
    ]);
  });

  it("clears the recorded sends", async () => {
    const adapter = new MockSmsAdapter();
    await adapter.send({ to: "+10000000001", body: "One" });
    adapter.clear();
    expect(adapter.sentMessages()).toEqual([]);
  });

  it("binds the port to the mock singleton: one binding to swap", async () => {
    expect(smsSendPort).toBe(mockSmsAdapter);
    await smsSendPort.send({ to: "+10000000002", body: "Via the binding" });
    expect(mockSmsAdapter.sentMessages()).toEqual([
      { to: "+10000000002", body: "Via the binding" },
    ]);
    mockSmsAdapter.clear();
  });
});

const SRC = join(import.meta.dirname, "..", "src");

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

describe("SMS seam stays unwired in the MVP (issue #12)", () => {
  it("no production module outside src/messaging imports the seam", async () => {
    const offenders: string[] = [];
    for (const file of await productionSources(SRC)) {
      const relative = file.slice(SRC.length + 1);
      if (relative.startsWith(`messaging${join("")}`) || relative.startsWith("messaging/")) {
        continue;
      }
      const contents = await readFile(file, "utf8");
      if (/messaging\/(sms-port|mock-sms-adapter|sms-binding)/.test(contents)) {
        offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the mock is constructed in exactly one production binding", async () => {
    const constructions: string[] = [];
    for (const file of await productionSources(SRC)) {
      const contents = await readFile(file, "utf8");
      if (/new MockSmsAdapter\(\)/.test(contents)) {
        constructions.push(file.slice(SRC.length + 1));
      }
    }
    expect(constructions).toEqual([join("messaging", "sms-binding.ts")]);
  });
});
