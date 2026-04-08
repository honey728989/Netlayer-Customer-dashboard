ALTER TABLE customer_contacts
  ADD COLUMN IF NOT EXISTS role VARCHAR(80),
  ADD COLUMN IF NOT EXISTS designation VARCHAR(80),
  ADD COLUMN IF NOT EXISTS contact_type VARCHAR(32);

CREATE TABLE IF NOT EXISTS customer_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  requested_by_user_id UUID REFERENCES users(id),
  request_code VARCHAR(32) NOT NULL UNIQUE,
  request_type VARCHAR(40) NOT NULL,
  priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  target_value VARCHAR(160),
  status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_service_requests_customer_status
  ON customer_service_requests(customer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_service_requests_site_id
  ON customer_service_requests(site_id);
