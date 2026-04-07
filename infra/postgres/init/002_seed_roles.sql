INSERT INTO roles (name, description)
VALUES
  ('SUPER_ADMIN', 'Full platform access'),
  ('NOC_ENGINEER', 'NOC operations and monitoring'),
  ('ENTERPRISE_ADMIN', 'Customer admin operations'),
  ('ENTERPRISE_USER', 'Customer read/write limited operations'),
  ('PARTNER_ADMIN', 'Partner admin access'),
  ('PARTNER_USER', 'Partner standard access'),
  ('SALES_EXECUTIVE', 'Sales pipeline and account acquisition access'),
  ('FINANCE_USER', 'Billing, invoices, and collections access'),
  ('FIELD_ENGINEER', 'Implementation, survey, and installation access')
ON CONFLICT (name) DO NOTHING;
