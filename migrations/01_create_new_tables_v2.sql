-- Migration: Split camp_registered_users into camp_parents and camp_counselor_users
-- Date: 2026-02-07
-- Version: 12.174 (Corrected for actual Supabase structure)

-- ============================================================================
-- IMPORTANT: First, let's check the structure of an existing table
-- Run this query first to see your actual table structure:
-- ============================================================================
-- \d camp_campers
-- OR
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'camp_campers';

-- ============================================================================
-- OPTION 1: Simple structure (likely your structure)
-- Just an id and data column
-- ============================================================================

CREATE TABLE IF NOT EXISTS camp_parents (
    id BIGSERIAL PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS camp_counselor_users (
    id BIGSERIAL PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verify camp_admins exists (create if it doesn't)
CREATE TABLE IF NOT EXISTS camp_admins (
    id BIGSERIAL PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Insert initial 'main' row with empty array for each table
-- ============================================================================

-- Insert for camp_parents
INSERT INTO camp_parents (data)
SELECT '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM camp_parents WHERE id = 1);

-- Insert for camp_counselor_users
INSERT INTO camp_counselor_users (data)
SELECT '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM camp_counselor_users WHERE id = 1);

-- Insert for camp_admins (if needed)
INSERT INTO camp_admins (data)
SELECT '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM camp_admins WHERE id = 1);

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'camp_parents' as table_name, COUNT(*) as row_count FROM camp_parents
UNION ALL
SELECT 'camp_counselor_users', COUNT(*) FROM camp_counselor_users
UNION ALL
SELECT 'camp_admins', COUNT(*) FROM camp_admins;
