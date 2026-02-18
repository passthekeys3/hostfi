-- Add missing columns used by the codebase to the revenue table
-- Run this manually in Supabase SQL Editor

ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS nights integer;
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS payout_date date;
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS confirmation_code text;

-- Add index for faster lookups by confirmation code (used for duplicate detection)
CREATE INDEX IF NOT EXISTS idx_revenue_confirmation_code ON public.revenue(confirmation_code) WHERE confirmation_code IS NOT NULL;
