-- =============================================================================
-- ERNS local role provisioning.
--
-- Run once by the PostgreSQL Docker entrypoint, on an empty data directory.
--
-- These roles exist so that the application role is structurally incapable of altering audit history.
-- NFR-SEC-015 requires minimum privilege; SECURITY-ARCHITECTURE.md section 9.2 states the two
-- consequences as: the audit table receives insert and read grants only, and the application role
-- holds no schema-altering privilege.
--
-- WHY THE APPLICATION ROLE HAS A PASSWORD HERE. test/audit-permission.test.ts must authenticate as
-- erns_app over a real connection. A permission check run over the owner's connection would prove
-- nothing, because the owner can always UPDATE a table it owns regardless of any REVOKE.
--
-- The password below is a local development value for a container bound to 127.0.0.1. It is committed
-- deliberately so that a fresh clone works. It is not a credential for any shared environment, and
-- PB-ENG-12 applies: no shared or production credential may appear in this repository.
-- =============================================================================

-- The schema owner. NOLOGIN, so no password exists for it and no application request can ever use it.
-- Migrations connect as the cluster superuser (the POSTGRES_USER) and SET ROLE to erns_owner.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erns_owner') THEN
    CREATE ROLE erns_owner NOLOGIN;
  END IF;
END
$$;

-- The application role. LOGIN, because the permission test authenticates as it.
--
-- CREATEDB and CREATEROLE are deliberately NOT granted: NFR-SEC-015 requires the minimum privilege
-- the application needs, and creating roles or databases is not among it.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erns_app') THEN
    CREATE ROLE erns_app LOGIN PASSWORD 'localdev_app_only';
  END IF;
END
$$;

-- The application role needs to reach the database at all.
GRANT CONNECT ON DATABASE erns TO erns_app;

-- PUBLIC holds USAGE on the public schema by default. ERNS uses its own `erns` schema, so the
-- application role is given no privilege on `public` beyond what it already has.
--
-- There is intentionally no GRANT CREATE anywhere: SECURITY-ARCHITECTURE.md line 380 requires the
-- application role to hold no schema-altering privilege, and CREATE on a schema is the privilege that
-- would let a defect alter or drop data. 0001_initial.sql creates the schema and revokes CREATE from
-- PUBLIC explicitly rather than relying on the server default.

-- The role that runs the integration tests as a database owner: the container's POSTGRES_USER.
-- Created here so that its membership in erns_owner is visible in one place.
GRANT erns_owner TO postgres;

-- Verifying queries, for a human. These are comments so the script emits no output.
--
--   Expected: two roles.
--   SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles
--    WHERE rolname IN ('erns_owner', 'erns_app') ORDER BY rolname;
--
--   Expected: erns_owner canlogin=f, erns_app canlogin=t, both rolsuper=f.