-- ============================================================
-- 006_extended_schema.sql  — Netlayer full telecom domain model
-- ============================================================

-- ─── Extend sites with geo and service metadata ──────────────────────────────

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS city         VARCHAR(80),
  ADD COLUMN IF NOT EXISTS state        VARCHAR(80),
  ADD COLUMN IF NOT EXISTS latitude     NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude    NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS ip_block     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS pop          VARCHAR(80),
  ADD COLUMN IF NOT EXISTS last_mile_provider VARCHAR(80),
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS go_live_date DATE;

-- ─── Extend customers ────────────────────────────────────────────────────────

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS industry          VARCHAR(80),
  ADD COLUMN IF NOT EXISTS gstin             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS pan               VARCHAR(10),
  ADD COLUMN IF NOT EXISTS billing_address   TEXT,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(32) DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS sales_executive   VARCHAR(160),
  ADD COLUMN IF NOT EXISTS notes             TEXT;

-- ─── Services / Circuits ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  site_id          UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  service_id       VARCHAR(32) UNIQUE NOT NULL,   -- internal service ref e.g. SVC-ILL-001
  circuit_id       VARCHAR(64),                   -- provider circuit ID
  service_type     VARCHAR(32) NOT NULL,          -- ILL | BB | MPLS | SIP | MANAGED
  bandwidth_mbps   INTEGER NOT NULL DEFAULT 100,
  pop              VARCHAR(80),
  last_mile        VARCHAR(80),
  ip_block         VARCHAR(50),
  static_ip        INET,
  status           VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  activation_date  DATE,
  contract_end_date DATE,
  contract_months  INTEGER,
  monthly_charge   NUMERIC(14,2),
  notes            TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_customer_id ON services(customer_id);
CREATE INDEX IF NOT EXISTS idx_services_site_id ON services(site_id);

-- ─── Customer Contacts ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer_contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name         VARCHAR(160) NOT NULL,
  designation  VARCHAR(80),
  email        VARCHAR(255),
  phone        VARCHAR(20),
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  contact_type VARCHAR(32) DEFAULT 'TECHNICAL',  -- TECHNICAL | BILLING | ESCALATION | SALES
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);

-- ─── Leads ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       UUID REFERENCES partners(id),
  assigned_to      UUID REFERENCES users(id),
  company_name     VARCHAR(160) NOT NULL,
  contact_name     VARCHAR(160) NOT NULL,
  contact_email    VARCHAR(255),
  contact_phone    VARCHAR(20),
  city             VARCHAR(80),
  state            VARCHAR(80),
  source           VARCHAR(32) NOT NULL DEFAULT 'DIRECT',  -- DIRECT | PARTNER | REFERRAL | INBOUND | CAMPAIGN
  stage            VARCHAR(32) NOT NULL DEFAULT 'NEW',     -- NEW | CONTACTED | QUALIFIED | PROPOSAL | NEGOTIATION | WON | LOST
  expected_value   NUMERIC(14,2),
  service_type     VARCHAR(32),          -- ILL | BB | MPLS | SIP
  bandwidth_mbps   INTEGER,
  expected_go_live DATE,
  lost_reason      TEXT,
  notes            TEXT,
  converted_customer_id UUID REFERENCES customers(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_partner_id ON leads(partner_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);

-- ─── Lead Activities ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES users(id),
  activity    VARCHAR(32) NOT NULL,   -- CALL | EMAIL | MEETING | NOTE | STAGE_CHANGE | FOLLOW_UP
  notes       TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);

-- ─── Feasibility Requests ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feasibility_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id          UUID REFERENCES customers(id),
  lead_id              UUID REFERENCES leads(id),
  requested_by         UUID REFERENCES users(id),
  source               VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER',  -- CUSTOMER | PARTNER | SALES | ADMIN
  company_name         VARCHAR(160),
  contact_name         VARCHAR(160) NOT NULL,
  contact_email        VARCHAR(255),
  contact_phone        VARCHAR(20),
  address              TEXT NOT NULL,
  city                 VARCHAR(80) NOT NULL,
  state                VARCHAR(80) NOT NULL,
  pincode              VARCHAR(10),
  latitude             NUMERIC(10,7),
  longitude            NUMERIC(10,7),
  service_type         VARCHAR(32) NOT NULL,    -- ILL | BB | MPLS | SIP
  bandwidth_mbps       INTEGER NOT NULL,
  redundancy_required  BOOLEAN NOT NULL DEFAULT FALSE,
  expected_go_live     DATE,
  status               VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
  -- REQUESTED | UNDER_REVIEW | SURVEY_SCHEDULED | FEASIBLE | PARTIALLY_FEASIBLE | NOT_FEASIBLE
  -- QUOTATION_SHARED | CONVERTED | CLOSED
  survey_date          DATE,
  surveyed_by          UUID REFERENCES users(id),
  result_notes         TEXT,
  estimated_cost       NUMERIC(14,2),
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feasibility_customer_id ON feasibility_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_feasibility_status ON feasibility_requests(status);

-- ─── Feasibility Comments ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feasibility_comments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feasibility_id   UUID NOT NULL REFERENCES feasibility_requests(id) ON DELETE CASCADE,
  author_id        UUID REFERENCES users(id),
  body             TEXT NOT NULL,
  is_internal      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Ticket Comments ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ticket_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES users(id),
  body        TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);

-- ─── Implementation / Field Tasks ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS implementation_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  site_id         UUID REFERENCES sites(id),
  service_id      UUID REFERENCES services(id),
  task_type       VARCHAR(32) NOT NULL,  -- SURVEY | INSTALLATION | PROVISIONING | HANDOVER
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  assigned_to     UUID REFERENCES users(id),
  status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  -- PENDING | SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
  scheduled_date  DATE,
  completed_date  DATE,
  checklist       JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_impl_tasks_customer_id ON implementation_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_impl_tasks_assigned_to ON implementation_tasks(assigned_to);

-- ─── Notification Events ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  customer_id UUID REFERENCES customers(id),
  event_type  VARCHAR(64) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_events_user_id ON notification_events(user_id, created_at DESC);

-- ─── Audit Log ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id),
  entity_type VARCHAR(64) NOT NULL,
  entity_id   UUID,
  action      VARCHAR(64) NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);

-- ─── SLA Profiles ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sla_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(64) UNIQUE NOT NULL,
  uptime_target_pct     NUMERIC(5,2) NOT NULL DEFAULT 99.90,
  response_minutes      INTEGER NOT NULL DEFAULT 15,
  resolution_minutes    INTEGER NOT NULL DEFAULT 240,
  description           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sla_profiles (name, uptime_target_pct, response_minutes, resolution_minutes, description)
VALUES
  ('Platinum', 99.99, 15,  120, 'Highest tier SLA'),
  ('Gold',     99.95, 30,  240, 'Premium enterprise SLA'),
  ('Silver',   99.50, 60,  480, 'Standard enterprise SLA'),
  ('Bronze',   99.00, 120, 720, 'Basic SLA')
ON CONFLICT (name) DO NOTHING;
