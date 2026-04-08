-- ============================================================
-- 007_comprehensive_seed.sql  — Full demo data for Netlayer
-- All passwords are: Demo@1234
-- ============================================================

-- ─── Additional Roles ────────────────────────────────────────────────────────

INSERT INTO roles (name, description) VALUES
  ('SALES_EXECUTIVE', 'Sales executive managing leads and pipeline'),
  ('FINANCE_USER',    'Finance team member for billing and collections'),
  ('FIELD_ENGINEER',  'Field engineer for installation and surveys'),
  ('PARTNER_ADMIN',   'Partner account administrator'),
  ('PARTNER_USER',    'Standard partner portal user')
ON CONFLICT (name) DO NOTHING;

-- ─── Partners ────────────────────────────────────────────────────────────────

INSERT INTO partners (code, name, region, status, commission_plan) VALUES
  ('PTR-APEX',  'Apex Connectivity Solutions', 'North India',  'ACTIVE', 'STANDARD_10'),
  ('PTR-NEXUS', 'Nexus Telecom Partners',       'South India',  'ACTIVE', 'PREMIUM_12'),
  ('PTR-BRIDGE','Bridge ISP Services',          'West India',   'ACTIVE', 'STANDARD_10'),
  ('PTR-EAST',  'EastLink Technologies',        'East India',   'ACTIVE', 'BASIC_8')
ON CONFLICT (code) DO NOTHING;

-- ─── Customers ───────────────────────────────────────────────────────────────

INSERT INTO customers (
  partner_id, code, name, tier, status, account_manager,
  sla_profile, sla_uptime_target, sla_response_minutes, sla_resolution_minutes,
  monthly_recurring_revenue, annual_contract_value, industry,
  gstin, billing_address, contract_end_date, sales_executive, zoho_customer_id
) VALUES
  (
    (SELECT id FROM partners WHERE code = 'PTR-APEX'),
    'CUST-DEMO-001', 'Acme Manufacturing Ltd', 'ENTERPRISE', 'ACTIVE',
    'Rajan Kumar', 'Gold', 99.95, 30, 240,
    125000, 1500000, 'Manufacturing',
    '07AAACR5055K1Z5', '45, Industrial Area, Phase II, Chandigarh - 160002',
    '2026-03-31', 'Priya Sharma', 'ZOHO-CUST-001'
  ),
  (
    (SELECT id FROM partners WHERE code = 'PTR-NEXUS'),
    'CUST-TECH-002', 'TechSoft Solutions Pvt Ltd', 'ENTERPRISE', 'ACTIVE',
    'Ananya Singh', 'Platinum', 99.99, 15, 120,
    85000, 1020000, 'Information Technology',
    '29AABCT1332L1ZB', '12, Whitefield, Bangalore - 560066',
    '2026-06-30', 'Vikram Patel', 'ZOHO-CUST-002'
  ),
  (
    NULL,
    'CUST-BANK-003', 'Reliable Finance Corp', 'ENTERPRISE', 'ACTIVE',
    'Suresh Iyer', 'Platinum', 99.99, 15, 120,
    220000, 2640000, 'BFSI',
    '27AAECR2596Q1ZV', 'Fortune Tower, BKC, Mumbai - 400051',
    '2027-03-31', 'Amita Desai', 'ZOHO-CUST-003'
  ),
  (
    (SELECT id FROM partners WHERE code = 'PTR-BRIDGE'),
    'CUST-RETAIL-004', 'StarMart Retail Chain', 'BUSINESS', 'ACTIVE',
    'Neha Verma', 'Silver', 99.50, 60, 480,
    45000, 540000, 'Retail',
    '24AAECS8932N1ZA', 'Ahmedabad Ring Road, Ahmedabad - 380054',
    '2025-12-31', 'Rohit Jain', 'ZOHO-CUST-004'
  ),
  (
    NULL,
    'CUST-HOSPITAL-005', 'MedLife Healthcare Network', 'ENTERPRISE', 'ACTIVE',
    'Dr. Sanjay Mehta', 'Gold', 99.95, 30, 240,
    175000, 2100000, 'Healthcare',
    '09AABCM9872P1ZQ', 'Sector 18, Noida - 201301',
    '2026-09-30', 'Priya Sharma', 'ZOHO-CUST-005'
  )
