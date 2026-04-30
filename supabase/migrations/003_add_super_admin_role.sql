-- Add super-admin role to members table
-- Run this in Supabase SQL Editor

-- Update the role check constraint to include super-admin
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_role_check;
ALTER TABLE members ADD CONSTRAINT members_role_check CHECK (role IN ('super-admin', 'admin', 'viewer'));

-- Update the is_admin() function to also recognize super-admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE auth_user_id = auth.uid()
    AND role IN ('admin', 'super-admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
