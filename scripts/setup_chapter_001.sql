-- ─────────────────────────────────────────────────────────────────────────────
-- Chapter 001 Setup — South Brunswick (Founding Chapter)
--
-- HOW TO USE THIS FILE:
--
-- STEP 0: Generate a UUID for South Brunswick's chapter row.
--   Run this in Supabase SQL editor:  SELECT gen_random_uuid();
--   Copy the result and replace EVERY occurrence of
--   'REPLACE_WITH_SOUTH_BRUNSWICK_UUID' below with that UUID.
--   Also paste it into portal/src/lib/config.js as FOUNDING_CHAPTER_ID.
--
-- STEP 1: Run Step 1 below (insert the chapter row).
--
-- STEP 2: In Supabase Dashboard → Auth → Users, create accounts for:
--   zaydmulani@gmail.com   (national_admin)
--   affanshaik2009@gmail.com (national_admin)
--   Then copy each user's UUID from the Auth panel.
--
-- STEP 3: Fill in Zayd and Affan's UUIDs in Step 2 below, then run it.
--
-- STEP 4: For each volunteer listed in Step 3:
--   Go to Supabase Auth → Invite User (or use the portal invite flow).
--   Copy each resulting auth user UUID into Step 3 below and run it.
--
-- STEP 5: Run scripts/migrate_sheets.py to import outreach data.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Step 1: Insert South Brunswick as the Founding Chapter ───────────────────
-- Replace the UUID with the one you generated in Step 0.
INSERT INTO chapters (id, name, school, city, state, status, founded_date)
VALUES (
  'REPLACE_WITH_SOUTH_BRUNSWICK_UUID',
  'South Brunswick',
  'South Brunswick High School',
  'South Brunswick',
  'NJ',
  'active',
  '2025-09-01'
)
ON CONFLICT (id) DO NOTHING;


-- ── Step 2: Insert Zayd and Affan as national admins ────────────────────────
-- Replace UUIDs with the real auth user UUIDs from Supabase Auth dashboard.
-- national_admin rows have chapter_id = NULL (they oversee all chapters).
INSERT INTO users (id, email, full_name, role, chapter_id)
VALUES
  ('ZAYD_AUTH_UUID',  'zaydmulani@gmail.com',    'Zayd Mulani', 'national_admin', NULL),
  ('AFFAN_AUTH_UUID', 'affanshaik2009@gmail.com', 'Affan Shaik', 'national_admin', NULL)
ON CONFLICT (id) DO UPDATE SET
  email      = EXCLUDED.email,
  full_name  = EXCLUDED.full_name,
  role       = EXCLUDED.role;


-- ── Step 3: Insert South Brunswick chapter team as volunteers ────────────────
-- Invite each person via Auth → Invite User (or the portal invite flow).
-- Then copy each resulting UUID and replace the placeholders below.
INSERT INTO users (id, email, full_name, role, chapter_id)
VALUES
  ('ZAID_ALI_UUID',     'zaidali122008@gmail.com', 'Zaid Ali',      'volunteer', 'REPLACE_WITH_SOUTH_BRUNSWICK_UUID'),
  ('AFFAN_ANWARI_UUID', 'affanaanwari@gmail.com',  'Affan Anwari',  'volunteer', 'REPLACE_WITH_SOUTH_BRUNSWICK_UUID'),
  ('ZAID_K_UUID',       'zaidkoujalgi@gmail.com',  'Zaid Koujalgi', 'volunteer', 'REPLACE_WITH_SOUTH_BRUNSWICK_UUID'),
  ('SHARF_UUID',        'sharfsyed@gmail.com',      'Sharf Syed',    'volunteer', 'REPLACE_WITH_SOUTH_BRUNSWICK_UUID')
ON CONFLICT (id) DO UPDATE SET
  email      = EXCLUDED.email,
  full_name  = EXCLUDED.full_name,
  role       = EXCLUDED.role,
  chapter_id = EXCLUDED.chapter_id;