ON CONFLICT (code) DO NOTHING;

-- ─── Sites ───────────────────────────────────────────────────────────────────

INSERT INTO sites (
  customer_id, code, name, region, status, address,
  city, state, latitude, longitude, ip_block, pop,
  last_mile_provider, go_live_date, contract_end_date, dashboard_uid
) VALUES
  -- Acme Manufacturing Sites
  (
    (SELECT id FROM customers WHERE code = 'CUST-DEMO-001'),
    'SITE-ACME-HQ', 'Acme HQ - Chandigarh', 'North',
    'UP', '45, Industrial Area Phase II', 'Chandigarh', 'Punjab',
    30.7333, 76.7794, '103.21.45.0/29', 'CHD-POP-01',
    'Airtel', '2023-04-01', '2026-03-31', 'netlayer-bw-001'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-DEMO-001'),
    'SITE-ACME-PLANT1', 'Acme Plant 1 - Ludhiana', 'North',
    'UP', 'Plot 22, Focal Point', 'Ludhiana', 'Punjab',
    30.9010, 75.8573, '103.21.46.0/30', 'LDH-POP-01',
    'Jio Fiber', '2023-07-01', '2026-03-31', 'netlayer-bw-002'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-DEMO-001'),
    'SITE-ACME-WHOUSE', 'Acme Warehouse - Mohali', 'North',
    'DOWN', 'Phase 8B, Mohali', 'Mohali', 'Punjab',
    30.7046, 76.7179, '103.21.47.0/30', 'CHD-POP-01',
    'ACT Fibernet', '2023-09-15', '2026-03-31', 'netlayer-bw-003'
  ),
  -- TechSoft Sites
  (
    (SELECT id FROM customers WHERE code = 'CUST-TECH-002'),
    'SITE-TECH-HQ', 'TechSoft HQ - Bangalore', 'South',
    'UP', '12, Whitefield Main Road', 'Bangalore', 'Karnataka',
    12.9716, 77.5946, '103.21.50.0/28', 'BLR-POP-01',
    'Airtel', '2023-01-15', '2026-06-30', 'netlayer-bw-004'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-TECH-002'),
    'SITE-TECH-DR', 'TechSoft DR Site - Hyderabad', 'South',
    'UP', 'Gachibowli, Hi-Tech City', 'Hyderabad', 'Telangana',
    17.3850, 78.4867, '103.21.51.0/29', 'HYD-POP-01',
    'Tata', '2023-03-01', '2026-06-30', 'netlayer-bw-005'
  ),
  -- Reliable Finance Sites
  (
    (SELECT id FROM customers WHERE code = 'CUST-BANK-003'),
    'SITE-BANK-HQ', 'RFC Head Office - Mumbai', 'West',
    'UP', 'Fortune Tower, BKC', 'Mumbai', 'Maharashtra',
    19.0668, 72.8658, '103.21.60.0/27', 'MUM-POP-01',
    'Tata', '2022-08-01', '2027-03-31', 'netlayer-bw-006'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-BANK-003'),
    'SITE-BANK-PUNE', 'RFC Pune Branch', 'West',
    'UP', 'Magarpatta City, Hadapsar', 'Pune', 'Maharashtra',
    18.5204, 73.8567, '103.21.61.0/28', 'PUN-POP-01',
    'Airtel', '2022-10-01', '2027-03-31', 'netlayer-bw-007'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-BANK-003'),
    'SITE-BANK-DELHI', 'RFC Delhi Office', 'North',
    'DEGRADED', 'Connaught Place, New Delhi', 'New Delhi', 'Delhi',
    28.6139, 77.2090, '103.21.62.0/29', 'DEL-POP-01',
    'Jio Fiber', '2023-02-15', '2027-03-31', 'netlayer-bw-008'
  ),
  -- StarMart Sites
  (
    (SELECT id FROM customers WHERE code = 'CUST-RETAIL-004'),
    'SITE-STAR-AHM', 'StarMart Ahmedabad DC', 'West',
    'UP', 'Ahmedabad Ring Road', 'Ahmedabad', 'Gujarat',
    23.0225, 72.5714, '103.21.70.0/29', 'AHM-POP-01',
    'Jio Fiber', '2023-05-01', '2025-12-31', 'netlayer-bw-009'
  ),
  -- MedLife Sites
  (
    (SELECT id FROM customers WHERE code = 'CUST-HOSPITAL-005'),
    'SITE-MED-NOIDA', 'MedLife Noida Hospital', 'North',
    'UP', 'Sector 18, Noida', 'Noida', 'Uttar Pradesh',
    28.5355, 77.3910, '103.21.80.0/28', 'NCR-POP-01',
    'Airtel', '2023-06-01', '2026-09-30', 'netlayer-bw-010'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-HOSPITAL-005'),
    'SITE-MED-GURGAON', 'MedLife Gurgaon Clinic', 'North',
    'UP', 'DLF Cyber City, Gurgaon', 'Gurugram', 'Haryana',
    28.4595, 77.0266, '103.21.81.0/29', 'NCR-POP-01',
    'Tata', '2023-08-15', '2026-09-30', 'netlayer-bw-011'
  )
