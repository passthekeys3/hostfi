-- Occupancy (lodging) tax rates and remittances the account holder enters.
-- HostFi does not store jurisdiction rate tables.

create table if not exists public.occupancy_tax_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  jurisdiction text not null default '',
  rate_percent numeric(7,4) not null check (rate_percent >= 0 and rate_percent <= 100),
  updated_at timestamptz not null default now(),
  unique (user_id, property_id)
);

create table if not exists public.occupancy_tax_remittances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  period_start date not null,
  cadence text not null check (cadence in ('monthly', 'quarterly')),
  collected_by_platform numeric(12,2) not null default 0 check (collected_by_platform >= 0),
  remitted_by_platform numeric(12,2) not null default 0 check (remitted_by_platform >= 0),
  remitted_by_host numeric(12,2) not null default 0 check (remitted_by_host >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, property_id, period_start, cadence)
);

alter table public.occupancy_tax_rates enable row level security;
alter table public.occupancy_tax_remittances enable row level security;

-- Invoker rights: properties RLS already limits the row to the signed-in user.
create or replace function public.occupancy_tax_owns_property(property uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.properties
    where id = property and user_id = auth.uid()
  );
$$;

revoke all on function public.occupancy_tax_owns_property(uuid) from public;
grant execute on function public.occupancy_tax_owns_property(uuid) to authenticated;

drop policy if exists "select_occupancy_tax_rates" on public.occupancy_tax_rates;
drop policy if exists "insert_occupancy_tax_rates" on public.occupancy_tax_rates;
drop policy if exists "update_occupancy_tax_rates" on public.occupancy_tax_rates;
drop policy if exists "delete_occupancy_tax_rates" on public.occupancy_tax_rates;

create policy "select_occupancy_tax_rates" on public.occupancy_tax_rates
  for select using (auth.uid() = user_id);
create policy "insert_occupancy_tax_rates" on public.occupancy_tax_rates
  for insert with check (auth.uid() = user_id and public.occupancy_tax_owns_property(property_id));
create policy "update_occupancy_tax_rates" on public.occupancy_tax_rates
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.occupancy_tax_owns_property(property_id));
create policy "delete_occupancy_tax_rates" on public.occupancy_tax_rates
  for delete using (auth.uid() = user_id);

drop policy if exists "select_occupancy_tax_remittances" on public.occupancy_tax_remittances;
drop policy if exists "insert_occupancy_tax_remittances" on public.occupancy_tax_remittances;
drop policy if exists "update_occupancy_tax_remittances" on public.occupancy_tax_remittances;
drop policy if exists "delete_occupancy_tax_remittances" on public.occupancy_tax_remittances;

create policy "select_occupancy_tax_remittances" on public.occupancy_tax_remittances
  for select using (auth.uid() = user_id);
create policy "insert_occupancy_tax_remittances" on public.occupancy_tax_remittances
  for insert with check (auth.uid() = user_id and public.occupancy_tax_owns_property(property_id));
create policy "update_occupancy_tax_remittances" on public.occupancy_tax_remittances
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.occupancy_tax_owns_property(property_id));
create policy "delete_occupancy_tax_remittances" on public.occupancy_tax_remittances
  for delete using (auth.uid() = user_id);
