-- ══════════════════════════════════════════════════════════════
-- Contact Messages Table
-- ──────────────────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor to create the table.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contact_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Allow anyone (including unauthenticated visitors) to submit a message
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Public INSERT (anyone can submit a contact form)
CREATE POLICY "public_insert_contact"
  ON contact_messages
  FOR INSERT
  WITH CHECK (true);

-- Admin-only read/update/delete
CREATE POLICY "admin_contact_messages"
  ON contact_messages
  FOR ALL
  USING (is_admin());

-- Index for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_contact_messages_created
  ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_read
  ON contact_messages(is_read);
