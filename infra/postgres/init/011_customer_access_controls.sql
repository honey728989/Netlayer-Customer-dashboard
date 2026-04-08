CREATE TABLE IF NOT EXISTS customer_site_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  group_type VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, name)
);

CREATE TABLE IF NOT EXISTS customer_site_group_members (
  group_id UUID NOT NULL REFERENCES customer_site_groups(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, site_id)
);

CREATE TABLE IF NOT EXISTS customer_user_site_access (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  access_level VARCHAR(32) NOT NULL DEFAULT 'OPERATIONS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_site_groups_customer_id
  ON customer_site_groups(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_site_group_members_site_id
  ON customer_site_group_members(site_id);

CREATE INDEX IF NOT EXISTS idx_customer_user_site_access_site_id
  ON customer_user_site_access(site_id);
