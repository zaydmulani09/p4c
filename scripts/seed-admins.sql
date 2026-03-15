-- ============================================================
-- P4C Portal — Seed National Admin Accounts
-- ============================================================
--
-- STEP 1 (do this first, manually in Supabase Dashboard):
--   Dashboard → Authentication → Users → "Invite user"
--   Invite both emails below. They'll receive an email to set
--   their password via /portal/invite.
--
--   Alternatively: Authentication → Users → "Add user" →
--   "Create new user" (set email + temporary password, then
--   share credentials with them to change on first login).
--
--   Their auth.users UUIDs will be created by Supabase.
--   Copy those UUIDs and paste them below before running this script.
--
-- STEP 2 (after Step 1):
--   Replace the two placeholder UUIDs below with the real ones
--   from auth.users, then run this script in SQL Editor.
--
-- STEP 3 (optional):
--   You may also need to create a row in the `chapters` table
--   for any chapter_lead users. National admins have chapter_id = NULL.
-- ============================================================

-- ── Insert Zayd Mulani as National Admin ──────────────────────
INSERT INTO public.users (id, email, full_name, role, chapter_id, created_at)
VALUES (
  'REPLACE_WITH_ZAYD_AUTH_UUID',   -- copy from Supabase Auth → Users → Zayd's row
  'zaydmulani@gmail.com',
  'Zayd Mulani',
  'national_admin',
  NULL,                             -- national admins have no chapter
  now()
)
ON CONFLICT (id) DO UPDATE
  SET role      = 'national_admin',
      full_name = 'Zayd Mulani',
      chapter_id = NULL;

-- ── Insert Affan Shaik as National Admin ──────────────────────
INSERT INTO public.users (id, email, full_name, role, chapter_id, created_at)
VALUES (
  'REPLACE_WITH_AFFAN_AUTH_UUID',  -- copy from Supabase Auth → Users → Affan's row
  'affanshaik2009@gmail.com',
  'Affan Shaik',
  'national_admin',
  NULL,
  now()
)
ON CONFLICT (id) DO UPDATE
  SET role      = 'national_admin',
      full_name = 'Affan Shaik',
      chapter_id = NULL;

-- ── Verify ────────────────────────────────────────────────────
-- Run this after inserting to confirm both rows look correct:
-- SELECT id, email, full_name, role, chapter_id FROM public.users WHERE role = 'national_admin';
