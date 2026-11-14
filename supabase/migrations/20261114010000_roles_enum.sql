-- ══════════════════════════════════════════════════════════════
-- Roles: add the super admin (store owner) role.
-- Kept in its own migration: a new enum value can only be used
-- after the transaction that adds it has committed.
-- ══════════════════════════════════════════════════════════════
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
