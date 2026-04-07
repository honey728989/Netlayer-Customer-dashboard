INSERT INTO partners (code, name, region, status, commission_plan)
VALUES ('PARTNER-DEMO-001', 'Velocity Channel Partners', 'North India', 'ACTIVE', 'STANDARD_12')
ON CONFLICT (code) DO NOTHING;

INSERT INTO users (partner_id, email, full_name, password_hash, is_active)
SELECT
  p.id,
  'partner@netlayer.local',
  'Velocity Partner Admin',
  '$2b$10$z1WbhP25vaSzg8tJ4ZaX1uSSLIl/M6Pia.Auy2ZgK09xVF1aJ7shG',
  TRUE
FROM partners p
WHERE p.code = 'PARTNER-DEMO-001'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, full_name, password_hash, is_active)
VALUES
  ('sales@netlayer.local', 'Riya Sales', '$2b$10$LzqD8nwgMZhITMVk5UYyLOvEhf02HSxAvWlMtoAFefWScYI02zJke', TRUE),
  ('finance@netlayer.local', 'Aman Finance', '$2b$10$9.0VgdehP8YODCHFpgq3S.7vCJh0J3.ddkbwjVJgPHa3Ngy/uE/Y2', TRUE),
  ('field@netlayer.local', 'Karan Field', '$2b$10$hc06RFpI0siUxTr5nuKHve.VLsH5VJJddSOu8f7/yty7v3OcdPxGq', TRUE),
  ('customer.ops@netlayer.local', 'Acme Ops User', '$2b$10$VFZMgeJ7Qmmdz2WBe4vQyO83hSZcqQ/pPmE48r0geqB0wBjbTtf/G', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON (
  (u.email = 'partner@netlayer.local' AND r.name = 'PARTNER_ADMIN') OR
  (u.email = 'sales@netlayer.local' AND r.name = 'SALES_EXECUTIVE') OR
  (u.email = 'finance@netlayer.local' AND r.name = 'FINANCE_USER') OR
  (u.email = 'field@netlayer.local' AND r.name = 'FIELD_ENGINEER') OR
  (u.email = 'customer.ops@netlayer.local' AND r.name = 'ENTERPRISE_USER')
)
ON CONFLICT DO NOTHING;

UPDATE customers c
SET
  partner_id = p.id,
  sales_owner_user_id = su.id,
  billing_email = 'billing@acmemfg.example',
  primary_contact_name = 'Rahul Verma',
  primary_contact_phone = '+91-9876543210',
  contract_start_date = CURRENT_DATE - INTERVAL '180 days',
  contract_end_date = CURRENT_DATE + INTERVAL '185 days'
FROM partners p, users su
WHERE c.code = 'CUST-DEMO-001'
  AND p.code = 'PARTNER-DEMO-001'
  AND su.email = 'sales@netlayer.local';

UPDATE users u
SET customer_id = c.id
FROM customers c
WHERE u.email = 'customer.ops@netlayer.local'
  AND c.code = 'CUST-DEMO-001';

INSERT INTO customer_contacts (customer_id, name, email, phone, role, is_primary)
SELECT c.id, 'Rahul Verma', 'rahul.verma@acmemfg.example', '+91-9876543210', 'IT Manager', TRUE
FROM customers c
WHERE c.code = 'CUST-DEMO-001'
ON CONFLICT DO NOTHING;

INSERT INTO customer_contacts (customer_id, name, email, phone, role, is_primary)
SELECT c.id, 'Priya Menon', 'priya.menon@acmemfg.example', '+91-9811122233', 'Network Ops', FALSE
FROM customers c
WHERE c.code = 'CUST-DEMO-001'
ON CONFLICT DO NOTHING;

INSERT INTO sites (
  customer_id, code, name, region, status, address, city, state, latitude, longitude,
  installation_status, last_mile_provider, pop_name, dashboard_uid
)
SELECT
  c.id, 'SITE-BLR-HQ', 'Bangalore HQ', 'South', 'UP',
  'Manyata Tech Park, Bengaluru', 'Bengaluru', 'Karnataka', 13.049980, 77.620560,
  'LIVE', 'Airtel Last Mile', 'BLR-POP-01', 'grafana-acme-bangalore'
FROM customers c
WHERE c.code = 'CUST-DEMO-001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO sites (
  customer_id, code, name, region, status, address, city, state, latitude, longitude,
  installation_status, last_mile_provider, pop_name, dashboard_uid
)
SELECT
  c.id, 'SITE-HYD-DR', 'Hyderabad DR', 'South', 'DEGRADED',
  'HITEC City, Hyderabad', 'Hyderabad', 'Telangana', 17.443500, 78.377200,
  'LIVE', 'Tata Teleservices', 'HYD-POP-03', 'grafana-acme-hyderabad'
FROM customers c
WHERE c.code = 'CUST-DEMO-001'
ON CONFLICT (code) DO NOTHING;

INSERT INTO services (
  customer_id, site_id, service_id, circuit_id, service_type, bandwidth_mbps, provider,
  pop_name, last_mile_provider, static_ip_block, grafana_dashboard_uid, zabbix_host_group,
  status, activated_at, contract_start_date, contract_end_date, monthly_recurring_charge,
  non_recurring_charge, metadata
)
SELECT
  c.id, s.id, 'SRV-ILL-BLR-001', 'CKT-BLR-001', 'ILL', 500, 'Netlayer',
  s.pop_name, s.last_mile_provider, '103.44.10.0/29', 'grafana-acme-bangalore', 'ACME_BLR',
  'ACTIVE', NOW() - INTERVAL '150 days', CURRENT_DATE - INTERVAL '180 days', CURRENT_DATE + INTERVAL '185 days',
  125000, 25000, jsonb_build_object('redundancy', true, 'billingModel', 'MRC')
