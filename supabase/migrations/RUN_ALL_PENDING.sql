-- PMS integration indexes for efficient upsert lookups
-- These partial indexes only index rows that have PMS IDs, keeping them small

-- Hostaway indexes
CREATE INDEX IF NOT EXISTS idx_properties_hostaway_listing_id 
  ON public.properties(hostaway_listing_id) 
  WHERE hostaway_listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_hostaway_reservation_id 
  ON public.revenue(hostaway_reservation_id) 
  WHERE hostaway_reservation_id IS NOT NULL;

-- OwnerRez indexes
CREATE INDEX IF NOT EXISTS idx_properties_ownerrez_property_id 
  ON public.properties(ownerrez_property_id) 
  WHERE ownerrez_property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_ownerrez_booking_id 
  ON public.revenue(ownerrez_booking_id) 
  WHERE ownerrez_booking_id IS NOT NULL;
-- ============================================================================
-- Plaid Matching & Smart Features Migration
-- ============================================================================

-- Expense source tracking
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS plaid_transaction_id text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';
-- verification_status values: 'verified' (matched bill+bank), 'unverified' (bill only), 'no_receipt' (bank only)

-- Update source check constraint to include 'plaid' and 'pms_sync'
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_source_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_source_check 
  CHECK (source IN ('manual', 'email_parse', 'recurring_auto', 'receipt_scan', 'csv_import', 'plaid', 'pms_sync'));

CREATE INDEX IF NOT EXISTS idx_expenses_plaid_txn_id ON public.expenses(plaid_transaction_id) WHERE plaid_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_verification ON public.expenses(verification_status);

-- ============================================================================
-- Plaid Items (sync state and cursor tracking per item)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plaid_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  access_token text NOT NULL,
  institution_name text,
  institution_id text,
  sync_cursor text,
  last_synced_at timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'error', 'pending_expiration', 'disconnected')),
  error_code text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own items" ON public.plaid_items;
CREATE POLICY "Users see own items" ON public.plaid_items FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_plaid_items_user ON public.plaid_items(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_item_id ON public.plaid_items(item_id);

-- ============================================================================
-- Plaid Account-to-Property Mapping
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plaid_account_mappings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_account_id text NOT NULL,
  account_name text,
  account_mask text,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, plaid_account_id)
);

ALTER TABLE public.plaid_account_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own mappings" ON public.plaid_account_mappings;
CREATE POLICY "Users see own mappings" ON public.plaid_account_mappings FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_plaid_mappings_user ON public.plaid_account_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_mappings_account ON public.plaid_account_mappings(plaid_account_id);

-- ============================================================================
-- Ignored Merchants (personal transactions to skip)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plaid_ignored_merchants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, merchant_name)
);

ALTER TABLE public.plaid_ignored_merchants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own ignored" ON public.plaid_ignored_merchants;
CREATE POLICY "Users see own ignored" ON public.plaid_ignored_merchants FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ignored_merchants_user ON public.plaid_ignored_merchants(user_id);

-- ============================================================================
-- Recurring Transaction Rules (auto-categorize)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plaid_recurring_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_pattern text NOT NULL,
  category text NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.plaid_recurring_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own rules" ON public.plaid_recurring_rules;
CREATE POLICY "Users see own rules" ON public.plaid_recurring_rules FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recurring_rules_user ON public.plaid_recurring_rules(user_id);

-- ============================================================================
-- Expense Splits (for multi-property allocation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount >= 0),
  percentage numeric CHECK (percentage >= 0 AND percentage <= 100),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own splits" ON public.expense_splits;
CREATE POLICY "Users see own splits" ON public.expense_splits FOR ALL USING (
  EXISTS (SELECT 1 FROM public.expenses WHERE expenses.id = expense_splits.expense_id AND expenses.user_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_property ON public.expense_splits(property_id);

-- ============================================================================
-- Add is_split flag to expenses
-- ============================================================================
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_split boolean DEFAULT false;

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_plaid()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plaid_items_updated_at ON public.plaid_items;
CREATE TRIGGER plaid_items_updated_at BEFORE UPDATE ON public.plaid_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_plaid();

DROP TRIGGER IF EXISTS plaid_mappings_updated_at ON public.plaid_account_mappings;
CREATE TRIGGER plaid_mappings_updated_at BEFORE UPDATE ON public.plaid_account_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_plaid();

DROP TRIGGER IF EXISTS plaid_rules_updated_at ON public.plaid_recurring_rules;
CREATE TRIGGER plaid_rules_updated_at BEFORE UPDATE ON public.plaid_recurring_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_plaid();
-- Add missing columns used by the codebase to the revenue table
-- Run this manually in Supabase SQL Editor

ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS nights integer;
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS payout_date date;
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS confirmation_code text;

-- Add index for faster lookups by confirmation code (used for duplicate detection)
CREATE INDEX IF NOT EXISTS idx_revenue_confirmation_code ON public.revenue(confirmation_code) WHERE confirmation_code IS NOT NULL;
