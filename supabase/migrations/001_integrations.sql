-- Integration connections (Google, Slack, etc.)
CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google_sheets', 'google_drive', 'slack', 'zapier', 'quickbooks', 'xero', 'plaid')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Webhook subscriptions (Zapier/Make)
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  event_types TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
DO $$ BEGIN
  ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
  ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can manage own integrations" ON integration_connections
    FOR ALL USING (auth.uid() = user_id);

  CREATE POLICY "Users can manage own webhooks" ON webhook_subscriptions
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integrations_user_provider ON integration_connections(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhook_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhook_subscriptions(active) WHERE active = true;

-- Updated_at trigger
CREATE OR REPLACE TRIGGER set_integration_updated_at
  BEFORE UPDATE ON integration_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
