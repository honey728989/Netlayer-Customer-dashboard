INSERT INTO roles (name, description)
VALUES
  ('SUPER_ADMIN', 'Full platform access'),
  ('NOC_ENGINEER', 'NOC operations and monitoring'),
  ('ENTERPRISE_ADMIN', 'Customer admin operations'),
  ('ENTERPRISE_USER', 'Customer read/write limited operations'),
  ('PARTNER_ADMIN', 'Partner admin access'),
  ('PARTNER_USER', 'Partner standard access')
ON CONFLICT (name) DO NOTHING;