ON CONFLICT (code) DO NOTHING;

-- ─── Devices ─────────────────────────────────────────────────────────────────

INSERT INTO devices (site_id, hostname, ip_address, vendor, status, zabbix_host_id, metadata)
SELECT
  s.id,
  'rtr-' || lower(s.code) || '-01',
  (s.ip_block::text),
  'Cisco',
  'ONLINE',
  'ZABBIX-' || s.code,
  '{"model": "ASR-1001", "role": "CE Router"}'::jsonb
FROM sites s
WHERE s.code IN ('SITE-ACME-HQ','SITE-TECH-HQ','SITE-BANK-HQ','SITE-MED-NOIDA')
ON CONFLICT (zabbix_host_id) DO NOTHING;

-- ─── Services / Circuits ─────────────────────────────────────────────────────

INSERT INTO services (
  customer_id, site_id, service_id, circuit_id, service_type,
  bandwidth_mbps, pop, last_mile, ip_block, status,
  activation_date, contract_end_date, contract_months, monthly_charge
)
SELECT
  s.customer_id,
  s.id,
  'SVC-' || s.code || '-ILL',
  'CKT-' || substr(s.id::text, 1, 8),
  'ILL',
  CASE
    WHEN cust.tier = 'ENTERPRISE' THEN 1000
    ELSE 100
  END,
  s.pop,
  s.last_mile_provider,
  s.ip_block,
  CASE WHEN s.status = 'DOWN' THEN 'SUSPENDED' ELSE 'ACTIVE' END,
  s.go_live_date,
  s.contract_end_date,
  36,
  cust.monthly_recurring_revenue / GREATEST((
    SELECT COUNT(*) FROM sites ss WHERE ss.customer_id = s.customer_id
  ), 1)
FROM sites s
JOIN customers cust ON cust.id = s.customer_id
ON CONFLICT (service_id) DO NOTHING;

-- ─── Traffic Metrics (last 24h of demo data) ─────────────────────────────────

INSERT INTO site_traffic_metrics (site_id, metric_time, inbound_bps, outbound_bps, latency_ms, packet_loss_pct)
SELECT
  s.id,
  NOW() - (n.n || ' minutes')::interval,
  floor(random() * 800000000 + 100000000)::bigint,
  floor(random() * 400000000 + 50000000)::bigint,
  round((random() * 20 + 2)::numeric, 2),
  round((random() * 0.5)::numeric, 3)
