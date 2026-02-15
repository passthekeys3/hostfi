-- Alert preferences for email notifications
CREATE TABLE IF NOT EXISTS alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  alert_types JSONB NOT NULL DEFAULT '{}',
  -- alert_types structure:
  -- {
  --   "anomaly": { "enabled": true, "frequency": "immediately" },
  --   "bill_due": { "enabled": true, "frequency": "3_days_before" },
  --   "bill_overdue": { "enabled": true, "frequency": "immediately" },
  --   "weekly_digest": { "enabled": true, "day": "monday", "time": "09:00" },
  --   "monthly_report": { "enabled": false, "day": "1", "time": "09:00" }
  -- }
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alert prefs" ON alert_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Trigger to update updated_at on change
CREATE OR REPLACE FUNCTION update_alert_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_preferences_updated_at
  BEFORE UPDATE ON alert_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_preferences_updated_at();
