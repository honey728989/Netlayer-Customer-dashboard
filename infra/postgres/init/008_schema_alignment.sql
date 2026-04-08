-- ============================================================
-- 008_schema_alignment.sql  — Align schema with service expectations
-- ============================================================

-- ─── Extend leads table ─────────────────────────────────────────────────────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS owner_user_id           UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS bandwidth_required_mbps INTEGER,
  ADD COLUMN IF NOT EXISTS expected_mrc             NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS expected_nrc             NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS expected_close_date      DATE,
  ADD COLUMN IF NOT EXISTS probability_percent      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS converted_at             TIMESTAMPTZ;

-- Sync alias columns (copy from original cols if populated)
UPDATE leads SET owner_user_id = assigned_to WHERE owner_user_id IS NULL AND assigned_to IS NOT NULL;
UPDATE leads SET bandwidth_required_mbps = bandwidth_mbps WHERE bandwidth_required_mbps IS NULL AND bandwidth_mbps IS NOT NULL;
UPDATE leads SET expected_mrc = expected_value WHERE expected_mrc IS NULL AND expected_value IS NOT NULL;

-- ─── Extend lead_activities table ────────────────────────────────────────────

ALTER TABLE lead_activities
  ADD COLUMN IF NOT EXISTS author_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS activity_type  VARCHAR(32),
  ADD COLUMN IF NOT EXISTS body           TEXT,
  ADD COLUMN IF NOT EXISTS metadata       JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE lead_activities SET author_user_id = actor_id WHERE author_user_id IS NULL AND actor_id IS NOT NULL;
UPDATE lead_activities SET activity_type  = activity   WHERE activity_type  IS NULL AND activity IS NOT NULL;
UPDATE lead_activities SET body           = notes       WHERE body           IS NULL AND notes IS NOT NULL;

-- ─── Lead Tasks ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assignee_user_id  UUID REFERENCES users(id),
  title             VARCHAR(255) NOT NULL,
  task_type         VARCHAR(32) DEFAULT 'FOLLOW_UP',
  status            VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  due_at            TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead_id    ON lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_assignee   ON lead_tasks(assignee_user_id, status);

-- ─── Extend feasibility_requests ────────────────────────────────────────────

ALTER TABLE feasibility_requests
  ADD COLUMN IF NOT EXISTS assigned_engineer_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS request_code              VARCHAR(32) UNIQUE,
  ADD COLUMN IF NOT EXISTS site_name                 VARCHAR(160),
  ADD COLUMN IF NOT EXISTS requested_by_user_id      UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS survey_scheduled_for      DATE,
  ADD COLUMN IF NOT EXISTS feasibility_summary       TEXT,
  ADD COLUMN IF NOT EXISTS estimated_capex           NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS estimated_mrc             NUMERIC(14,2);

-- Sync alias columns
UPDATE feasibility_requests SET assigned_engineer_user_id = surveyed_by             WHERE assigned_engineer_user_id IS NULL AND surveyed_by IS NOT NULL;
UPDATE feasibility_requests SET site_name                  = company_name             WHERE site_name IS NULL AND company_name IS NOT NULL;
UPDATE feasibility_requests SET requested_by_user_id       = requested_by             WHERE requested_by_user_id IS NULL AND requested_by IS NOT NULL;
UPDATE feasibility_requests SET survey_scheduled_for       = survey_date              WHERE survey_scheduled_for IS NULL AND survey_date IS NOT NULL;
UPDATE feasibility_requests SET feasibility_summary        = result_notes             WHERE feasibility_summary IS NULL AND result_notes IS NOT NULL;
UPDATE feasibility_requests SET estimated_mrc              = estimated_cost            WHERE estimated_mrc IS NULL AND estimated_cost IS NOT NULL;

-- Auto-generate request codes where missing
UPDATE feasibility_requests
  SET request_code = 'FEAS-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 4, '0')
WHERE request_code IS NULL;

-- ─── Add feasibility_request_id alias on feasibility_comments ───────────────

ALTER TABLE feasibility_comments
  ADD COLUMN IF NOT EXISTS feasibility_request_id UUID REFERENCES feasibility_requests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS author_user_id          UUID REFERENCES users(id);

UPDATE feasibility_comments SET feasibility_request_id = feasibility_id WHERE feasibility_request_id IS NULL AND feasibility_id IS NOT NULL;
UPDATE feasibility_comments SET author_user_id = author_id WHERE author_user_id IS NULL AND author_id IS NOT NULL;

-- ─── Extend ticket_comments ──────────────────────────────────────────────────

ALTER TABLE ticket_comments
  ADD COLUMN IF NOT EXISTS author_user_id UUID REFERENCES users(id);

UPDATE ticket_comments SET author_user_id = author_id WHERE author_user_id IS NULL AND author_id IS NOT NULL;

-- ─── Payments Table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  invoice_id      UUID REFERENCES billing_invoices(id),
  amount          NUMERIC(14,2) NOT NULL,
  status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  payment_method  VARCHAR(32),
  payment_link    TEXT,
  paid_at         TIMESTAMPTZ,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);

-- ─── Dashboard billing summary view ─────────────────────────────────────────

CREATE OR REPLACE VIEW billing_summary AS
SELECT
  c.id AS customer_id,
  c.name AS customer_name,
  c.tier,
  c.monthly_recurring_revenue,
  COUNT(DISTINCT bi.id) AS total_invoices,
  COUNT(DISTINCT bi.id) FILTER (WHERE bi.status = 'OVERDUE') AS overdue_count,
  COALESCE(SUM((bi.payload->>'total')::numeric) FILTER (WHERE bi.status = 'OVERDUE'), 0) AS overdue_amount,
  COALESCE(SUM((bi.payload->>'total')::numeric) FILTER (WHERE bi.payment_status = 'UNPAID'), 0) AS outstanding_amount
FROM customers c
LEFT JOIN billing_invoices bi ON bi.customer_id = c.id
GROUP BY c.id, c.name, c.tier, c.monthly_recurring_revenue;
