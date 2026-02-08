-- Migration 06: Create camp_camper_emergency_contact_links in DEV schema
-- This table already exists in PUBLIC schema but was missing from DEV.
-- It links emergency contacts to specific campers.
-- Run this in the Supabase SQL Editor.

-- Create the table in DEV schema
CREATE TABLE IF NOT EXISTS dev.camp_camper_emergency_contact_links (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default row
INSERT INTO dev.camp_camper_emergency_contact_links (id, data)
VALUES ('main', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT 'camp_camper_emergency_contact_links' AS table_name,
       id,
       jsonb_array_length(data) AS link_count
FROM dev.camp_camper_emergency_contact_links;