FROM sites s
CROSS JOIN generate_series(0, 287, 5) AS n(n)
WHERE s.status = 'UP'
ON CONFLICT (site_id, metric_time) DO NOTHING;

-- ─── Alerts ──────────────────────────────────────────────────────────────────

INSERT INTO alerts (external_id, site_id, device_id, severity, status, source, message, metadata)
VALUES
  (
    'ZABBIX-TRG-10001',
    (SELECT id FROM sites WHERE code = 'SITE-ACME-WHOUSE'),
    NULL, 'P1', 'OPEN', 'ZABBIX',
    'Interface GigabitEthernet0/0/1 is DOWN — Link loss detected',
    '{"host": "rtr-site-acme-whouse-01", "trigger": "Interface down"}'::jsonb
  ),
  (
    'ZABBIX-TRG-10002',
    (SELECT id FROM sites WHERE code = 'SITE-BANK-DELHI'),
    NULL, 'P2', 'OPEN', 'ZABBIX',
    'High packet loss detected: 3.2% on primary uplink',
    '{"host": "rtr-site-bank-delhi-01", "packet_loss": "3.2%"}'::jsonb
  ),
  (
    'ZABBIX-TRG-10003',
    (SELECT id FROM sites WHERE code = 'SITE-TECH-DR'),
    NULL, 'P3', 'ACKNOWLEDGED', 'ZABBIX',
    'BGP session flapping — route reconvergence in progress',
    '{"host": "rtr-site-tech-dr-01", "bgp_peer": "103.21.50.1"}'::jsonb
  ),
  (
    'ZABBIX-TRG-10004',
    (SELECT id FROM sites WHERE code = 'SITE-MED-GURGAON'),
    NULL, 'P3', 'OPEN', 'ZABBIX',
    'CPU utilization high: 87% on CE router for past 15 minutes',
    '{"host": "rtr-site-med-gurgaon-01", "cpu_pct": "87"}'::jsonb
  ),
  (
    'ZABBIX-TRG-10005',
    (SELECT id FROM sites WHERE code = 'SITE-ACME-HQ'),
    NULL, 'P4', 'RESOLVED', 'ZABBIX',
    'Interface utilization above 80% threshold — informational',
    '{"host": "rtr-site-acme-hq-01", "util_pct": "82"}'::jsonb
  )
ON CONFLICT (external_id) DO NOTHING;

-- ─── Tickets ─────────────────────────────────────────────────────────────────

INSERT INTO tickets (
  customer_id, site_id, title, description, priority, status, source, opened_by,
  response_due_at, resolution_due_at
)
VALUES
  (
    (SELECT id FROM customers WHERE code = 'CUST-DEMO-001'),
    (SELECT id FROM sites WHERE code = 'SITE-ACME-WHOUSE'),
    'Site Down — Mohali Warehouse (SITE-ACME-WHOUSE)',
    'Primary ILL link down since 02:15 IST. Mohali warehouse operations affected. Failover to backup 4G not triggering.',
    'P1', 'IN_PROGRESS', 'ALERT',
    (SELECT id FROM users WHERE email = 'admin@netlayer.local'),
    NOW() + INTERVAL '15 minutes',
    NOW() + INTERVAL '4 hours'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-BANK-003'),
    (SELECT id FROM sites WHERE code = 'SITE-BANK-DELHI'),
    'Degraded performance — RFC Delhi Office',
    'Customer reporting slow application response times. Latency spiking to 45ms. Packet loss detected.',
    'P2', 'OPEN', 'CUSTOMER',
    (SELECT id FROM users WHERE email = 'admin@netlayer.local'),
    NOW() + INTERVAL '30 minutes',
    NOW() + INTERVAL '8 hours'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-TECH-002'),
    (SELECT id FROM sites WHERE code = 'SITE-TECH-HQ'),
    'BGP route not propagating correctly',
    'Customer reports certain destination prefixes unreachable since 18:00. BGP table appears intact but traffic not flowing.',
    'P2', 'OPEN', 'CUSTOMER',
    (SELECT id FROM users WHERE email = 'admin@netlayer.local'),
    NOW() + INTERVAL '30 minutes',
    NOW() + INTERVAL '8 hours'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-HOSPITAL-005'),
    NULL,
    'IP address change request — MedLife HIS system migration',
    'Customer requesting IP block reassignment due to upcoming HIS migration. Need new /28 block in same pop.',
    'P3', 'OPEN', 'CUSTOMER',
    (SELECT id FROM users WHERE email = 'admin@netlayer.local'),
    NOW() + INTERVAL '2 hours',
    NOW() + INTERVAL '2 days'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-DEMO-001'),
    (SELECT id FROM sites WHERE code = 'SITE-ACME-HQ'),
    'Upgrade request — Acme HQ bandwidth from 1G to 10G',
    'Customer requesting bandwidth upgrade. Current 1Gbps ILL to be upgraded to 10Gbps. Feasibility confirmed.',
    'P4', 'RESOLVED', 'CUSTOMER',
    (SELECT id FROM users WHERE email = 'admin@netlayer.local'),
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 days'
  );

