INSERT INTO customer_documents (
  customer_id,
  uploaded_by_user_id,
  linked_site_id,
  title,
  category,
  status,
  file_url,
  notes
)
SELECT
  c.id,
  u.id,
  s.id,
  'Master Service Agreement - FY26',
  'CONTRACT',
  'ACTIVE',
  'https://example.com/docs/netlayer-msa-fy26.pdf',
  'Signed master services agreement for enterprise customer account.'
FROM customers c
JOIN users u ON u.customer_id = c.id AND u.email = 'customer@netlayer.local'
JOIN sites s ON s.customer_id = c.id
WHERE c.code = 'CUST-001'
ORDER BY s.name
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO customer_documents (
  customer_id,
  uploaded_by_user_id,
  linked_site_id,
  title,
  category,
  status,
  file_url,
  notes
)
SELECT
  c.id,
  u.id,
  s.id,
  'Branch Installation Handover',
  'IMPLEMENTATION',
  'ACTIVE',
  'https://example.com/docs/branch-handover.pdf',
  'Installation completion and acceptance handover summary.'
FROM customers c
JOIN users u ON u.customer_id = c.id AND u.email = 'customer.branch@netlayer.local'
JOIN sites s ON s.customer_id = c.id
WHERE c.code = 'CUST-001'
ORDER BY s.name DESC
LIMIT 1
ON CONFLICT DO NOTHING;
