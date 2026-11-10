-- Figures the user types for 1099-K reconciliation.
-- Booking gross, fees, and bank deposits stay on public.revenue.
create table if not exists public.tax_reconciliations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tax_year integer not null,
  platform text not null,
  form_1099k_gross numeric(12,2),
  occupancy_tax numeric(12,2) not null default 0,
  adjustments numeric(12,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, tax_year, platform)
);

alter table public.tax_reconciliations enable row level security;

drop policy if exists "select_tax_reconciliations" on public.tax_reconciliations;
drop policy if exists "insert_tax_reconciliations" on public.tax_reconciliations;
drop policy if exists "update_tax_reconciliations" on public.tax_reconciliations;
drop policy if exists "delete_tax_reconciliations" on public.tax_reconciliations;

create policy "select_tax_reconciliations" on public.tax_reconciliations
  for select using (auth.uid() = user_id);
create policy "insert_tax_reconciliations" on public.tax_reconciliations
  for insert with check (auth.uid() = user_id);
create policy "update_tax_reconciliations" on public.tax_reconciliations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_tax_reconciliations" on public.tax_reconciliations
  for delete using (auth.uid() = user_id);