-- Ticket comments
INSERT INTO ticket_comments (ticket_id, author_id, body, is_internal)
SELECT
  t.id,
  (SELECT id FROM users WHERE email = 'admin@netlayer.local'),
  'Escalated to NOC L2. Checking physical connectivity at CHD-POP-01.',
  true
FROM tickets t
WHERE t.title LIKE '%Mohali%';

INSERT INTO ticket_comments (ticket_id, author_id, body, is_internal)
SELECT
  t.id,
  (SELECT id FROM users WHERE email = 'admin@netlayer.local'),
  'Dear customer, we are actively investigating the issue. Our NOC team is on the case. ETA for resolution: 2 hours.',
  false
FROM tickets t
WHERE t.title LIKE '%Mohali%';

-- ─── Billing Invoices ────────────────────────────────────────────────────────

INSERT INTO billing_invoices (customer_id, zoho_invoice_id, status, payment_status, payload)
VALUES
  (
    (SELECT id FROM customers WHERE code = 'CUST-DEMO-001'),
    'ZOHO-INV-2024-001',
    'SENT', 'UNPAID',
    '{"invoice_number": "INV-2024-001", "date": "2024-11-01", "due_date": "2024-11-15", "total": 125000, "currency_code": "INR", "line_items": [{"name": "ILL 1Gbps — Monthly Rental", "quantity": 1, "rate": 125000}]}'::jsonb
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-DEMO-001'),
    'ZOHO-INV-2024-002',
    'PAID', 'PAID',
    '{"invoice_number": "INV-2024-002", "date": "2024-10-01", "due_date": "2024-10-15", "total": 125000, "currency_code": "INR", "line_items": [{"name": "ILL 1Gbps — Monthly Rental", "quantity": 1, "rate": 125000}]}'::jsonb
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-BANK-003'),
    'ZOHO-INV-2024-003',
    'OVERDUE', 'UNPAID',
    '{"invoice_number": "INV-2024-003", "date": "2024-10-01", "due_date": "2024-10-15", "total": 220000, "currency_code": "INR", "line_items": [{"name": "Multi-site ILL Bundle — Monthly Rental", "quantity": 1, "rate": 220000}]}'::jsonb
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-TECH-002'),
    'ZOHO-INV-2024-004',
    'SENT', 'PARTIALLY_PAID',
    '{"invoice_number": "INV-2024-004", "date": "2024-11-01", "due_date": "2024-11-15", "total": 85000, "currency_code": "INR", "line_items": [{"name": "ILL 1Gbps + DR Link — Monthly Rental", "quantity": 1, "rate": 85000}]}'::jsonb
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-HOSPITAL-005'),
    'ZOHO-INV-2024-005',
    'PAID', 'PAID',
    '{"invoice_number": "INV-2024-005", "date": "2024-11-01", "due_date": "2024-11-15", "total": 175000, "currency_code": "INR", "line_items": [{"name": "Enterprise ILL Bundle — Monthly Rental", "quantity": 1, "rate": 175000}]}'::jsonb
  )
