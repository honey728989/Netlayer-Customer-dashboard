CREATE TABLE IF NOT EXISTS customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID REFERENCES users(id),
  linked_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(32) NOT NULL DEFAULT 'OTHER',
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id
  ON customer_documents(customer_id, created_at DESC);
