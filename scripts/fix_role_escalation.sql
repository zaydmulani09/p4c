-- scripts/fix_role_escalation.sql

-- Prevent users from escalating their own privileges or changing their chapter
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user modifying the row is NOT a national_admin
  IF get_user_role() != 'national_admin' THEN
    -- Prevent role changes
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Unauthorized: You do not have permission to change roles.';
    END IF;
    -- Prevent chapter_id changes
    IF NEW.chapter_id IS DISTINCT FROM OLD.chapter_id THEN
      RAISE EXCEPTION 'Unauthorized: You do not have permission to change chapters.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the trigger to the users table
DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON users;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE prevent_role_escalation();
