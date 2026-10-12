/**
 * FR-REG-020 — confirmation reference generation.
 *
 * Pure tests, with a scripted entropy source so that every assertion is exact. Generation against the
 * real CSPRNG is covered by the "system entropy" block at the end, which asserts properties rather
 * than exact values.
 */

import { describe, expect, it } from "vitest";

import {
  CONFIRMATION_ALPHABET,
  CONFIRMATION_ALPHABET_SIZE,
  CONFIRMATION_LENGTH,
  CONFIRMATION_SPACE,
  EntropyRangeError,
  encodeConfirmationSymbols,
  entropyFromBytes,
  generateConfirmationReference,
  isWellFormedConfirmationReference,
} from "../src/domain/registration-reference.js";
import { newConfirmationReference } from "../src/db/identifiers.js";

/** A source that returns a fixed sequence of bytes, repeating the last one when exhausted. */
function scriptedEntropy(bytes: readonly number[]): () => number[] {
  let index = 0;
  return () => {
    const drawn: number[] = [];
    for (let i = 0; i < CONFIRMATION_LENGTH; i += 1) {
      drawn.push(bytes[Math.min(index, bytes.length - 1)] ?? 0);
      index += 1;
    }
    return drawn;
  };
}

describe("the confirmation alphabet", () => {
  it("is exactly 32 symbols", () => {
    expect(CONFIRMATION_ALPHABET_SIZE).toBe(32);
    expect(CONFIRMATION_ALPHABET).toHaveLength(32);
  });

  it("is a power of two, which is what makes byte % 32 uniform", () => {
    expect(Number.isInteger(Math.log2(CONFIRMATION_ALPHABET_SIZE))).toBe(true);
    expect(256 % CONFIRMATION_ALPHABET_SIZE).toBe(0);
  });

  it("omits I, L, O and U so handwriting and speech cannot confuse them", () => {
    expect(CONFIRMATION_ALPHABET).not.toContain("I");
    expect(CONFIRMATION_ALPHABET).not.toContain("L");
    expect(CONFIRMATION_ALPHABET).not.toContain("O");
    expect(CONFIRMATION_ALPHABET).not.toContain("U");
  });

  it("contains no duplicates", () => {
    expect(new Set(CONFIRMATION_ALPHABET).size).toBe(32);
  });
});

describe("the reference space", () => {
  it("is 32^8, because every one of the eight positions varies independently", () => {
    expect(CONFIRMATION_LENGTH).toBe(8);
    expect(CONFIRMATION_SPACE).toBe(1_099_511_627_776);
  });
});

