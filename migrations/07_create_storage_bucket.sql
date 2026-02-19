-- ============================================================
-- Migration 07: Create camp-photos Storage Bucket
--
-- Purpose: Move photos from JSONB database fields to Supabase
-- Storage (CDN) for much faster page loads.
--
-- Run this in Supabase SQL Editor ONCE.
-- ============================================================

-- Step 1: Create the storage bucket
-- Photos are public (they're displayed on the public camp website)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'camp-photos',
  'camp-photos',
  true,
  5242880,  -- 5MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Allow public read access (anyone can view photos)
-- This is needed because photos are shown on the public website
CREATE POLICY "Public read access for camp photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'camp-photos');

-- Step 3: Allow authenticated uploads via anon key
-- The app uses the anon key, so we allow insert/update/delete for anon role
CREATE POLICY "Allow uploads to camp photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'camp-photos');

CREATE POLICY "Allow updates to camp photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'camp-photos');

CREATE POLICY "Allow deletes from camp photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'camp-photos');

-- ============================================================
-- Folder structure (created automatically on first upload):
--
-- camp-photos/
--   dev/site/hero.jpg, dropoff.jpg, layups.jpg, lunch.jpg
--   dev/food/{key}.jpg
--   dev/counselors/{id}.jpg
--   dev/parents/{email_hash}.jpg
--   dev/campers/{id}.jpg
--   dev/emergency-contacts/{id}.jpg
--   public/site/...  (same structure for production)
--   public/food/...
--   public/counselors/...
--   public/parents/...
--   public/campers/...
--   public/emergency-contacts/...
--
-- Verify after running:
--   SELECT * FROM storage.buckets WHERE id = 'camp-photos';
--   SELECT * FROM storage.policies WHERE bucket_id = 'camp-photos';
-- ============================================================
