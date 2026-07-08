-- ============================================================
-- Split user name into first_name + last_name
-- Run in Supabase → SQL Editor → New Query → Run
-- ============================================================

-- 1. Add new columns (safe to re-run)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name  text;

-- 2. Backfill from existing name column
--    first_name = everything before the first space
--    last_name  = everything after the first space (handles middle names too)
UPDATE users
SET
  first_name = trim(split_part(trim(name), ' ', 1)),
  last_name  = CASE
                 WHEN position(' ' IN trim(name)) > 0
                 THEN trim(substring(trim(name) FROM position(' ' IN trim(name)) + 1))
                 ELSE ''
               END
WHERE first_name IS NULL OR first_name = '';
