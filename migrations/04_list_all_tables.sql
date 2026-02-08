-- ============================================================================
-- List ALL tables in DEV and PUBLIC schemas
-- ============================================================================

-- Get all tables in both schemas with row counts
SELECT
    schemaname as schema,
    tablename as table_name,
    tableowner as owner
FROM pg_tables
WHERE schemaname IN ('dev', 'public')
ORDER BY schemaname, tablename;

-- ============================================================================
-- Get detailed counts for all tables that have a 'data' column
-- ============================================================================

DO $$
DECLARE
    rec RECORD;
    row_count INTEGER;
    data_count INTEGER;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Table Data Summary';
    RAISE NOTICE '================================================';

    FOR rec IN
        SELECT
            schemaname,
            tablename
        FROM pg_tables
        WHERE schemaname IN ('dev', 'public')
        ORDER BY schemaname, tablename
    LOOP
        -- Get total row count
        EXECUTE format('SELECT COUNT(*) FROM %I.%I', rec.schemaname, rec.tablename)
        INTO row_count;

        -- Try to get JSONB array length if 'data' column exists
        BEGIN
            EXECUTE format(
                'SELECT COALESCE(jsonb_array_length(data), 0) FROM %I.%I WHERE id = ''main'' LIMIT 1',
                rec.schemaname,
                rec.tablename
            ) INTO data_count;

            RAISE NOTICE '%.% - % rows, data array length: %',
                rec.schemaname,
                rec.tablename,
                row_count,
                COALESCE(data_count, 0);
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '%.% - % rows (no data column or not array)',
                    rec.schemaname,
                    rec.tablename,
                    row_count;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- Show table structure for tables with 'data' column
-- ============================================================================

SELECT
    table_schema,
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema IN ('dev', 'public')
    AND column_name IN ('id', 'data', 'updated_at')
ORDER BY table_schema, table_name, ordinal_position;
