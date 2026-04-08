INSERT INTO users (customer_id, email, full_name, password_hash, is_active)
SELECT
  c.id,
  'customer.finance@netlayer.local',
  'Acme Finance User',
  '$2b$10$VFZMgeJ7Qmmdz2WBe4vQyO83hSZcqQ/pPmE48r0geqB0wBjbTtf/G',
  TRUE
FROM customers c
WHERE c.code = 'CUST-DEMO-001'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (customer_id, email, full_name, password_hash, is_active)
SELECT
  c.id,
  'customer.branch@netlayer.local',
  'Acme Branch Manager',
  '$2b$10$VFZMgeJ7Qmmdz2WBe4vQyO83hSZcqQ/pPmE48r0geqB0wBjbTtf/G',
  TRUE
FROM customers c
WHERE c.code = 'CUST-DEMO-001'
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'ENTERPRISE_USER'
WHERE u.email IN ('customer.finance@netlayer.local', 'customer.branch@netlayer.local')
ON CONFLICT DO NOTHING;

INSERT INTO customer_contacts (customer_id, name, email, phone, role, is_primary)
SELECT c.id, 'Amit Arora', 'customer.finance@netlayer.local', '+91-9988776655', 'Finance Controller', FALSE
FROM customers c
WHERE c.code = 'CUST-DEMO-001'
ON CONFLICT DO NOTHING;

INSERT INTO customer_contacts (customer_id, name, email, phone, role, is_primary)
SELECT c.id, 'Nisha Rao', 'customer.branch@netlayer.local', '+91-9922334455', 'Branch IT Manager', FALSE
FROM customers c
WHERE c.code = 'CUST-DEMO-001'
ON CONFLICT DO NOTHING;

INSERT INTO customer_site_groups (customer_id, name, description, group_type, created_by_user_id)
SELECT
  c.id,
  'North Cluster',
  'Primary production sites across the north region',
  'MANUAL',
  u.id
FROM customers c
JOIN users u ON u.email = 'customer@netlayer.local'
WHERE c.code = 'CUST-DEMO-001'
ON CONFLICT (customer_id, name) DO NOTHING;

INSERT INTO customer_site_groups (customer_id, name, description, group_type, created_by_user_id)
SELECT
  c.id,
  'DR and Backup',
  'Disaster recovery and backup sites',
  'MANUAL',
  u.id
FROM customers c
JOIN users u ON u.email = 'customer@netlayer.local'
WHERE c.code = 'CUST-DEMO-001'
ON CONFLICT (customer_id, name) DO NOTHING;

INSERT INTO customer_site_group_members (group_id, site_id)
SELECT g.id, s.id
FROM customer_site_groups g
JOIN customers c ON c.id = g.customer_id
JOIN sites s ON s.customer_id = c.id
WHERE c.code = 'CUST-DEMO-001'
  AND g.name = 'North Cluster'
  AND s.code IN ('SITE-ACME-HQ', 'SITE-ACME-PLANT1', 'SITE-ACME-WHOUSE')
ON CONFLICT DO NOTHING;

INSERT INTO customer_site_group_members (group_id, site_id)
SELECT g.id, s.id
FROM customer_site_groups g
JOIN customers c ON c.id = g.customer_id
JOIN sites s ON s.customer_id = c.id
WHERE c.code = 'CUST-DEMO-001'
  AND g.name = 'DR and Backup'
  AND s.code IN ('SITE-HYD-DR', 'SITE-ACME-WHOUSE')
ON CONFLICT DO NOTHING;

INSERT INTO customer_user_site_access (user_id, site_id, access_level)
SELECT u.id, s.id, 'FINANCE'
FROM users u
JOIN customers c ON c.id = u.customer_id
JOIN sites s ON s.customer_id = c.id
WHERE u.email = 'customer.finance@netlayer.local'
  AND c.code = 'CUST-DEMO-001'
ON CONFLICT (user_id, site_id) DO NOTHING;

INSERT INTO customer_user_site_access (user_id, site_id, access_level)
SELECT u.id, s.id, 'OPERATIONS'
FROM users u
JOIN customers c ON c.id = u.customer_id
JOIN sites s ON s.customer_id = c.id
WHERE u.email = 'customer.branch@netlayer.local'
  AND c.code = 'CUST-DEMO-001'
  AND s.code IN ('SITE-ACME-HQ', 'SITE-ACME-PLANT1')
ON CONFLICT (user_id, site_id) DO NOTHING;
