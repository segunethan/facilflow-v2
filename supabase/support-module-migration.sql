-- ============================================================
-- FaciliFlow Support Module Migration
-- Run this in Supabase Dashboard → SQL Editor
--
-- Prerequisites (already present in your DB):
--   • users, tenants, change_requests tables
--   • change_roles + user_change_roles tables (live, not in schema.sql)
--   • uuid-ossp extension (uuid_generate_v4 already used in schema.sql)
--
-- This migration is idempotent — safe to re-run.
-- ============================================================

-- ============================================================
-- 1. ADD NEW IT ROLES TO change_roles
-- ============================================================
INSERT INTO change_roles (key, label, description) VALUES
  ('it_technician', 'IT Technician', 'Handles assigned support tickets and incidents'),
  ('it_admin',      'IT Admin',      'Full ticket visibility, assignment, category management')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. ASSET REGISTRY
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     uuid REFERENCES tenants(id) ON DELETE CASCADE,
  asset_tag     text NOT NULL,
  name          text NOT NULL,
  category      text NOT NULL,
  serial_number text,
  assigned_to   uuid REFERENCES users(id) ON DELETE SET NULL,
  department    text,
  site          text,
  status        text DEFAULT 'available',
  purchase_date date,
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_assets" ON assets;
CREATE POLICY "tenant_isolation_assets" ON assets
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- 3. TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id                    text PRIMARY KEY,
  tenant_id             uuid REFERENCES tenants(id) ON DELETE CASCADE,
  type                  text NOT NULL,              -- 'incident' | 'service_request'
  ticket_type           text,                       -- Hardware | Software | Network | Security | Access | Infrastructure
  status                text DEFAULT 'open',        -- open | assigned | in_progress | pending | approved | rejected | resolved | fulfilled | closed
  priority              text DEFAULT 'medium',      -- low | medium | high | critical
  priority_auto         boolean DEFAULT true,
  impact                text DEFAULT 'medium',      -- low | medium | high | critical
  impact_details        text,
  severity              text DEFAULT 'moderate',    -- minor | moderate | major | critical
  urgency               text DEFAULT 'medium',      -- low | medium | high
  subject               text NOT NULL,
  description           text,
  requester_id          uuid REFERENCES users(id),
  assignee_id           uuid REFERENCES users(id),
  category              text,
  subcategory           text,
  item                  text,
  department            text,
  site                  text,
  product_service       text,
  mode                  text DEFAULT 'portal',      -- portal | email | phone | walk-in
  support_level         text DEFAULT 'Level 1 Support',
  asset_id              uuid REFERENCES assets(id) ON DELETE SET NULL,
  asset_free_text       text,
  linked_cr_id          text REFERENCES change_requests(id) ON DELETE SET NULL,
  resolution_notes      text,
  resolution_status     text,
  root_cause            text,
  resolved_at           timestamptz,
  closed_at             timestamptz,
  reopened_at           timestamptz,
  reopen_count          int DEFAULT 0,
  history               jsonb DEFAULT '[]'::jsonb,
  attachments           jsonb DEFAULT '[]'::jsonb,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_tickets" ON tickets;
CREATE POLICY "tenant_isolation_tickets" ON tickets
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Helpful indexes for the queries the app will run
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status   ON tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee        ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_requester       ON tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at      ON tickets(tenant_id, created_at DESC);

-- ============================================================
-- 4. TICKET COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_comments (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   text REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   uuid REFERENCES users(id),
  body        text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_ticket_comments" ON ticket_comments;
CREATE POLICY "tenant_isolation_ticket_comments" ON ticket_comments
  FOR ALL USING (
    ticket_id IN (
      SELECT id FROM tickets
       WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id, created_at);

-- ============================================================
-- 5. TICKET CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_categories (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid REFERENCES tenants(id) ON DELETE CASCADE,
  category    text NOT NULL,
  subcategory text,
  item        text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (tenant_id, category, subcategory, item)
);

ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_ticket_categories" ON ticket_categories;
CREATE POLICY "tenant_isolation_ticket_categories" ON ticket_categories
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- 6. SEED DEFAULT CATEGORIES (for every existing tenant)
-- ============================================================
-- Inserts the default category tree for every tenant that doesn't already
-- have these rows. Safe to re-run thanks to the UNIQUE constraint above.
INSERT INTO ticket_categories (tenant_id, category, subcategory, item)
SELECT t.id, c.category, c.subcategory, c.item
  FROM tenants t
 CROSS JOIN (VALUES
   ('Hardware',       'Laptop',           'Dell Latitude'),
   ('Hardware',       'Laptop',           'MacBook Pro'),
   ('Hardware',       'Printer',          'HP LaserJet'),
   ('Hardware',       'Monitor',          'Dell Monitor'),
   ('Software',       'Operating System', 'Windows 11'),
   ('Software',       'Application',      'Microsoft 365'),
   ('Software',       'Application',      'HR System'),
   ('Network',        'WiFi',             'Office WiFi'),
   ('Network',        'VPN',              'Cisco VPN'),
   ('Security',       'Access',           'Active Directory'),
   ('Security',       'Password',         'Password Reset'),
   ('Infrastructure', 'Cloud',            'Azure'),
   ('Infrastructure', 'Server',           'On-Premise Server')
 ) AS c(category, subcategory, item)
ON CONFLICT (tenant_id, category, subcategory, item) DO NOTHING;

-- ============================================================
-- 7. VERIFY
-- ============================================================
-- Confirm tables, policies, and seed data landed.
SELECT 'change_roles new keys' AS check, COUNT(*) AS rows
  FROM change_roles WHERE key IN ('it_technician','it_admin');

SELECT 'tables created' AS check, table_name
  FROM information_schema.tables
 WHERE table_name IN ('assets','tickets','ticket_comments','ticket_categories')
 ORDER BY table_name;

SELECT 'ticket_categories seeded per tenant' AS check, tenant_id, COUNT(*) AS categories
  FROM ticket_categories
 GROUP BY tenant_id
 ORDER BY tenant_id;
