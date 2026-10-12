import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * ERNS layer boundary enforcement.
 *
 * The layer model is from docs/architecture/SYSTEM-ARCHITECTURE.md section 2.1:
 *
 *   L5 Presentation  MUST NOT decide whether an action is permitted, hold business
 *                     rules, or write data.
 *   L3 Domain        MUST NOT perform I/O, know that a database exists, or read a session.
 *
 * SYSTEM-ARCHITECTURE.md section 2.2 states that for a single process the layer
 * boundaries "remain internal contracts", so these rules ARE the contract. Under a
 * monorepo the package boundary made a layer violation impossible to compile; here it is
 * enforced by lint. Per PB-ENG-09 this is a required CI check, and section 5 states
 * "No exception exists for disabling a check".
 */

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", ".next/**", "coverage/**", "next-env.d.ts"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // `.tsx` is included so that Route Handler and component files get the same Node globals as
    // `.ts` files. Without this glob, a `src/app/**/*.tsx` file would match the L5 boundary block
    // below (which does list `.tsx`) but would NOT receive the `globals.node` language options
    // defined here, leaving browser globals implicitly available in server code.
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { ecmaVersion: 2023, sourceType: "module" },
    },
  },

  /**
   * L3 Domain — pure logic.
   * No external dependency of any kind may be imported. This makes I/O, a database
   * connection, a session read and a network call all impossible rather than discouraged.
   */
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "pg", message: "L3 domain must not perform I/O (SYSTEM-ARCHITECTURE.md 2.1)." },
            { name: "node:*", message: "L3 domain must not perform I/O (SYSTEM-ARCHITECTURE.md 2.1)." },
            { name: "next/*", message: "L3 domain must not know about rendering (SYSTEM-ARCHITECTURE.md 2.1)." },
            { name: "express", message: "L3 domain must not know about transport (SYSTEM-ARCHITECTURE.md 2.1)." },
          ],
          patterns: [
            {
              group: ["pg", "pg-*", "next", "next-*", "express", "node:*"],
              message: "L3 domain must import nothing external. It is pure logic.",
            },
          ],
        },
      ],
    },
  },

  /**
   * L5 Presentation — the Next.js surface.
   * This is the NFR-SEC-004 enforcement point. An interface must not hide a control the
   * server would still permit, so L5 may not reach the database or the persistence layer.
   * Route handlers under src/app/api belong to L4 and are therefore not restricted.
   */
  {
    files: ["src/app/**/*.ts", "src/app/**/*.tsx"],
    ignores: ["src/app/api/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["pg", "pg-*", "**/db", "**/db/*"],
              message:
                "L5 must not write data (SYSTEM-ARCHITECTURE.md 2.1). Access the database from L4 only.",
            },
          ],
        },
      ],
    },
  },
);