-- Add email preferences column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_preferences jsonb DEFAULT '{"email_weekly_digest": true, "email_monthly_report": true, "email_tips": true, "email_anomaly_alerts": true}'::jsonb;
