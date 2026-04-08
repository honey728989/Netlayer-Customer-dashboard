INSERT INTO customer_service_requests (
  customer_id,
  requested_by_user_id,
  request_code,
  request_type,
  priority,
  title,
  description,
  service_id,
  site_id,
  target_value,
  status,
  metadata
)
SELECT
  c.id,
  u.id,
  'CSR-DEMO-1001',
  'BANDWIDTH_UPGRADE',
  'HIGH',
  'Upgrade HQ bandwidth to 500 Mbps',
  'Business operations have outgrown the current committed bandwidth. Please evaluate upgrade on the primary HQ service.',
  sv.id,
  s.id,
  '500 Mbps',
  'UNDER_REVIEW',
  '{"justification":"Quarterly bandwidth growth"}'::jsonb
FROM customers c
JOIN users u ON u.customer_id = c.id AND u.email = 'customer@netlayer.local'
JOIN sites s ON s.customer_id = c.id
JOIN services sv ON sv.site_id = s.id
WHERE c.code = 'CUST-001'
ORDER BY s.name, sv.service_id
LIMIT 1
ON CONFLICT (request_code) DO NOTHING;

INSERT INTO customer_service_requests (
  customer_id,
  requested_by_user_id,
  request_code,
  request_type,
  priority,
  title,
  description,
  site_id,
  target_value,
  status,
  metadata
)
SELECT
  c.id,
  u.id,
  'CSR-DEMO-1002',
  'RELOCATION',
  'MEDIUM',
  'Relocate branch connectivity to new office',
  'Current branch is shifting to a new premises next month. Need service relocation planning and downtime window guidance.',
  s.id,
  'New office possession by month end',
  'REQUESTED',
  '{"targetCity":"Noida"}'::jsonb
FROM customers c
JOIN users u ON u.customer_id = c.id AND u.email = 'customer.branch@netlayer.local'
JOIN sites s ON s.customer_id = c.id
WHERE c.code = 'CUST-001'
ORDER BY s.name DESC
LIMIT 1
ON CONFLICT (request_code) DO NOTHING;
