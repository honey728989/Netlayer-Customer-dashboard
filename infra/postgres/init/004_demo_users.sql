INSERT INTO users (
  email,
  full_name,
  password_hash,
  is_active
)
VALUES (
  'admin@netlayer.local',
  'Netlayer Admin',
  '$2b$10$sw4yCbe84CH.IWOmhP/c6eGrsIWpo0VrvGMMF3k4LCGlAnYYwV.32',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.email = 'admin@netlayer.local'
  AND r.name IN ('SUPER_ADMIN', 'NOC_ENGINEER')
ON CONFLICT DO NOTHING;
