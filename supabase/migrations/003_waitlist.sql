-- Waitlist for early access signups
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'landing_page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at DESC);

-- No RLS needed — only service role inserts via API
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_waitlist" ON waitlist FOR INSERT WITH CHECK (true);
