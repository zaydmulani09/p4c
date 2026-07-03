-- ============================================================
-- Pages for Change Portal — Supabase Schema + RLS
-- Run this in the Supabase SQL editor (project → SQL Editor → New Query)
-- ============================================================

-- ── Types ────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('national_admin', 'chapter_lead', 'volunteer');

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE chapters (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  school        text        NOT NULL,
  city          text        NOT NULL,
  state         text        NOT NULL,
  status        text        NOT NULL DEFAULT 'active',
  founded_date  date,
  lead_user_id  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  full_name   text        NOT NULL,
  role        user_role   NOT NULL DEFAULT 'volunteer',
  chapter_id  uuid        REFERENCES chapters(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id           uuid        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  org_name             text        NOT NULL,
  org_type             text,
  website              text,
  contact_name         text,
  contact_title        text,
  email                text,
  phone                text,
  township             text,
  state                text,
  date_researched      date,
  date_first_contacted date,
  contact_method       text,
  current_status       text,
  follow_up_date       date,
  last_response_date   date,
  partnership_interest text,
  notes                text,
  outcome              text,
  logged_by            uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE books (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id    uuid        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  title         text        NOT NULL,
  author        text,
  genre         text,
  age_range     text,
  condition     text,
  quantity      integer     NOT NULL DEFAULT 1,
  date_received date,
  logged_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE distributions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id        uuid        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  org_id            uuid        REFERENCES organizations(id) ON DELETE SET NULL,
  quantity          integer     NOT NULL,
  distribution_date date,
  logged_by         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contact_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id      uuid        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  org_id          uuid        REFERENCES organizations(id) ON DELETE SET NULL,
  date            date        NOT NULL,
  logged_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_method  text,
  summary         text,
  follow_up_needed boolean    NOT NULL DEFAULT false,
  follow_up_date  date,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chapter_applications (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_name   text        NOT NULL,
  applicant_email  text        NOT NULL,
  school_name      text        NOT NULL,
  city             text        NOT NULL,
  state            text        NOT NULL,
  grade            text        NOT NULL,
  why_interested   text        NOT NULL,
  submitted_at     timestamptz NOT NULL DEFAULT now(),
  status           text        NOT NULL DEFAULT 'pending',
  reviewed_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      timestamptz
);

CREATE TABLE resources (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  description  text,
  file_url     text,
  category     text,
  uploaded_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── updated_at trigger for organizations ─────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orgs_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ── Helper functions (SECURITY DEFINER runs as owner) ─────────
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_chapter_id()
RETURNS uuid AS $$
  SELECT chapter_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Public stats (called from anon landing page) ──────────────
CREATE OR REPLACE FUNCTION get_public_stats()
RETURNS json AS $$
  SELECT json_build_object(
    'total_chapters', (SELECT COUNT(*) FROM chapters WHERE status = 'active'),
    'total_books',    (SELECT COALESCE(SUM(quantity), 0) FROM books),
    'total_partners', (SELECT COUNT(DISTINCT org_id) FROM distributions WHERE org_id IS NOT NULL)
  )
$$ LANGUAGE sql SECURITY DEFINER;

-- Allow anon to call this RPC only
GRANT EXECUTE ON FUNCTION get_public_stats() TO anon;

-- ── Enable RLS on all tables ──────────────────────────────────
ALTER TABLE chapters             ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE books                ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources            ENABLE ROW LEVEL SECURITY;

-- ── chapters ─────────────────────────────────────────────────
-- Anyone authenticated can read their own chapter; admins read all
CREATE POLICY "chapters_select" ON chapters FOR SELECT TO authenticated
  USING (
    get_user_role() = 'national_admin'
    OR id = get_user_chapter_id()
  );

CREATE POLICY "chapters_admin_all" ON chapters FOR ALL TO authenticated
  USING    (get_user_role() = 'national_admin')
  WITH CHECK (get_user_role() = 'national_admin');

-- ── users ────────────────────────────────────────────────────
CREATE POLICY "users_select_own" ON users FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_admin_all" ON users FOR ALL TO authenticated
  USING    (get_user_role() = 'national_admin')
  WITH CHECK (get_user_role() = 'national_admin');

-- ── organizations ────────────────────────────────────────────
CREATE POLICY "orgs_select" ON organizations FOR SELECT TO authenticated
  USING (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

CREATE POLICY "orgs_insert" ON organizations FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

CREATE POLICY "orgs_update" ON organizations FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  )
  WITH CHECK (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

CREATE POLICY "orgs_delete" ON organizations FOR DELETE TO authenticated
  USING (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

-- ── books ────────────────────────────────────────────────────
CREATE POLICY "books_select" ON books FOR SELECT TO authenticated
  USING (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

CREATE POLICY "books_insert" ON books FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

CREATE POLICY "books_update" ON books FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  )
  WITH CHECK (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

CREATE POLICY "books_delete" ON books FOR DELETE TO authenticated
  USING (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

-- ── distributions ────────────────────────────────────────────
CREATE POLICY "dist_select" ON distributions FOR SELECT TO authenticated
  USING (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

CREATE POLICY "dist_insert" ON distributions FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

CREATE POLICY "dist_update" ON distributions FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  )
  WITH CHECK (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

CREATE POLICY "dist_delete" ON distributions FOR DELETE TO authenticated
  USING (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

-- ── contact_log ──────────────────────────────────────────────
CREATE POLICY "clog_select" ON contact_log FOR SELECT TO authenticated
  USING (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

CREATE POLICY "clog_insert" ON contact_log FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

CREATE POLICY "clog_update" ON contact_log FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  )
  WITH CHECK (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

CREATE POLICY "clog_delete" ON contact_log FOR DELETE TO authenticated
  USING (
    get_user_role() = 'national_admin'
    OR chapter_id = get_user_chapter_id()
  );

-- ── chapter_applications — national_admin only ────────────────
CREATE POLICY "apps_admin_all" ON chapter_applications FOR ALL TO authenticated
  USING    (get_user_role() = 'national_admin')
  WITH CHECK (get_user_role() = 'national_admin');

-- Allow anon INSERT so unauthenticated users can submit applications
CREATE POLICY "apps_anon_insert" ON chapter_applications FOR INSERT TO anon
  WITH CHECK (true);

-- ── resources ────────────────────────────────────────────────
-- All authenticated users can read
CREATE POLICY "resources_select" ON resources FOR SELECT TO authenticated
  USING (true);

-- Only national_admin can write
CREATE POLICY "resources_admin_write" ON resources FOR ALL TO authenticated
  USING    (get_user_role() = 'national_admin')
  WITH CHECK (get_user_role() = 'national_admin');

-- ── Indexes ───────────────────────────────────────────────────
-- Supabase creates indexes on PKs automatically.
-- These cover FK lookups and the most common WHERE clauses.

-- users
CREATE INDEX idx_users_chapter_id ON users(chapter_id);
CREATE INDEX idx_users_role        ON users(role);

-- organizations
CREATE INDEX idx_orgs_chapter_id   ON organizations(chapter_id);
CREATE INDEX idx_orgs_status       ON organizations(current_status);

-- books
CREATE INDEX idx_books_chapter_id  ON books(chapter_id);

-- distributions
CREATE INDEX idx_dist_chapter_id   ON distributions(chapter_id);
CREATE INDEX idx_dist_org_id       ON distributions(org_id);

-- contact_log
CREATE INDEX idx_clog_chapter_id   ON contact_log(chapter_id);
CREATE INDEX idx_clog_org_id       ON contact_log(org_id);

-- chapters
CREATE INDEX idx_chapters_status   ON chapters(status);
CREATE INDEX idx_chapters_lead     ON chapters(lead_user_id);

-- chapter_applications
CREATE INDEX idx_apps_status       ON chapter_applications(status);
CREATE INDEX idx_apps_email        ON chapter_applications(applicant_email);
