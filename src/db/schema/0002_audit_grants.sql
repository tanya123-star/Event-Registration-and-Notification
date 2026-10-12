-- =============================================================================
-- ERNS migration 0002: audit-log role separation and column immutability.
--
-- Requirements:
--   C-03  (TECH-STACK.md): "The store MUST support insert-and-read access to the audit table with no
--         update or delete grant, or an equivalent append-only mechanism."
--   NFR-AUD-005 (FUNCTIONAL-REQUIREMENTS.md line 359): "The system shall provide no interface to
--         modify or delete an audit entry."
--   NFR-SEC-015 and SECURITY-ARCHITECTURE.md section 9.2: the application role holds the minimum
--         privilege it needs, and the audit table receives insert and read grants only.
--
-- This is a separate migration on purpose. The restriction is the part of the audit design most
-- likely to be weakened by a later change, so it is applied as its own reviewed step and verified by
-- test/audit-permission.test.ts over a real connection authenticated as erns_app.
--
-- 0001 deliberately granted nothing on audit_log. This migration grants SELECT and INSERT and
-- withholds UPDATE and DELETE, so the withholding is visible rather than implied by an absence.
-- =============================================================================

-- Read and append only. AUDIT-PLAN.md line 541: "Only Administrator reads and exports" - that
-- Administrator scoping is an application-layer rule and is not part of this milestone. What is
-- structural here is that no role may alter or remove a row.
GRANT SELECT, INSERT ON TABLE erns.audit_log TO erns_app;

-- Explicit withhold, so the intent survives a later GRANT ALL. REVOKE is idempotent.
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE erns.audit_log FROM erns_app;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE erns.audit_log FROM PUBLIC;

-- DATA-MODEL.md line 82: user email is "unique and immutable after first save".
--
-- Column-level UPDATE is the only place this can be enforced, and only if the table-level UPDATE is
-- removed first: PostgreSQL grants the table privilege or the column privilege, and the table grant
-- covers every column. 0001 granted table-level UPDATE to erns_app, so it is revoked here and then
-- re-granted on the specific mutable columns.
REVOKE UPDATE ON TABLE erns.app_user FROM erns_app;

GRANT UPDATE (display_name, account_status, last_login_at, updated_at) ON TABLE erns.app_user TO erns_app;

-- email and user_id are therefore not updatable by erns_app. There is deliberately no grant that
-- would let the application change either.
--
-- NFR-SEC-015 note: this is the "minimum privilege" requirement expressed as a grant set. The
-- application role can perform every operation ERNS needs at runtime and none of the operations that
-- would let a defect rewrite history.

-- =============================================================================
-- Verification queries for a human or a test. These are comments so that the migration does not
-- emit output. test/audit-permission.test.ts asserts the equivalent predicates via the catalogs.
--
--   Expected: two rows, tableowner=erns_owner, no UPDATE or DELETE for erns_app.
--   SELECT table_name, tableowner FROM pg_tables WHERE schemaname = 'erns';
--
--   Expected: SELECT and INSERT only.
--   SELECT table_name, privilege_type FROM information_schema.role_table_grants
--    WHERE grantee = 'erns_app' AND table_schema = 'erns' ORDER BY table_name, privilege_type;
--
--   Expected: zero rows. erns_app must not own any object.
--   SELECT rolname FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner
--    WHERE r.rolname = 'erns_app';
-- =============================================================================