ON CONFLICT (zoho_invoice_id) DO NOTHING;

-- ─── Commissions ─────────────────────────────────────────────────────────────

INSERT INTO commissions (partner_id, commission_period, gross_revenue, commission_rate, commission_amount, status)
VALUES
  ((SELECT id FROM partners WHERE code = 'PTR-APEX'),  '2024-11-01', 125000, 10.00, 12500, 'PENDING'),
  ((SELECT id FROM partners WHERE code = 'PTR-APEX'),  '2024-10-01', 125000, 10.00, 12500, 'PAID'),
  ((SELECT id FROM partners WHERE code = 'PTR-APEX'),  '2024-09-01', 125000, 10.00, 12500, 'PAID'),
  ((SELECT id FROM partners WHERE code = 'PTR-NEXUS'), '2024-11-01',  85000, 12.00, 10200, 'PENDING'),
  ((SELECT id FROM partners WHERE code = 'PTR-NEXUS'), '2024-10-01',  85000, 12.00, 10200, 'PAID'),
  ((SELECT id FROM partners WHERE code = 'PTR-BRIDGE'), '2024-11-01', 45000, 10.00,  4500, 'PENDING'),
  ((SELECT id FROM partners WHERE code = 'PTR-BRIDGE'), '2024-10-01', 45000, 10.00,  4500, 'PAID')
ON CONFLICT (partner_id, commission_period) DO NOTHING;

-- ─── Leads ───────────────────────────────────────────────────────────────────

INSERT INTO leads (
  partner_id, company_name, contact_name, contact_email, contact_phone,
  city, state, source, stage, expected_value, service_type, bandwidth_mbps
) VALUES
  (
    (SELECT id FROM partners WHERE code = 'PTR-APEX'),
    'Northern Pharma Industries', 'Rajesh Gupta', 'rajesh@northernpharma.in', '9876543210',
    'Chandigarh', 'Punjab', 'PARTNER', 'PROPOSAL', 95000, 'ILL', 500
  ),
  (
    (SELECT id FROM partners WHERE code = 'PTR-NEXUS'),
    'Bangalore Logistics Hub', 'Preethi Nair', 'preethi@blh.co.in', '8765432109',
    'Bangalore', 'Karnataka', 'PARTNER', 'QUALIFIED', 65000, 'ILL', 200
  ),
  (
    NULL,
    'Capital Investments Ltd', 'Arjun Sharma', 'arjun@capinv.in', '7654321098',
    'Mumbai', 'Maharashtra', 'DIRECT', 'NEGOTIATION', 180000, 'ILL', 1000
  ),
  (
    NULL,
    'EduTech Learning Platform', 'Neha Agarwal', 'neha@edutech.in', '6543210987',
    'Hyderabad', 'Telangana', 'INBOUND', 'CONTACTED', 35000, 'BB', 100
  ),
  (
    (SELECT id FROM partners WHERE code = 'PTR-BRIDGE'),
    'Surat Textile Exports', 'Mahesh Patel', 'mahesh@suratexports.in', '9988776655',
    'Surat', 'Gujarat', 'PARTNER', 'NEW', 28000, 'BB', 100
  ),
  (
    NULL,
    'Delhi Healthcare Group', 'Dr. Anjali Singh', 'anjali@dhg.in', '9876012345',
    'New Delhi', 'Delhi', 'REFERRAL', 'WON', 250000, 'MPLS', 2000
  ),
  (
    NULL,
    'Jaipur Gems & Jewellery', 'Sushil Bose', 'sushil@jaipur gems.in', '8899001122',
    'Jaipur', 'Rajasthan', 'INBOUND', 'LOST', 42000, 'ILL', 200
  )
ON CONFLICT DO NOTHING;

