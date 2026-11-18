-- W-9 flag and TIN last 4 for 1099-NEC payees.
-- Do not add a column for a full SSN or EIN. The check below rejects anything
-- other than four digits.

create table if not exists public.vendor_tax_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vendor_key text not null check (char_length(vendor_key) between 1 and 200),
  w9_on_file boolean not null default false,
  tin_last4 text check (tin_last4 is null or tin_last4 ~ '^[0-9]{4}$'),
  updated_at timestamptz not null default now(),
  unique (user_id, vendor_key)
);

alter table public.vendor_tax_profiles enable row level security;

drop policy if exists "select_vendor_tax_profiles" on public.vendor_tax_profiles;
drop policy if exists "insert_vendor_tax_profiles" on public.vendor_tax_profiles;
drop policy if exists "update_vendor_tax_profiles" on public.vendor_tax_profiles;
drop policy if exists "delete_vendor_tax_profiles" on public.vendor_tax_profiles;

create policy "select_vendor_tax_profiles" on public.vendor_tax_profiles
  for select using (auth.uid() = user_id);
create policy "insert_vendor_tax_profiles" on public.vendor_tax_profiles
  for insert with check (auth.uid() = user_id);
create policy "update_vendor_tax_profiles" on public.vendor_tax_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_vendor_tax_profiles" on public.vendor_tax_profiles
  for delete using (auth.uid() = user_id);
