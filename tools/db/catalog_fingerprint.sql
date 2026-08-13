-- Structural fingerprint of a database, catalogue level.
--
-- Used by tools/db/model_schema_check.sh to compare the schema produced by the
-- SQLAlchemy model layer with the schema produced by the Alembic revisions.
--
-- Deliberately covers columns, constraints and indexes only. Trigger functions
-- and triggers are outside what SQLAlchemy metadata can express, so including
-- them would report a difference that means nothing; they are covered instead
-- by the pg_dump diff against the production clone (GATE 2).
--
-- `alembic_version` is excluded: it exists only in the migrated database.

\pset tuples_only on
\pset format unaligned
\pset fieldsep '|'

SELECT line
FROM (
    SELECT
        'column|' || c.table_name || '|' || c.column_name || '|' || c.data_type
            || '|' || c.is_nullable || '|' || COALESCE(c.column_default, '') AS line,
        1 AS section,
        c.table_name AS a,
        c.column_name AS b
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name <> 'alembic_version'

    UNION ALL

    SELECT
        'constraint|' || rel.relname || '|' || con.conname || '|'
            || pg_get_constraintdef(con.oid) AS line,
        2 AS section,
        rel.relname AS a,
        con.conname AS b
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname <> 'alembic_version'

    UNION ALL

    SELECT
        'index|' || i.tablename || '|' || i.indexname || '|' || i.indexdef AS line,
        3 AS section,
        i.tablename AS a,
        i.indexname AS b
    FROM pg_indexes i
    WHERE i.schemaname = 'public'
      AND i.tablename <> 'alembic_version'
) AS fingerprint
ORDER BY section, a, b, line;
