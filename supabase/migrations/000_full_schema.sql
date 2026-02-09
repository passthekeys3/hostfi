-- ============================================================================
-- HostFi — Full Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This is a combined, single-file migration for fresh Supabase projects.
-- ============================================================================

-- ============================================================================
-- 1. PROFILES (extends Supabase Auth)
-- ============================================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  billing_email text unique,
  onboarding_completed boolean default false,
  onboarding_step integer default 0,
  plan text default 'free',
  stripe_customer_id text unique,
  stripe_subscription_id text,
  properties_limit integer default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, billing_email)
  values (
    new.id,
    new.email,
    'expenses-' || substr(new.id::text, 1, 8) || '@hostfi.ai'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. PROPERTIES
-- ============================================================================
create table public.properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  zip text not null,
  property_type text default 'str' check (property_type in ('str', 'ltr', 'primary')),
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- 3. EXPENSES
-- ============================================================================
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  category text not null check (category in (
    'utility', 'cleaning', 'insurance', 'maintenance', 'mortgage',
    'supplies', 'taxes', 'management', 'subscription', 'improvement', 'other'
  )),
  description text,
  vendor text,
  amount decimal(10,2) not null check (amount >= 0 and amount <= 10000000),
  date date not null,
  due_date date,
  frequency text default 'one-time' check (frequency in (
    'one-time', 'per-turnover', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'
  )),
  is_recurring boolean default false,
  recurring_expense_id uuid,
  source text default 'manual' check (source in ('manual', 'email_parse', 'recurring_auto', 'receipt_scan', 'csv_import')),
  status text default 'pending' check (status in ('pending', 'paid', 'overdue', 'scheduled')),
  payment_method text,
  notes text,
  receipt_url text,
  billing_period_start date,
  billing_period_end date,
  raw_email_id text,
  confidence_score decimal(3,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  paid_at timestamptz
);

-- ============================================================================
-- 4. RECURRING EXPENSES
-- ============================================================================
create table public.recurring_expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  category text not null,
  description text not null,
  vendor text,
  amount decimal(10,2) not null check (amount >= 0),
  frequency text not null check (frequency in (
    'per-turnover', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'
  )),
  is_active boolean default true,
  next_due_date date,
  last_generated_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.expenses
  add constraint fk_expenses_recurring
  foreign key (recurring_expense_id) references public.recurring_expenses(id) on delete set null;

-- ============================================================================
-- 5. REVENUE
-- ============================================================================
create table public.revenue (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  platform text not null check (platform in ('airbnb', 'vrbo', 'direct', 'booking_com', 'other')),
  description text,
  guest_name text,
  amount decimal(10,2) not null check (amount >= 0),
  payout_amount decimal(10,2),
  platform_fee decimal(10,2),
  check_in date,
  check_out date,
  date date not null,
  source text default 'manual' check (source in ('manual', 'csv_import', 'api_sync')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- 6. RECEIPTS
-- ============================================================================
create table public.receipts (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid references public.expenses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade not null,
  file_url text not null,
  file_name text,
  file_type text,
  file_size_bytes integer,
  parsed_vendor text,
  parsed_amount decimal(10,2),
  parsed_date date,
  parsed_category text,
  parsed_items jsonb,
  parsed_tax decimal(10,2),
  parsed_subtotal decimal(10,2),
  parsed_payment_method text,
  confidence decimal(3,2),
  raw_text text,
  created_at timestamptz default now()
);

-- ============================================================================
-- 7. ANOMALY LOGS
-- ============================================================================
create table public.anomaly_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  expense_id uuid references public.expenses(id),
  property_id uuid references public.properties(id),
  anomaly_type text not null check (anomaly_type in (
    'spike', 'unusual_pattern', 'possible_leak', 'rate_increase', 'new_high'
  )),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  utility_type text,
  current_amount decimal(10,2),
  expected_amount decimal(10,2),
  deviation_percent decimal(5,2),
  message text not null,
  recommendation text,
  seasonal_context text,
  status text default 'new' check (status in ('new', 'acknowledged', 'resolved', 'dismissed')),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- ============================================================================
-- 8. ALERT PREFERENCES
-- ============================================================================
create table public.alert_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade unique not null,
  due_soon_enabled boolean default true,
  due_soon_days integer default 3,
  overdue_enabled boolean default true,
  unusual_amount_enabled boolean default true,
  unusual_amount_threshold integer default 30,
  missing_bill_enabled boolean default true,
  new_parsed_enabled boolean default true,
  email_notifications boolean default false,
  push_notifications boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- 9. INBOUND EMAILS (for bill parsing)
-- ============================================================================
create table public.inbound_emails (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  from_email text not null,
  from_name text,
  subject text,
  body_text text,
  body_html text,
  attachments jsonb,
  parsed boolean default false,
  expense_id uuid references public.expenses(id),
  parse_error text,
  received_at timestamptz default now()
);

-- ============================================================================
-- 10. INDEXES
-- ============================================================================
create index idx_properties_user on public.properties(user_id);
create index idx_expenses_user on public.expenses(user_id);
create index idx_expenses_property on public.expenses(property_id);
create index idx_expenses_date on public.expenses(date);
create index idx_expenses_category on public.expenses(category);
create index idx_expenses_status on public.expenses(status);
create index idx_revenue_user on public.revenue(user_id);
create index idx_revenue_property on public.revenue(property_id);
create index idx_revenue_date on public.revenue(date);
create index idx_recurring_user on public.recurring_expenses(user_id);
create index idx_recurring_next_due on public.recurring_expenses(next_due_date) where is_active = true;
create index idx_receipts_expense on public.receipts(expense_id);
create index idx_receipts_user on public.receipts(user_id);
create index idx_anomaly_user on public.anomaly_logs(user_id);
create index idx_anomaly_status on public.anomaly_logs(status);
create index idx_inbound_user on public.inbound_emails(user_id);
create index idx_inbound_parsed on public.inbound_emails(parsed) where parsed = false;

-- ============================================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.expenses enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.revenue enable row level security;
alter table public.receipts enable row level security;
alter table public.anomaly_logs enable row level security;
alter table public.alert_preferences enable row level security;
alter table public.inbound_emails enable row level security;

-- Helper: all tables follow the same user_id pattern
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'properties', 'expenses', 'recurring_expenses', 'revenue',
    'receipts', 'anomaly_logs', 'alert_preferences', 'inbound_emails'
  ]) loop
    execute format('create policy "select_%s" on public.%I for select using (auth.uid() = user_id)', t, t);
    execute format('create policy "insert_%s" on public.%I for insert with check (auth.uid() = user_id)', t, t);
    execute format('create policy "update_%s" on public.%I for update using (auth.uid() = user_id)', t, t);
    execute format('create policy "delete_%s" on public.%I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end $$;

-- Profiles: users can only access their own row
create policy "select_profiles" on public.profiles for select using (auth.uid() = id);
create policy "update_profiles" on public.profiles for update using (auth.uid() = id);

-- ============================================================================
-- 12. TRIGGERS (auto-update updated_at)
-- ============================================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles for each row execute function update_updated_at();
create trigger properties_updated_at before update on public.properties for each row execute function update_updated_at();
create trigger expenses_updated_at before update on public.expenses for each row execute function update_updated_at();
create trigger recurring_updated_at before update on public.recurring_expenses for each row execute function update_updated_at();
create trigger revenue_updated_at before update on public.revenue for each row execute function update_updated_at();
create trigger alerts_updated_at before update on public.alert_preferences for each row execute function update_updated_at();
