-- Add admin_roles column to users table
-- Run in Supabase → SQL Editor → New Query → Run

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS admin_roles jsonb DEFAULT '[]'::jsonb;
