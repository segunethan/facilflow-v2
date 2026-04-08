-- ============================================================
-- FaciliFlow v2 — Supabase Database Schema
-- Run this in Supabase → SQL Editor → New Query → Run
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── TENANTS ────────────────────────────────────────────────
create table tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  domain text unique,
  plan text default 'Enterprise',
  status text default 'active',
  created_at timestamptz default now()
);

-- ── USERS (extends Supabase auth.users) ────────────────────
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id),
  name text not null,
  email text not null,
  role text not null default 'employee', -- employee | manager | resource_team | admin
  dept text,
  status text default 'active',          -- active | suspended
  initials text,
  created_at timestamptz default now()
);

-- ── REQUESTS ───────────────────────────────────────────────
create table requests (
  id text primary key,
  tenant_id uuid references tenants(id),
  type text not null,                    -- pool_car | stationary
  title text not null,
  submitted_by uuid references users(id),
  approver_id uuid references users(id),
  status text default 'pending_approval',
  details jsonb default '{}',
  history jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── CHANGE REQUESTS ────────────────────────────────────────
create table change_requests (
  id text primary key,
  tenant_id uuid references tenants(id),
  title text not null,
  initiator uuid references users(id),
  status text default 'draft',
  change_type text,                      -- Standard | Normal | Emergency
  risk_level text,                       -- Low | Medium | High
  environment text,                      -- Dev | Staging | Production
  system_name text,
  category text,
  description text,
  deploy_date date,
  deploy_start time,
  deploy_end time,
  rollback text,
  test_evidence text,
  implementation_notes text,
  review_outcome text,
  lessons_learned text,
  is_emergency boolean default false,
  completed_at timestamptz,
  history jsonb default '[]',
  stages jsonb default '[]',
  attachments jsonb default '[]',
  comments jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── VEHICLES ───────────────────────────────────────────────
create table vehicles (
  id text primary key,
  tenant_id uuid references tenants(id),
  plate text not null,
  model text not null,
  year int,
  color text,
  status text default 'available',       -- available | in_use | under_maintenance | reserved | out_of_service
  driver_id text,
  ownership_type text default 'Company', -- Company | Joint
  company_name text,
  co_owner_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── VEHICLE DOCUMENTS ──────────────────────────────────────
create table vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  vehicle_id text references vehicles(id) on delete cascade,
  document_type text not null,           -- Insurance | Road Worthiness | Vehicle License
  expiry_date date,
  attachment_url text,
  last_updated timestamptz default now(),
  unique(vehicle_id, document_type)
);

-- ── IT SUBSCRIPTIONS ───────────────────────────────────────
create table it_subscriptions (
  id text primary key,
  tenant_id uuid references tenants(id),
  name text not null,
  vendor text,
  category text,                         -- Design | Hosting | Email | Communication | Security | Analytics | Development | Productivity | Other
  renewal_date date not null,
  billing_cycle text default 'Yearly',   -- Monthly | Yearly
  cost numeric(14,2),
  prev_cost numeric(14,2),
  status text default 'active',          -- active | expired | cancelled
  notes text,
  attachment_url text,
  assigned_owner text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── DRIVERS ────────────────────────────────────────────────
create table drivers (
  id text primary key,
  tenant_id uuid references tenants(id),
  name text not null,
  license text,
  phone text,
  status text default 'available',       -- available | unavailable | suspended | resigned
  vehicle_id text references vehicles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── INVENTORY ──────────────────────────────────────────────
create table inventory (
  id text primary key,
  tenant_id uuid references tenants(id),
  name text not null,
  code text unique,
  category text,
  stock int default 0,
  unit text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── NOTIFICATIONS ──────────────────────────────────────────
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id),
  user_id uuid references users(id),
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- ── AUDIT LOG ──────────────────────────────────────────────
create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id),
  performed_by uuid references users(id),
  action text not null,
  target text,
  detail text,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table tenants           enable row level security;
alter table users             enable row level security;
alter table requests          enable row level security;
alter table change_requests   enable row level security;
alter table vehicles          enable row level security;
alter table vehicle_documents enable row level security;
alter table drivers           enable row level security;
alter table inventory         enable row level security;
alter table notifications     enable row level security;
alter table audit_log         enable row level security;
alter table it_subscriptions  enable row level security;

-- Users can only see data from their own tenant
create policy "tenant_isolation_users"        on users             for all using (tenant_id = (select tenant_id from users where id = auth.uid()));
create policy "tenant_isolation_requests"     on requests          for all using (tenant_id = (select tenant_id from users where id = auth.uid()));
create policy "tenant_isolation_crs"          on change_requests   for all using (tenant_id = (select tenant_id from users where id = auth.uid()));
create policy "tenant_isolation_vehicles"     on vehicles          for all using (tenant_id = (select tenant_id from users where id = auth.uid()));
create policy "tenant_isolation_veh_docs"     on vehicle_documents for all using (tenant_id = (select tenant_id from users where id = auth.uid()));
create policy "tenant_isolation_drivers"      on drivers           for all using (tenant_id = (select tenant_id from users where id = auth.uid()));
create policy "tenant_isolation_inventory"    on inventory         for all using (tenant_id = (select tenant_id from users where id = auth.uid()));
create policy "tenant_isolation_notifs"       on notifications     for all using (tenant_id = (select tenant_id from users where id = auth.uid()));
create policy "tenant_isolation_audit"        on audit_log         for all using (tenant_id = (select tenant_id from users where id = auth.uid()));
create policy "tenant_isolation_it_subs"      on it_subscriptions  for all using (tenant_id = (select tenant_id from users where id = auth.uid()));
create policy "tenant_read_tenants"           on tenants           for select using (id = (select tenant_id from users where id = auth.uid()));

-- ============================================================
-- SEED DATA — Africa Prudential Plc
-- ============================================================

-- Insert tenant first
insert into tenants (id, name, domain, plan, status)
values ('00000000-0000-0000-0000-000000000001', 'Africa Prudential Plc', 'africaprudential.com', 'Enterprise', 'active');

-- Inventory seed (no auth dependency)
insert into inventory (id, tenant_id, name, code, category, stock, unit, description) values
('INV001', '00000000-0000-0000-0000-000000000001', 'A4 Paper (Ream)',      'STA-001', 'Paper',    45, 'ream', '80gsm A4 paper reams for office printing'),
('INV002', '00000000-0000-0000-0000-000000000001', 'Ballpoint Pens (Box)', 'STA-002', 'Writing',   8, 'box',  'Blue and black ballpoint pens, 50 per box'),
('INV003', '00000000-0000-0000-0000-000000000001', 'Stapler',              'EQP-001', 'Equipment',12, 'unit', 'Heavy duty desktop staplers'),
('INV004', '00000000-0000-0000-0000-000000000001', 'Sticky Notes (Pack)',  'STA-003', 'Paper',     3, 'pack', '76x76mm sticky note pads, assorted colours'),
('INV005', '00000000-0000-0000-0000-000000000001', 'Highlighters (Set)',   'STA-004', 'Writing',  15, 'set',  '5-colour highlighter sets'),
('INV006', '00000000-0000-0000-0000-000000000001', 'Printer Cartridge',    'EQP-002', 'Equipment', 4, 'unit', 'HP LaserJet compatible black toner cartridges');

-- Vehicles seed
insert into vehicles (id, tenant_id, plate, model, year, color, status) values
('CAR001', '00000000-0000-0000-0000-000000000001', 'AAA-001BE', 'Toyota Camry',    2022, 'Silver', 'available'),
('CAR002', '00000000-0000-0000-0000-000000000001', 'BBB-234FG', 'Toyota Corolla',  2021, 'White',  'in_use'),
('CAR003', '00000000-0000-0000-0000-000000000001', 'CCC-567HJ', 'Toyota Hilux',    2020, 'Blue',   'under_maintenance'),
('CAR004', '00000000-0000-0000-0000-000000000001', 'DDD-890KL', 'Hyundai Elantra', 2023, 'Black',  'available'),
('CAR005', '00000000-0000-0000-0000-000000000001', 'EEE-123MN', 'Toyota Prado',    2022, 'White',  'reserved');

-- Drivers seed
insert into drivers (id, tenant_id, name, license, phone, status, vehicle_id) values
('DRV001', '00000000-0000-0000-0000-000000000001', 'Babatunde Olatunji', 'LGA-2019-4567', '+234 803 123 4567', 'available',   'CAR001'),
('DRV002', '00000000-0000-0000-0000-000000000001', 'Emeka Chukwu',       'LGA-2018-8901', '+234 806 987 6543', 'unavailable', 'CAR002'),
('DRV003', '00000000-0000-0000-0000-000000000001', 'Sunday Adeyinka',    'LGA-2020-2345', '+234 815 456 7890', 'available',   'CAR004'),
('DRV004', '00000000-0000-0000-0000-000000000001', 'Rotimi Adeleke',     'LGA-2021-6789', '+234 802 345 6789', 'suspended',   null);
