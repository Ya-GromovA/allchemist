-- Separate database roles, least privilege.
--
-- Until now the application, the migration runner, the backup job and anyone at
-- a psql prompt all connected as `synapse` -- the superuser that owns the
-- database. That single role meant:
--
--   * a SQL-injection bug in a request handler could DROP TABLE;
--   * the application could disable the append-only triggers on audit_log and
--     auth_attempt_events, because a table owner may always do that, which made
--     "append-only" a statement about intent rather than a guarantee;
--   * nothing distinguished "the schema changed because a migration ran" from
--     "the schema changed";
--   * a read-only analytics query and a password write carried identical rights.
--
-- Five roles replace it. They are NOLOGIN group roles plus login roles, so a
-- password rotation never has to touch a grant:
--
--   synapse_owner     owns the schema and every object in it. Used by nobody at
--                     runtime; exists so that ownership is not a login account.
--   synapse_migrate   member of synapse_owner. The only role that runs Alembic.
--   synapse_app       the serving process. DML only -- no CREATE, no ALTER, no
--                     DROP, no TRUNCATE, and it does not own a single table, so
--                     it cannot turn a trigger off.
--   synapse_readonly  SELECT. For dashboards and for a human looking around.
--   synapse_backup    pg_read_all_data. For pg_dump and nothing else.
--
-- Passwords are not in this file. They are set by tools/db/provision_db_roles.sh
-- from /root/ops-secrets/synapse/db-roles.env, which never enters the repository.
--
-- Idempotent: safe to run again after new tables appear.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------------------
-- Roles
-- --------------------------------------------------------------------------

DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY[
    'synapse_owner', 'synapse_migrate', 'synapse_app',
    'synapse_readonly', 'synapse_backup'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN', role_name);
    END IF;
  END LOOP;
END
$$;

-- The three roles that actually connect get LOGIN. synapse_owner deliberately
-- does not: object ownership must not be reachable with a password.
ALTER ROLE synapse_migrate  LOGIN;
ALTER ROLE synapse_app      LOGIN;
ALTER ROLE synapse_readonly LOGIN;
ALTER ROLE synapse_backup   LOGIN;

ALTER ROLE synapse_owner    NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
ALTER ROLE synapse_migrate  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
ALTER ROLE synapse_app      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
ALTER ROLE synapse_readonly NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
ALTER ROLE synapse_backup   NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

GRANT synapse_owner TO synapse_migrate;

-- pg_read_all_data exists from PostgreSQL 14. The server here is 16.
GRANT pg_read_all_data TO synapse_backup;

-- --------------------------------------------------------------------------
-- Ownership
-- --------------------------------------------------------------------------

ALTER SCHEMA public OWNER TO synapse_owner;

DO $$
DECLARE
  obj record;
BEGIN
  FOR obj IN
    SELECT c.relname, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'S', 'v', 'm')
      -- A serial/identity sequence is owned by its table and follows it; trying
      -- to reassign it separately is an error, not a no-op.
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = c.oid
          AND d.classid = 'pg_class'::regclass
          AND d.deptype = 'a'
      )
  LOOP
    IF obj.relkind = 'r' THEN
      EXECUTE format('ALTER TABLE public.%I OWNER TO synapse_owner', obj.relname);
    ELSIF obj.relkind = 'S' THEN
      EXECUTE format('ALTER SEQUENCE public.%I OWNER TO synapse_owner', obj.relname);
    ELSIF obj.relkind = 'v' THEN
      EXECUTE format('ALTER VIEW public.%I OWNER TO synapse_owner', obj.relname);
    ELSE
      EXECUTE format('ALTER MATERIALIZED VIEW public.%I OWNER TO synapse_owner', obj.relname);
    END IF;
  END LOOP;

  FOR obj IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO synapse_owner', obj.signature);
  END LOOP;
END
$$;

-- --------------------------------------------------------------------------
-- Baseline: take away what PUBLIC gets for free
-- --------------------------------------------------------------------------
--
-- Every role in PostgreSQL is a member of PUBLIC, and PUBLIC has CREATE on the
-- public schema by default in versions before 15. Revoking it is what actually
-- stops synapse_app from creating a table; the absence of a GRANT would not.

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO synapse_app, synapse_readonly, synapse_backup;
GRANT ALL   ON SCHEMA public TO synapse_owner;

-- --------------------------------------------------------------------------
-- synapse_app: data, never structure
-- --------------------------------------------------------------------------
--
-- TRUNCATE is not granted on purpose. It is the one DML-looking statement that
-- bypasses row triggers, so granting it would hand the serving process a way
-- around the append-only guarantee on audit_log.

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO synapse_app;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO synapse_app;
GRANT EXECUTE                        ON ALL FUNCTIONS IN SCHEMA public TO synapse_app;

GRANT SELECT ON ALL TABLES    IN SCHEMA public TO synapse_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO synapse_readonly;

-- Tables created by future migrations inherit these grants automatically. Set
-- FOR ROLE synapse_owner because that is who will create them.
ALTER DEFAULT PRIVILEGES FOR ROLE synapse_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO synapse_app;
ALTER DEFAULT PRIVILEGES FOR ROLE synapse_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO synapse_app;
ALTER DEFAULT PRIVILEGES FOR ROLE synapse_owner IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO synapse_app;
ALTER DEFAULT PRIVILEGES FOR ROLE synapse_owner IN SCHEMA public
  GRANT SELECT ON TABLES TO synapse_readonly;
ALTER DEFAULT PRIVILEGES FOR ROLE synapse_owner IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO synapse_readonly;

-- --------------------------------------------------------------------------
-- alembic_version: writable only by the migration runner
-- --------------------------------------------------------------------------
--
-- The serving process may read which revision is deployed -- app/db/init_db.py
-- checks it at start-up -- and must not be able to claim a different one.

REVOKE INSERT, UPDATE, DELETE ON public.alembic_version FROM synapse_app;
GRANT  SELECT                 ON public.alembic_version TO   synapse_app;
