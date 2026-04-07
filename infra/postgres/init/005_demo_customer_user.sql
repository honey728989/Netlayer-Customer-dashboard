INSERT INTO customers (
  code,
  name,
  tier,
  status,
  account_manager,
  sla_profile,
  monthly_recurring_revenue,
  annual_contract_value
)
VALUES (
  'CUST-DEMO-001',
  'Acme Manufacturing',
  'ENTERPRISE',
  'ACTIVE',
  'Netlayer Support',
  'Gold',
  125000,
  1500000
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO users (
  customer_id,
  email,
  full_name,
  password_hash,
  is_active
)
SELECT
  c.id,
  'customer@netlayer.local',
  'Acme Customer Admin',
  '$2b$10$VFZMgeJ7Qmmdz2WBe4vQyO83hSZcqQ/pPmE48r0geqB0wBjbTtf/G',
  TRUE
FROM customers c
WHERE c.code = 'CUST-DEMO-001'
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'ENTERPRISE_ADMIN'
WHERE u.email = 'customer@netlayer.local'
ON CONFLICT DO NOTHING;
