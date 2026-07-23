-- scripts/add_sort_indexes.sql

-- Add indexes for the generated weight columns to optimize backend sorting
CREATE INDEX IF NOT EXISTS idx_orgs_status_weight ON organizations(status_weight);
CREATE INDEX IF NOT EXISTS idx_books_condition_weight ON books(condition_weight);
CREATE INDEX IF NOT EXISTS idx_books_age_weight ON books(age_weight);

-- Also add the missing users policy in case the schema wasn't fully wiped and re-run
CREATE POLICY "users_chapter_select" ON users FOR SELECT TO authenticated
  USING (chapter_id = get_user_chapter_id());
