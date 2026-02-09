-- Users extend Supabase auth
create table public.profiles (
  id uuid references auth.users primary key,
  email text,
  full_name text,
  billing_email text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Properties
create table public.properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  zip text not null,
  property_type text default 'str',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Utility accounts linked to properties
create table public.utility_accounts (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references public.properties(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  provider_name text not null,
  account_number text,
  utility_type text not null,
  autopay boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Parsed bills
create table public.bills (
  id uuid default gen_random_uuid() primary key,
  utility_account_id uuid references public.utility_accounts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  amount decimal(10,2) not null,
  due_date date,
  billing_period_start date,
  billing_period_end date,
  status text default 'pending',
  payment_method text,
  source text default 'manual',
  raw_email_id text,
  confidence_score decimal(3,2),
  created_at timestamptz default now(),
  paid_at timestamptz
);

-- Bill-to-property mapping learning
create table public.bill_mappings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  sender_email text,
  sender_name text,
  provider_name text,
  property_id uuid references public.properties(id),
  utility_account_id uuid references public.utility_accounts(id),
  match_type text,
  confidence decimal(3,2) default 1.0,
  created_at timestamptz default now()
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.utility_accounts enable row level security;
alter table public.bills enable row level security;
alter table public.bill_mappings enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can view own properties" on public.properties for select using (auth.uid() = user_id);
create policy "Users can insert own properties" on public.properties for insert with check (auth.uid() = user_id);
create policy "Users can update own properties" on public.properties for update using (auth.uid() = user_id);
create policy "Users can delete own properties" on public.properties for delete using (auth.uid() = user_id);
create policy "Users can view own utility accounts" on public.utility_accounts for select using (auth.uid() = user_id);
create policy "Users can insert own utility accounts" on public.utility_accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own utility accounts" on public.utility_accounts for update using (auth.uid() = user_id);
create policy "Users can delete own utility accounts" on public.utility_accounts for delete using (auth.uid() = user_id);
create policy "Users can view own bills" on public.bills for select using (auth.uid() = user_id);
create policy "Users can insert own bills" on public.bills for insert with check (auth.uid() = user_id);
create policy "Users can update own bills" on public.bills for update using (auth.uid() = user_id);
create policy "Users can view own mappings" on public.bill_mappings for select using (auth.uid() = user_id);
create policy "Users can insert own mappings" on public.bill_mappings for insert with check (auth.uid() = user_id);
