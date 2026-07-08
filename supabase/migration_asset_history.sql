-- ============================================================
-- Asset Assignment History Migration
-- Run in Supabase → SQL Editor → New Query → Run
-- ============================================================

-- Add assigned_date to track when the current assignment started
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS assigned_date date;

-- Add usage_history JSONB array to track full assignment history
-- Each entry: { assigned_to, assigned_to_name, assigned_date, returned_date, notes }
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS usage_history jsonb DEFAULT '[]'::jsonb;
