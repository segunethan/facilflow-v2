-- ============================================================
-- MIGRATION: IT Subscriptions v2 — dept, reminders, new status,
--            and expanded billing cycles
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add new columns (safe — IF NOT EXISTS)
--    reminder_schedule is jsonb so it round-trips a JS array cleanly via Supabase JS.
ALTER TABLE it_subscriptions
  ADD COLUMN IF NOT EXISTS assigned_dept      text,
  ADD COLUMN IF NOT EXISTS reminder_schedule  jsonb DEFAULT '["monthly"]'::jsonb;

-- 2. Backfill reminder_schedule for any existing rows where it's NULL
UPDATE it_subscriptions
   SET reminder_schedule = '["monthly"]'::jsonb
 WHERE reminder_schedule IS NULL;

-- 3. Update default billing_cycle to match the new UI default ('Annual')
ALTER TABLE it_subscriptions
  ALTER COLUMN billing_cycle SET DEFAULT 'Annual';

-- 4. Migrate any legacy 'Yearly' values to 'Annual' so filters/dropdowns line up
UPDATE it_subscriptions
   SET billing_cycle = 'Annual'
 WHERE billing_cycle = 'Yearly';

-- 5. (Optional, recommended) Enforce valid status + billing_cycle values.
--    Drop first in case the constraint already exists from a prior run.
ALTER TABLE it_subscriptions
  DROP CONSTRAINT IF EXISTS it_subscriptions_status_check;
ALTER TABLE it_subscriptions
  ADD  CONSTRAINT it_subscriptions_status_check
       CHECK (status IN ('active','pending_renewal','expired','cancelled'));

ALTER TABLE it_subscriptions
  DROP CONSTRAINT IF EXISTS it_subscriptions_billing_cycle_check;
ALTER TABLE it_subscriptions
  ADD  CONSTRAINT it_subscriptions_billing_cycle_check
       CHECK (billing_cycle IN ('Monthly','Quarterly','Semi-Annual','Annual'));

-- 6. (Optional) Enforce valid reminder_schedule values.
--    jsonb '<@' is element-wise containment for arrays, so every element of
--    reminder_schedule must appear in the allowed-values list.
ALTER TABLE it_subscriptions
  DROP CONSTRAINT IF EXISTS it_subscriptions_reminder_schedule_check;
ALTER TABLE it_subscriptions
  ADD  CONSTRAINT it_subscriptions_reminder_schedule_check
       CHECK (
         reminder_schedule IS NULL
         OR (
           jsonb_typeof(reminder_schedule) = 'array'
           AND reminder_schedule <@ '["daily","every_2_weeks","monthly","quarterly"]'::jsonb
         )
       );

-- 7. Verify
SELECT column_name, data_type, column_default
  FROM information_schema.columns
 WHERE table_name = 'it_subscriptions'
   AND column_name IN ('assigned_dept','reminder_schedule','billing_cycle','status')
 ORDER BY column_name;
