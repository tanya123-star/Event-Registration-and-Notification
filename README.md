# Event Registration and Notification System

ERNS. University event registration, approval, notification, and attendance.

The design is documented in [`docs/`](docs/README.md). This file covers how to run the code that
exists today.

**Status.** Two milestones complete. Registration validation and the initial persistence schema, then the
L4 registration and capacity invariants. No route handler, no authentication, and no email delivery
exists. See §12 of [`PROJECT-OWNER-DECISIONS.md`](docs/architecture/PROJECT-OWNER-DECISIONS.md) for what
was built, what was deliberately left out, and what remains open.

**ERNS is currently headless — there is no web framework and no user interface.** No `next`, no
`react`, no `app/` directory, and no `.tsx` file exists in this repository. What is here is a pure domain
layer, a PostgreSQL persistence layer, and two application use cases, covered by 264 tests. The
architecture records an intent to use Next.js Route Handlers, but that framework has not been installed:
the questions that gate any user-facing surface (institutional identity, OQ-45; hosting, OQ-30) are
still open. See §8.1 of the decision record for the full reasoning, the requirements a future framework
milestone will have to meet, and the unresolved choice between framework major versions.

## Requirements

Node.js 24 (24.21.0 installed) and pnpm 11. PostgreSQL 17, provided by Docker Compose for local
development.

## Commands

| Command | Purpose |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint, including the L3/L5 layer-boundary rules |
| `pnpm test:unit` | Pure tests. No database needed |
| `pnpm test:integration` | Real-PostgreSQL tests |
| `pnpm test` | Everything. Database tests **skip** if no database is configured |
| `pnpm db:up` | Start PostgreSQL 17 in Docker |
| `pnpm db:down` | Stop it |
| `pnpm build` | Compile to `dist/` |
| `pnpm db:migrate` | Build, then apply pending migrations |
| `pnpm db:rollback` | Prints that rollback is not implemented, and exits non-zero |

## Database setup

```sh
pnpm db:up
```

Roles are provisioned by [`docker/postgres-init/01-roles.sql`](docker/postgres-init/01-roles.sql) on
first start. Two roles exist deliberately:

- `erns_owner` — `NOLOGIN`, owns the schema. Used only for migrations.
- `erns_app` — `LOGIN`, the minimum privilege the application needs.

The separation is required by `NFR-SEC-015` and `SECURITY-ARCHITECTURE.md` §9.2, and is what makes the
audit-log immutability guarantee structural rather than conventional. A PostgreSQL owner can always
alter the tables it owns, so a `REVOKE` from a role that owns `audit_log` would be meaningless.

To run the integration tests, point two variables at that database:

```sh
export ERNS_DATABASE_URL="postgresql://postgres:localdev_only@127.0.0.1:5432/erns"
export ERNS_APP_URL="postgresql://erns_app:localdev_app_only@127.0.0.1:5432/erns"
pnpm test:integration
```

These are local container credentials bound to `127.0.0.1`, committed on purpose so a fresh clone
works. They are not credentials for any shared environment. See
[`.env.example`](.env.example) and `PB-ENG-12`.

**Without these variables the database tests skip, and skipped means not verified.** They print a
reason naming the missing variable. A skipped test is never counted as passing, and no report may
describe such a run as having verified the constraints.

## Migrations

SQL lives in [`src/db/schema/`](src/db/schema) and is applied in filename order.

**The runner is forward-only.** `rollback()` throws, and `pnpm db:rollback` prints why and exits
non-zero. `PB-ENG-14` requires a documented *and tested* rollback path; none exists, so none is
claimed.

Migrations run from `dist/`, not from the TypeScript source. The source uses NodeNext-style `./x.js`
import specifiers, which Node's type-stripping does not resolve to the neighbouring `.ts` file, so a
migration is always applied from a build rather than from whatever happens to be in the working tree.

Applied files are recorded with a SHA-256 checksum. Editing an applied migration is refused with
`MigrationChecksumMismatchError` rather than silently re-applied, because a silently edited migration
leaves the repository and the database describing different schemas. To change an applied schema, add a
new migration.

## Layout

```
src/
  domain/     L3 — pure logic, no I/O, no external imports
  db/         L2 — persistence: client, migrations, query primitives
  l4/         L4 — use cases: registration, capacity reduction
test/
docs/
docker/
```

The `L1`–`L5` layer model in [`SYSTEM-ARCHITECTURE.md`](docs/architecture/SYSTEM-ARCHITECTURE.md) §2
defines five layers; three of them exist here. L5 (presentation) and its transport (Route Handlers, also
L4) will arrive with the web framework milestone and live in `src/app/`, which does not exist yet.

`src/domain` may not import anything external. The rule is enforced by ESLint rather than by a
workspace boundary, so it is a required CI check and not a convention. The L5 rules in
`eslint.config.mjs` are scoped to `src/app/**` and are dormant until that directory is created; they
need no change then, only the framework.

`src/l4` holds the capacity invariant, which belongs to neither L2 nor L3: it compares a stored value
against a count of rows, and the architecture forbids L2 from interpreting a lifecycle rule and L3 from
performing I/O.

## Transaction semantics — read before adding a caller

`withTransaction` **commits any body that resolves**, whatever it resolves to. A body that writes and
then decides to refuse must therefore throw `RollbackSignal`, not return a refusal — otherwise the
partial work is committed. This is not theoretical: the capacity-reduction use case cancelled
participants before evaluating FR-REG-037, and returning a refusal committed those cancellations. A
`RollbackSignal` rolls back and resolves to the refusal, so a business decision never surfaces as an
error.

## Testing notes

Concurrency tests use **separate database connections** and commit for real.
`TESTING-STRATEGY.md` requires this: a mocked database cannot demonstrate a concurrent-write
guarantee. `vitest.integration.config.ts` disables file parallelism because every integration file
truncates between tests, and a parallel run would have one file's cleanup land in another's assertions.
Within a file, tests still run sequentially and the concurrency tests still use genuinely parallel
sessions.

Truncation always runs as the **owner** role. `erns_app` has no `TRUNCATE` grant on `audit_log` by
design, so passing the application pool to a cleanup helper fails with a permission error — that failure
is the permission model working.