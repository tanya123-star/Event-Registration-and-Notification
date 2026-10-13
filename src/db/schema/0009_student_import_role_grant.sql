-- =============================================================================
-- ERNS migration 0009: INSERT on user_role for the Administrator CSV import
-- (MVP T8, issue #9).
--
-- Source: USER-ROLES.md line 328 (Student is granted by default on account
-- provisioning), MVP story 33, MVP gap 7.
--
-- SCOPE. One grant, on one table. Migration 0005 gave erns_app SELECT only on
-- erns.user_role because identity resolution only reads. Provisioning a
-- Student account writes the (user_id, 'STUDENT') row in the same step, so
-- the import needs INSERT. UPDATE and DELETE stay withheld: role revocation
-- and reassignment belong to a later milestone with its own ticket, and
-- granting them now would invent that path.
--
-- No table is created or altered. No foreign key is created. The application
-- role gains no schema-altering privilege (SECURITY-ARCHITECTURE.md line 380).
-- =============================================================================

GRANT INSERT ON TABLE erns.user_role TO erns_app;

-- =============================================================================
-- Verification.
--
--   Expected: SELECT, INSERT for erns_app on user_role; no UPDATE, no DELETE.
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--    WHERE table_schema = 'erns' AND table_name = 'user_role'
--    ORDER BY grantee, privilege_type;
-- =============================================================================
