-- Email parsing infrastructure
-- Adds inbound email prefix to user profiles and parsed_emails table for inbox review

-- Add inbound email prefix to user profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS inbound_email_prefix TEXT UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_inbound_prefix ON user_profiles(inbound_email_prefix);

-- Parsed emails table (inbox for review)
CREATE TABLE IF NOT EXISTS parsed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE,
  category TEXT NOT NULL DEFAULT 'other',
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  source_from TEXT,
  source_subject TEXT,
  status TEXT NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review', 'ready', 'approved', 'dismissed')),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parsed_emails_user_id ON parsed_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_parsed_emails_status ON parsed_emails(status);
CREATE INDEX IF NOT EXISTS idx_parsed_emails_user_status ON parsed_emails(user_id, status);

-- RLS
ALTER TABLE parsed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own parsed emails"
  ON parsed_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own parsed emails"
  ON parsed_emails FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert (webhook runs as service role)
CREATE POLICY "Service role can insert parsed emails"
  ON parsed_emails FOR INSERT
  WITH CHECK (true);