-- ─── Feasibility Requests ────────────────────────────────────────────────────

INSERT INTO feasibility_requests (
  customer_id, source, company_name, contact_name, contact_email, contact_phone,
  address, city, state, pincode, service_type, bandwidth_mbps, redundancy_required,
  status, notes
) VALUES
  (
    (SELECT id FROM customers WHERE code = 'CUST-DEMO-001'),
    'CUSTOMER', 'Acme Manufacturing Ltd', 'Rajiv Kapoor', 'rajiv@acme.in', '9871234567',
    'Plot 54, Phase III Industrial Area', 'Dera Bassi', 'Punjab', '140507',
    'ILL', 500, TRUE,
    'FEASIBLE',
    'Fiber availability confirmed at PoP. Last-mile feasible via Airtel. Quoted 500Mbps ILL.'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-BANK-003'),
    'CUSTOMER', 'Reliable Finance Corp', 'Rohan Mehta', 'rohan@rfc.in', '9966778899',
    'MIDC, Andheri East', 'Mumbai', 'Maharashtra', '400093',
    'ILL', 1000, TRUE,
    'SURVEY_SCHEDULED',
    'Survey scheduled for next week. PoP availability to be confirmed.'
  ),
  (
    NULL,
    'PARTNER', 'Northern Pharma Industries', 'Rajesh Gupta', 'rajesh@northernpharma.in', '9876543210',
    'Sector 37, Industrial Area', 'Chandigarh', 'Punjab', '160036',
    'ILL', 500, FALSE,
    'QUOTATION_SHARED',
    'Feasibility confirmed. Quotation shared at INR 95,000/month.'
  ),
  (
    NULL,
    'ADMIN', 'Capital Investments Ltd', 'Arjun Sharma', 'arjun@capinv.in', '7654321098',
    'Fort Area', 'Mumbai', 'Maharashtra', '400023',
    'ILL', 1000, TRUE,
    'REQUESTED',
    NULL
  )
ON CONFLICT DO NOTHING;

-- ─── Users — All Portals ─────────────────────────────────────────────────────
-- Password for all demo users: Demo@1234
-- Hash: $2b$10$sw4yCbe84CH.IWOmhP/c6eGrsIWpo0VrvGMMF3k4LCGlAnYYwV.32

-- Partner users
INSERT INTO users (partner_id, email, full_name, password_hash, is_active)
SELECT
  p.id, 'partner@netlayer.local', 'Apex Partner Admin', '$2b$10$sw4yCbe84CH.IWOmhP/c6eGrsIWpo0VrvGMMF3k4LCGlAnYYwV.32', TRUE
FROM partners p WHERE p.code = 'PTR-APEX'
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE u.email = 'partner@netlayer.local' AND r.name IN ('PARTNER_ADMIN')
ON CONFLICT DO NOTHING;

-- TechSoft customer admin
INSERT INTO users (customer_id, email, full_name, password_hash, is_active)
SELECT
  c.id, 'techsoft@netlayer.local', 'TechSoft Admin', '$2b$10$sw4yCbe84CH.IWOmhP/c6eGrsIWpo0VrvGMMF3k4LCGlAnYYwV.32', TRUE
FROM customers c WHERE c.code = 'CUST-TECH-002'
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE u.email = 'techsoft@netlayer.local' AND r.name = 'ENTERPRISE_ADMIN'
ON CONFLICT DO NOTHING;

