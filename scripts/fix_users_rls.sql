-- Fix: simplify users SELECT policy so role fetch works on first login.
--
-- The original "users_select_own" policy called get_user_role() in its USING
-- clause. get_user_role() reads from the users table (SECURITY DEFINER, so no
-- loop), but if that function returns NULL before the session is fully
-- established the combined OR expression can silently fail to match.
--
-- The simpler fix: auth.uid() = id is all that's needed for a user to read
-- their own row. National admins reading ALL rows is already handled by the
-- separate "users_admin_all" FOR ALL policy.
--
-- Run this in Supabase SQL Editor (project → SQL Editor → New Query).

DROP POLICY IF EXISTS "users_select_own" ON users;

CREATE POLICY "users_select_own" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);
