CREATE TABLE IF NOT EXISTS alert_deduplication (
  dedupe_key VARCHAR(128) PRIMARY KEY,
  external_id VARCHAR(128) NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  suppressed_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alert_deduplication_expires_at
  ON alert_deduplication (expires_at);

CREATE TABLE IF NOT EXISTS zoho_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(128) UNIQUE NOT NULL,
  invoice_id VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE zoho_webhook_events
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_zoho_webhook_events_status
  ON zoho_webhook_events (processing_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_zoho_webhook_events_retry
  ON zoho_webhook_events (processing_status, next_retry_at);
