-- ============================================================
-- MIGRATION: Fix requests table + RLS for admin operations
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add missing columns to requests table (safe — IF NOT EXISTS)
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS assigned_vehicle text,
  ADD COLUMN IF NOT EXISTS assigned_driver  text,
  ADD COLUMN IF NOT EXISTS approved_by      uuid,
  ADD COLUMN IF NOT EXISTS approved_at      timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at     timestamptz;

-- 2. Add missing columns to vehicles table for ownership tracking
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS ownership_type text DEFAULT 'Company',
  ADD COLUMN IF NOT EXISTS company_name   text,
  ADD COLUMN IF NOT EXISTS co_owner_name  text;

-- 3. Drop the existing overly-broad policy and replace with
--    proper per-operation policies so admins can update any
--    request in their tenant (not just their own).

-- Drop old catch-all policy
DROP POLICY IF EXISTS "tenant_isolation_requests" ON requests;

-- Re-create with explicit per-operation policies
-- SELECT: any authenticated user in same tenant can read
CREATE POLICY "requests_select"
  ON requests FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- INSERT: authenticated users can create requests for their tenant
CREATE POLICY "requests_insert"
  ON requests FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- UPDATE: the submitter OR any admin-role user in the same tenant can update
CREATE POLICY "requests_update"
  ON requests FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (
      submitted_by = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid())
          IN ('admin', 'super_admin', 'facility_admin', 'it_admin', 'resource_team')
    )
  );

-- DELETE: admins only
CREATE POLICY "requests_delete"
  ON requests FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid())
        IN ('admin', 'super_admin', 'facility_admin')
  );

-- 4. Same fix for vehicles — allow facility admins to update any vehicle
DROP POLICY IF EXISTS "tenant_isolation_vehicles" ON vehicles;

CREATE POLICY "vehicles_select"
  ON vehicles FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "vehicles_insert"
  ON vehicles FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "vehicles_update"
  ON vehicles FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid())
        IN ('admin', 'super_admin', 'facility_admin', 'resource_team')
  );

-- 5. Add RLS policies for new tables (if not already created)
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_veh_docs" ON vehicle_documents;
CREATE POLICY "veh_docs_all"
  ON vehicle_documents FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

ALTER TABLE it_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_it_subs" ON it_subscriptions;
CREATE POLICY "it_subs_all"
  ON it_subscriptions FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid())
        IN ('admin', 'super_admin', 'it_admin')
  );