-- NOC engineer user
INSERT INTO users (email, full_name, password_hash, is_active) VALUES
  ('noc@netlayer.local', 'NOC Engineer', '$2b$10$sw4yCbe84CH.IWOmhP/c6eGrsIWpo0VrvGMMF3k4LCGlAnYYwV.32', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE u.email = 'noc@netlayer.local' AND r.name = 'NOC_ENGINEER'
ON CONFLICT DO NOTHING;

-- Finance user
INSERT INTO users (email, full_name, password_hash, is_active) VALUES
  ('finance@netlayer.local', 'Finance User', '$2b$10$sw4yCbe84CH.IWOmhP/c6eGrsIWpo0VrvGMMF3k4LCGlAnYYwV.32', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE u.email = 'finance@netlayer.local' AND r.name IN ('FINANCE_USER', 'NOC_ENGINEER')
ON CONFLICT DO NOTHING;

-- Sales executive
INSERT INTO users (email, full_name, password_hash, is_active) VALUES
  ('sales@netlayer.local', 'Priya Sharma (Sales)', '$2b$10$sw4yCbe84CH.IWOmhP/c6eGrsIWpo0VrvGMMF3k4LCGlAnYYwV.32', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE u.email = 'sales@netlayer.local' AND r.name = 'SALES_EXECUTIVE'
ON CONFLICT DO NOTHING;

-- ─── Customer Contacts ───────────────────────────────────────────────────────

INSERT INTO customer_contacts (customer_id, name, designation, email, phone, is_primary, contact_type)
VALUES
  (
    (SELECT id FROM customers WHERE code = 'CUST-DEMO-001'),
    'Rajiv Kapoor', 'IT Manager', 'rajiv@acme.in', '9871234567', TRUE, 'TECHNICAL'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-DEMO-001'),
    'Sunita Aggarwal', 'Finance Head', 'sunita@acme.in', '9871234568', FALSE, 'BILLING'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-BANK-003'),
    'Rohan Mehta', 'CTO', 'rohan@rfc.in', '9966778899', TRUE, 'TECHNICAL'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-BANK-003'),
    'Manish Gupta', 'VP Finance', 'manish@rfc.in', '9966778800', FALSE, 'BILLING'
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-TECH-002'),
    'Preethi Kumar', 'Network Admin', 'preethi@techsoft.in', '8765432100', TRUE, 'TECHNICAL'
  )
ON CONFLICT DO NOTHING;

-- ─── Implementation Tasks ────────────────────────────────────────────────────

INSERT INTO implementation_tasks (
  customer_id, site_id, task_type, title, description, status, scheduled_date
)
VALUES
  (
    (SELECT id FROM customers WHERE code = 'CUST-DEMO-001'),
    (SELECT id FROM sites WHERE code = 'SITE-ACME-WHOUSE'),
    'PROVISIONING',
    'SITE-ACME-WHOUSE — Link restoration after outage',
    'Primary fiber cut at CHD-POP-01 splice point. Restoration team dispatched.',
    'IN_PROGRESS',
    CURRENT_DATE
  ),
  (
    (SELECT id FROM customers WHERE code = 'CUST-BANK-003'),
    (SELECT id FROM sites WHERE code = 'SITE-BANK-DELHI'),
    'SURVEY',
    'SITE-BANK-DELHI — Scheduled maintenance window',
    'Planned maintenance for router OS upgrade on 2024-11-20 02:00-04:00 IST.',
    'SCHEDULED',
    CURRENT_DATE + INTERVAL '3 days'
  )
ON CONFLICT DO NOTHING;

-- ─── Notifications ───────────────────────────────────────────────────────────

INSERT INTO notification_events (user_id, customer_id, event_type, title, body)
SELECT
  u.id,
  (SELECT id FROM customers WHERE code = 'CUST-DEMO-001'),
  'ALERT_P1',
  'P1 Alert — Site Down: Mohali Warehouse',
  'Interface GigabitEthernet0/0/1 is DOWN on rtr-site-acme-whouse-01. Ticket raised automatically.'
FROM users u WHERE u.email = 'customer@netlayer.local';

INSERT INTO notification_events (user_id, customer_id, event_type, title, body)
SELECT
  u.id,
  (SELECT id FROM customers WHERE code = 'CUST-DEMO-001'),
  'INVOICE_OVERDUE',
  'Invoice INV-2024-001 is due',
  'Your invoice INV-2024-001 for ₹1,25,000 is due on Nov 15, 2024. Please make payment.'
FROM users u WHERE u.email = 'customer@netlayer.local';
