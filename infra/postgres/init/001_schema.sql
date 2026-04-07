CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(64) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  region VARCHAR(80) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  commission_plan VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id),
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  tier VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  account_manager VARCHAR(160) NOT NULL,
  sla_profile VARCHAR(64) NOT NULL,
  sla_uptime_target NUMERIC(5,2) NOT NULL DEFAULT 99.90,
  sla_response_minutes INTEGER NOT NULL DEFAULT 15,
  sla_resolution_minutes INTEGER NOT NULL DEFAULT 240,
  monthly_recurring_revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  annual_contract_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  zoho_customer_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  partner_id UUID REFERENCES partners(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  region VARCHAR(80) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'UP',
  address TEXT NOT NULL,
  dashboard_uid VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  hostname VARCHAR(160) NOT NULL,
  ip_address INET NOT NULL,
  vendor VARCHAR(80) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ONLINE',
  zabbix_host_id VARCHAR(64) UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(128) UNIQUE,
  site_id UUID NOT NULL REFERENCES sites(id),
  device_id UUID REFERENCES devices(id),
  severity VARCHAR(8) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  source VARCHAR(32) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  site_id UUID REFERENCES sites(id),
  alert_id UUID UNIQUE REFERENCES alerts(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(8) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  source VARCHAR(32) NOT NULL,
  opened_by UUID REFERENCES users(id),
  assignee_id UUID REFERENCES users(id),
  response_due_at TIMESTAMPTZ,
  resolution_due_at TIMESTAMPTZ,
  resolution_summary TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE site_traffic_metrics (
  id BIGSERIAL PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  metric_time TIMESTAMPTZ NOT NULL,
  inbound_bps BIGINT NOT NULL,
  outbound_bps BIGINT NOT NULL,
  latency_ms NUMERIC(10,2) NOT NULL,
  packet_loss_pct NUMERIC(5,2) NOT NULL,
  UNIQUE (site_id, metric_time)
);

CREATE TABLE billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  zoho_invoice_id VARCHAR(64) UNIQUE NOT NULL,
  status VARCHAR(32) NOT NULL,
  payment_status VARCHAR(32),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  commission_period DATE NOT NULL,
  gross_revenue NUMERIC(14,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(14,2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (partner_id, commission_period)
);

CREATE INDEX idx_users_customer_id ON users(customer_id);
CREATE INDEX idx_users_partner_id ON users(partner_id);
CREATE INDEX idx_sites_customer_id ON sites(customer_id);
CREATE INDEX idx_devices_site_id ON devices(site_id);
CREATE INDEX idx_alerts_site_id_created_at ON alerts(site_id, created_at DESC);
CREATE INDEX idx_tickets_customer_id_created_at ON tickets(customer_id, created_at DESC);
CREATE INDEX idx_billing_invoices_customer_id ON billing_invoices(customer_id);
CREATE INDEX idx_commissions_partner_id_period ON commissions(partner_id, commission_period DESC);
