-- Migration: 002_expenses_and_features
-- Description: Add expenses, recurring expenses, receipts, anomaly detection, alert preferences,
--              and extend profiles with onboarding/plan fields.
-- Date: 2026-02-07

-- ============================================================================
-- A. Expenses table
-- ============================================================================
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  category text not null, -- 'utility', 'cleaning', 'insurance', 'maintenance', 'mortgage', 'supplies', 'taxes', 'management', 'subscription', 'improvement', 'other'
  description text,
  vendor text,
  amount decimal(10,2) not null,
  date date not null,
  frequency text default 'one-time', -- 'one-time', 'per-turnover', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'
  is_recurring boolean default false,
  recurring_expense_id uuid, -- populated after recurring_expenses table created; FK added below
  source text default 'manual', -- 'manual', 'email_parse', 'recurring_auto', 'receipt_scan'
  status text default 'pending', -- 'pending', 'paid', 'overdue', 'scheduled'
  payment_method text,
  notes text,
  receipt_url text,
  -- For email-parsed expenses (migrated from bills)
  utility_account_id uuid references public.utility_accounts(id),
  billing_period_start date,
  billing_period_end date,
  due_date date,
  raw_email_id text,
  confidence_score decimal(3,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  paid_at timestamptz
);

-- ============================================================================
-- B. Recurring Expenses table
-- ============================================================================
create table public.recurring_expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  category text not null,
  description text not null,
  vendor text,
  amount decimal(10,2) not null,
  frequency text not null, -- 'per-turnover', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'
  is_active boolean default true,
  next_due_date date,
  last_generated_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Now add the FK from expenses.recurring_expense_id → recurring_expenses.id
alter table public.expenses
  add constraint fk_expenses_recurring_expense
  foreign key (recurring_expense_id) references public.recurring_expenses(id) on delete set null;

-- ============================================================================
-- C. Receipts table
-- ============================================================================
create table public.receipts (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid references public.expenses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  file_url text not null,
  file_name text,
  file_type text, -- 'image/jpeg', 'image/png', 'application/pdf'
  file_size_bytes integer,
  -- Parsed data from AI
  parsed_vendor text,
  parsed_amount decimal(10,2),
  parsed_date date,
  parsed_category text,
  parsed_items jsonb, -- array of {description, amount}
  parsed_tax decimal(10,2),
  parsed_subtotal decimal(10,2),
  parsed_payment_method text,
  confidence decimal(3,2),
  raw_text text,
  created_at timestamptz default now()
);

-- ============================================================================
-- D. Anomaly Logs table
-- ============================================================================
create table public.anomaly_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  expense_id uuid references public.expenses(id),
  property_id uuid references public.properties(id),
  anomaly_type text not null, -- 'spike', 'unusual_pattern', 'possible_leak', 'rate_increase', 'new_high'
  severity text not null, -- 'low', 'medium', 'high', 'critical'
  utility_type text,
  current_amount decimal(10,2),
  expected_amount decimal(10,2),
  deviation_percent decimal(5,2),
  message text not null,
  recommendation text,
  seasonal_context text,
  status text default 'new', -- 'new', 'acknowledged', 'resolved', 'dismissed'
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- ============================================================================
-- E. Alert Preferences table
-- ============================================================================
create table public.alert_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique,
  due_soon_enabled boolean default true,
  due_soon_days integer default 3,
  overdue_enabled boolean default true,
  unusual_amount_enabled boolean default true,
  unusual_amount_threshold integer default 30, -- percentage
  missing_bill_enabled boolean default true,
  new_parsed_enabled boolean default true,
  email_notifications boolean default false,
  push_notifications boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- F. Update profiles table
-- ============================================================================
alter table public.profiles add column if not exists onboarding_completed boolean default false;
alter table public.profiles add column if not exists onboarding_step integer default 0;
alter table public.profiles add column if not exists plan text default 'free';
alter table public.profiles add column if not exists properties_limit integer default 3;

-- ============================================================================
-- G. Indexes
-- ============================================================================
create index idx_expenses_user_id on public.expenses(user_id);
create index idx_expenses_property_id on public.expenses(property_id);
create index idx_expenses_date on public.expenses(date);
create index idx_expenses_category on public.expenses(category);
create index idx_expenses_status on public.expenses(status);
create index idx_recurring_expenses_user_id on public.recurring_expenses(user_id);
create index idx_recurring_expenses_next_due on public.recurring_expenses(next_due_date) where is_active = true;
create index idx_receipts_expense_id on public.receipts(expense_id);
create index idx_receipts_user_id on public.receipts(user_id);
create index idx_anomaly_logs_user_id on public.anomaly_logs(user_id);
create index idx_anomaly_logs_status on public.anomaly_logs(status);
create index idx_properties_user_id on public.properties(user_id);

-- ============================================================================
-- H. RLS Policies
-- ============================================================================

-- Expenses
alter table public.expenses enable row level security;

create policy "Users can view own expenses"
  on public.expenses for select using (auth.uid() = user_id);
create policy "Users can insert own expenses"
  on public.expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own expenses"
  on public.expenses for update using (auth.uid() = user_id);
create policy "Users can delete own expenses"
  on public.expenses for delete using (auth.uid() = user_id);

-- Recurring Expenses
alter table public.recurring_expenses enable row level security;

create policy "Users can view own recurring expenses"
  on public.recurring_expenses for select using (auth.uid() = user_id);
create policy "Users can insert own recurring expenses"
  on public.recurring_expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own recurring expenses"
  on public.recurring_expenses for update using (auth.uid() = user_id);
create policy "Users can delete own recurring expenses"
  on public.recurring_expenses for delete using (auth.uid() = user_id);

-- Receipts
alter table public.receipts enable row level security;

create policy "Users can view own receipts"
  on public.receipts for select using (auth.uid() = user_id);
create policy "Users can insert own receipts"
  on public.receipts for insert with check (auth.uid() = user_id);
create policy "Users can update own receipts"
  on public.receipts for update using (auth.uid() = user_id);
create policy "Users can delete own receipts"
  on public.receipts for delete using (auth.uid() = user_id);

-- Anomaly Logs
alter table public.anomaly_logs enable row level security;

create policy "Users can view own anomaly logs"
  on public.anomaly_logs for select using (auth.uid() = user_id);
create policy "Users can insert own anomaly logs"
  on public.anomaly_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own anomaly logs"
  on public.anomaly_logs for update using (auth.uid() = user_id);

-- Alert Preferences
alter table public.alert_preferences enable row level security;

create policy "Users can view own alert preferences"
  on public.alert_preferences for select using (auth.uid() = user_id);
create policy "Users can insert own alert preferences"
  on public.alert_preferences for insert with check (auth.uid() = user_id);
create policy "Users can update own alert preferences"
  on public.alert_preferences for update using (auth.uid() = user_id);

-- ============================================================================
-- I. Database Functions & Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply triggers
create trigger expenses_updated_at
  before update on public.expenses
  for each row execute function update_updated_at();

create trigger recurring_expenses_updated_at
  before update on public.recurring_expenses
  for each row execute function update_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at();

create trigger properties_updated_at
  before update on public.properties
  for each row execute function update_updated_at();

create trigger alert_preferences_updated_at
  before update on public.alert_preferences
  for each row execute function update_updated_at();