FROM customers c
JOIN sites s ON s.customer_id = c.id AND s.code = 'SITE-BLR-HQ'
WHERE c.code = 'CUST-DEMO-001'
ON CONFLICT (service_id) DO NOTHING;

INSERT INTO services (
  customer_id, site_id, service_id, circuit_id, service_type, bandwidth_mbps, provider,
  pop_name, last_mile_provider, static_ip_block, grafana_dashboard_uid, zabbix_host_group,
  status, activated_at, contract_start_date, contract_end_date, monthly_recurring_charge,
  non_recurring_charge, metadata
)
SELECT
  c.id, s.id, 'SRV-BB-HYD-002', 'CKT-HYD-002', 'Business Broadband', 200, 'Netlayer',
  s.pop_name, s.last_mile_provider, '103.44.11.0/29', 'grafana-acme-hyderabad', 'ACME_HYD',
  'ACTIVE', NOW() - INTERVAL '90 days', CURRENT_DATE - INTERVAL '120 days', CURRENT_DATE + INTERVAL '245 days',
  55000, 15000, jsonb_build_object('redundancy', false, 'billingModel', 'MRC')
FROM customers c
JOIN sites s ON s.customer_id = c.id AND s.code = 'SITE-HYD-DR'
WHERE c.code = 'CUST-DEMO-001'
ON CONFLICT (service_id) DO NOTHING;

INSERT INTO leads (
  partner_id, owner_user_id, source, company_name, contact_name, contact_email, contact_phone,
  service_type, bandwidth_required_mbps, city, state, expected_mrc, expected_nrc,
  stage, probability_percent, notes, expected_close_date
)
SELECT
  p.id, u.id, 'PARTNER_REFERRAL', 'Zenith Retail Pvt Ltd', 'Ankit Shah', 'ankit@zenith.example', '+91-9811000001',
  'ILL', 300, 'Mumbai', 'Maharashtra', 85000, 30000,
  'PROPOSAL', 65, 'Customer needs primary link before branch launch.', CURRENT_DATE + INTERVAL '20 days'
FROM partners p, users u
WHERE p.code = 'PARTNER-DEMO-001' AND u.email = 'sales@netlayer.local'
ON CONFLICT DO NOTHING;

INSERT INTO lead_activities (lead_id, author_user_id, activity_type, body, metadata)
SELECT
  l.id, u.id, 'MEETING', 'Requirement discovery completed. Proposal to be shared with dual last-mile option.', jsonb_build_object('nextStep', 'Send quotation')
FROM leads l, users u
WHERE l.company_name = 'Zenith Retail Pvt Ltd' AND u.email = 'sales@netlayer.local'
ON CONFLICT DO NOTHING;

INSERT INTO lead_tasks (lead_id, assignee_user_id, title, due_at, status, priority)
SELECT
  l.id, u.id, 'Share final commercial proposal', NOW() + INTERVAL '2 days', 'OPEN', 'HIGH'
FROM leads l, users u
WHERE l.company_name = 'Zenith Retail Pvt Ltd' AND u.email = 'sales@netlayer.local'
ON CONFLICT DO NOTHING;

INSERT INTO feasibility_requests (
  customer_id, requested_by_user_id, assigned_engineer_user_id, source, request_code, site_name,
  address, city, state, pincode, latitude, longitude, contact_name, contact_email, contact_phone,
  service_type, bandwidth_required_mbps, redundancy_required, expected_go_live_date, status,
  survey_scheduled_for, survey_notes, feasibility_summary, estimated_capex, estimated_mrc
)
SELECT
  c.id, cu.id, fu.id, 'CUSTOMER_PORTAL', 'FEAS-0001', 'Pune Warehouse',
  'Chakan Industrial Area, Pune', 'Pune', 'Maharashtra', '410501', 18.761400, 73.864100,
  'Rahul Verma', 'rahul.verma@acmemfg.example', '+91-9876543210',
  'ILL', 300, TRUE, CURRENT_DATE + INTERVAL '30 days', 'SURVEY_SCHEDULED',
  NOW() + INTERVAL '1 day', 'POP capacity available. Awaiting LOS survey.', 'Likely feasible with fiber extension.', 45000, 78000
FROM customers c, users cu, users fu
WHERE c.code = 'CUST-DEMO-001'
  AND cu.email = 'customer@netlayer.local'
  AND fu.email = 'field@netlayer.local'
ON CONFLICT (request_code) DO NOTHING;

INSERT INTO feasibility_comments (feasibility_request_id, author_user_id, body, is_internal)
SELECT
  f.id, fu.id, 'Survey scheduled for tomorrow morning. Need building access confirmation.', TRUE
FROM feasibility_requests f, users fu
WHERE f.request_code = 'FEAS-0001' AND fu.email = 'field@netlayer.local'
ON CONFLICT DO NOTHING;

INSERT INTO payments (customer_id, amount, currency, status, payment_method, payment_link, payload)
SELECT
  c.id, 125000, 'INR', 'PENDING', 'ZOHO_PAYMENT_LINK',
  'https://payments.example.test/acme/invoice/2026-04',
  jsonb_build_object('source', 'zoho', 'description', 'April recurring invoice')
FROM customers c
WHERE c.code = 'CUST-DEMO-001'
ON CONFLICT DO NOTHING;

INSERT INTO commissions (partner_id, commission_period, gross_revenue, commission_rate, commission_amount, status)
SELECT
  p.id, date_trunc('month', CURRENT_DATE)::date, 125000, 12.00, 15000, 'APPROVED'
FROM partners p
WHERE p.code = 'PARTNER-DEMO-001'
ON CONFLICT (partner_id, commission_period) DO NOTHING;
