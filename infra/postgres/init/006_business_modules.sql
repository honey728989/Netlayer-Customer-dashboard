ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS account_manager_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS sales_owner_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS primary_contact_name VARCHAR(160),
  ADD COLUMN IF NOT EXISTS primary_contact_phone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE;

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS city VARCHAR(120),
  ADD COLUMN IF NOT EXISTS state VARCHAR(120),
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS installation_status VARCHAR(32) NOT NULL DEFAULT 'LIVE',
  ADD COLUMN IF NOT EXISTS last_mile_provider VARCHAR(160),
  ADD COLUMN IF NOT EXISTS pop_name VARCHAR(160);

CREATE TABLE IF NOT EXISTS customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(32),
  role VARCHAR(80) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  service_id VARCHAR(64) UNIQUE NOT NULL,
  circuit_id VARCHAR(64) UNIQUE,
  service_type VARCHAR(32) NOT NULL,
  bandwidth_mbps INTEGER NOT NULL,
  billing_cycle VARCHAR(32) NOT NULL DEFAULT 'MONTHLY',
  provider VARCHAR(160),
  pop_name VARCHAR(160),
  last_mile_provider VARCHAR(160),
  static_ip_block VARCHAR(128),
  grafana_dashboard_uid VARCHAR(64),
  zabbix_host_group VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  activated_at TIMESTAMPTZ,
  contract_start_date DATE,
  contract_end_date DATE,
  monthly_recurring_charge NUMERIC(14,2) NOT NULL DEFAULT 0,
  non_recurring_charge NUMERIC(14,2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id),
  customer_id UUID REFERENCES customers(id),
  owner_user_id UUID REFERENCES users(id),
  source VARCHAR(64) NOT NULL,
  company_name VARCHAR(160) NOT NULL,
  contact_name VARCHAR(160) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(32),
  service_type VARCHAR(32) NOT NULL,
  bandwidth_required_mbps INTEGER NOT NULL DEFAULT 100,
  city VARCHAR(120),
  state VARCHAR(120),
  expected_mrc NUMERIC(14,2) NOT NULL DEFAULT 0,
  expected_nrc NUMERIC(14,2) NOT NULL DEFAULT 0,
  stage VARCHAR(32) NOT NULL DEFAULT 'NEW',
  probability_percent INTEGER NOT NULL DEFAULT 10,
  lost_reason TEXT,
  notes TEXT,
  expected_close_date DATE,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES users(id),
  activity_type VARCHAR(32) NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assignee_user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  due_at TIMESTAMPTZ,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feasibility_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  requested_by_user_id UUID REFERENCES users(id),
  assigned_engineer_user_id UUID REFERENCES users(id),
  source VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER_PORTAL',
  request_code VARCHAR(32) UNIQUE NOT NULL,
  site_name VARCHAR(160) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(120) NOT NULL,
  state VARCHAR(120) NOT NULL,
  pincode VARCHAR(16),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  contact_name VARCHAR(160) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(32),
  service_type VARCHAR(32) NOT NULL,
  bandwidth_required_mbps INTEGER NOT NULL,
  redundancy_required BOOLEAN NOT NULL DEFAULT FALSE,
  expected_go_live_date DATE,
  status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
  survey_scheduled_for TIMESTAMPTZ,
  survey_notes TEXT,
  feasibility_summary TEXT,
  estimated_capex NUMERIC(14,2),
  estimated_mrc NUMERIC(14,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feasibility_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feasibility_request_id UUID NOT NULL REFERENCES feasibility_requests(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES users(id),
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES billing_invoices(id) ON DELETE SET NULL,
  zoho_payment_id VARCHAR(64) UNIQUE,
  amount NUMERIC(14,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'INR',
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  payment_method VARCHAR(64),
  payment_link VARCHAR(512),
  paid_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id),
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  action VARCHAR(64) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_services_customer_id ON services(customer_id);
CREATE INDEX IF NOT EXISTS idx_services_site_id ON services(site_id);
CREATE INDEX IF NOT EXISTS idx_leads_owner_stage ON leads(owner_user_id, stage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_partner_stage ON leads(partner_id, stage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_assignee_status ON lead_tasks(assignee_user_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_feasibility_requests_customer_status ON feasibility_requests(customer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feasibility_requests_assigned_status ON feasibility_requests(assigned_engineer_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_customer_status ON payments(customer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