describe("encodeConfirmationSymbols", () => {
  it("maps byte 0 to the first symbol and byte 31 to the last", () => {
    expect(encodeConfirmationSymbols([0, 0, 0, 0, 0, 0, 0, 0])).toBe("00000000");
    expect(encodeConfirmationSymbols([31, 31, 31, 31, 31, 31, 31, 31])).toBe("ZZZZZZZZ");
  });

  it("uses EVERY byte independently, so no position is stuck at zero", () => {
    // The regression this guards: an earlier implementation packed a 16-bit value into this alphabet,
    // which filled only the final four characters and produced references like `00007K2M`.
    expect(encodeConfirmationSymbols([31, 0, 31, 0, 31, 0, 31, 0])).toBe("Z0Z0Z0Z0");
    expect(encodeConfirmationSymbols([0, 31, 0, 31, 0, 31, 0, 31])).toBe("0Z0Z0Z0Z");
  });

  it("varies the first character as readily as the last", () => {
    const first = encodeConfirmationSymbols([7, 0, 0, 0, 0, 0, 0, 0]);
    const last = encodeConfirmationSymbols([0, 0, 0, 0, 0, 0, 0, 7]);
    expect(first).toBe("70000000");
    expect(last).toBe("00000007");
    expect(first[0]).not.toBe("0");
    expect(last[0]).toBe("0");
    expect(first[7]).toBe("0");
    expect(last[7]).not.toBe("0");
  });

  it("reduces the byte range onto the alphabet with period 32", () => {
    // byte % 32 is uniform because 32 divides 256, so these are the only residues for symbol 0.
    expect(encodeConfirmationSymbols([32, 32, 32, 32, 32, 32, 32, 32])).toBe("00000000");
    expect(encodeConfirmationSymbols([224, 224, 224, 224, 224, 224, 224, 224])).toBe("00000000");
    // 255 % 32 == 31, the last symbol, which is Z and not V.
    expect(encodeConfirmationSymbols([255, 255, 255, 255, 255, 255, 255, 255])).toBe("ZZZZZZZZ");
  });

  it("walks the alphabet in order as the byte increases", () => {
    const first = encodeConfirmationSymbols([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(first).toBe("01234567");
    const next = encodeConfirmationSymbols([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(next).toBe("89ABCDEF");
  });

  it("rejects a short entropy read", () => {
    // A short read would silently produce a reference with less entropy than its length suggests.
    expect(() => encodeConfirmationSymbols([1, 2, 3])).toThrow(RangeError);
    expect(() => encodeConfirmationSymbols([])).toThrow(RangeError);
  });

  it("rejects an out-of-range byte", () => {
    const bytes = [0, 0, 0, 0, 0, 0, 0, 256];
    expect(() => encodeConfirmationSymbols(bytes)).toThrow(EntropyRangeError);
    const negative = [-1, 0, 0, 0, 0, 0, 0, 0];
    expect(() => encodeConfirmationSymbols(negative)).toThrow(EntropyRangeError);
    const fractional = [0, 0, 0, 0, 0, 0, 0, 1.5];
    expect(() => encodeConfirmationSymbols(fractional)).toThrow(EntropyRangeError);
  });

  it("always produces exactly eight characters", () => {
    for (let i = 0; i < 64; i += 1) {
      const bytes = Array.from({ length: CONFIRMATION_LENGTH }, () => (i * 37) % 256);
      expect(encodeConfirmationSymbols(bytes)).toHaveLength(CONFIRMATION_LENGTH);
    }
  });
});

describe("entropyFromBytes", () => {
  it("draws exactly one byte per character", () => {
    const issued: number[] = [];
    const entropy = entropyFromBytes(() => {
      const next = issued.length;
      issued.push(next);
      return next;
    });
    const drawn = entropy();
    expect(drawn).toHaveLength(CONFIRMATION_LENGTH);
    expect(issued).toHaveLength(CONFIRMATION_LENGTH);
    expect(drawn).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("rejects an out-of-range byte", () => {
    expect(() => entropyFromBytes(() => 256)()).toThrow(EntropyRangeError);
    expect(() => entropyFromBytes(() => -1)()).toThrow(EntropyRangeError);
    expect(() => entropyFromBytes(() => 1.5)()).toThrow(EntropyRangeError);
  });
});

describe("generateConfirmationReference", () => {
  it("produces a well-formed reference from scripted entropy", () => {
    const reference = generateConfirmationReference(scriptedEntropy([171, 205]));
    expect(isWellFormedConfirmationReference(reference)).toBe(true);
  });

  it("maps the first entropy byte to the first character", () => {
    expect(generateConfirmationReference(scriptedEntropy([5, 5, 5, 5, 5, 5, 5, 5]))).toBe("55555555");
    expect(generateConfirmationReference(scriptedEntropy([0, 0, 0, 0, 0, 0, 0, 9]))).toBe("00000009");
  });
});

describe("isWellFormedConfirmationReference", () => {
  it("rejects the wrong length", () => {
    expect(isWellFormedConfirmationReference("")).toBe(false);
    expect(isWellFormedConfirmationReference("1234567")).toBe(false);
    expect(isWellFormedConfirmationReference("123456789")).toBe(false);
  });

  it("rejects a symbol outside the alphabet, including the four omitted letters", () => {
    for (const symbol of ["I", "L", "O", "U", "a", "-", "*", " "]) {
      expect(isWellFormedConfirmationReference(`1234567${symbol}`)).toBe(false);
    }
  });

  it("accepts a string drawn entirely from the alphabet", () => {
    expect(isWellFormedConfirmationReference("01234567")).toBe(true);
    expect(isWellFormedConfirmationReference("ZZZZZZZZ")).toBe(true);
  });

  it("accepts a reference the generator actually produced", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(isWellFormedConfirmationReference(newConfirmationReference())).toBe(true);
    }
  });
});

describe("system entropy — the real generator", () => {
  it("always produces a well-formed eight-character reference", () => {
    for (let i = 0; i < 200; i += 1) {
      const reference = newConfirmationReference();
      expect(reference).toHaveLength(CONFIRMATION_LENGTH);
      expect(isWellFormedConfirmationReference(reference)).toBe(true);
    }
  });

  it("produces distinct references, so it is not a constant or a sequence", () => {
    const generated = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      generated.add(newConfirmationReference());
    }
    expect(generated.size).toBe(200);
  });

  it("uses the whole alphabet, so no position is pinned to a prefix", () => {
    const symbols = new Set<string>();
    for (let i = 0; i < 400; i += 1) {
      for (const character of newConfirmationReference()) {
        symbols.add(character);
      }
    }
    expect(symbols.size).toBe(CONFIRMATION_ALPHABET_SIZE);
  });

  it("varies EVERY position independently, not just the tail", () => {
    // Position-by-position distinctness. A reference whose leading characters never moved would fail
    // this, and that is precisely the defect the packed-value implementation had.
    const perPosition = Array.from({ length: CONFIRMATION_LENGTH }, () => new Set<string>());
    for (let i = 0; i < 400; i += 1) {
      const reference = newConfirmationReference();
      for (let position = 0; position < CONFIRMATION_LENGTH; position += 1) {
        const character = reference[position];
        if (character !== undefined) {
          perPosition[position]?.add(character);
        }
      }
    }

    // Every position must reach the FULL alphabet. A position confined to a prefix or a small subset
    // is the signature of a defect, so the bound is exact in both directions: all 32 symbols observed,
    // and no more than 32 possible. 400 draws make a missing symbol a ~1e-6 event.
    for (const [position, observed] of perPosition.entries()) {
      expect(
        observed.size,
        `position ${position} varied over only ${observed.size} of ${CONFIRMATION_ALPHABET_SIZE} symbols`,
      ).toBe(CONFIRMATION_ALPHABET_SIZE);
    }
  });

  it("does not produce references with a constant prefix", () => {
    // TRIAGE 2026-10-10, TESTING-STRATEGY.md rule 4 (a wrong test is corrected, visibly).
    // The previous version drew 200 references and asserted 200 distinct 4-character prefixes.
    // That assertion is probabilistic, not exact: 200 draws from 32^4 = 1,048,576 prefixes collide
    // with probability ~1.9% per run, so the suite failed about one run in fifty with no code change.
    // Observed once at baseline on 2026-10-10, then 99/99 on five consecutive reruns.
    //
    // The requirement — the prefix varies with the leading entropy rather than being pinned — is now
    // asserted deterministically: two scripted sources differing only in their first byte produce
    // different prefixes. The live-generator smoke below it cannot flake: all 200 draws sharing one
    // prefix has probability (1/32^4)^199, which is zero for engineering purposes.
    const first = generateConfirmationReference(scriptedEntropy([0, 7, 7, 7, 7, 7, 7, 7]));
    const second = generateConfirmationReference(scriptedEntropy([1, 7, 7, 7, 7, 7, 7, 7]));
    expect(first.slice(0, 4)).not.toBe(second.slice(0, 4));

    const prefixes = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      prefixes.add(newConfirmationReference().slice(0, 4));
    }
    expect(prefixes.size).toBeGreaterThan(1);
  });
});