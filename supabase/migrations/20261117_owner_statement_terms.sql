-- Co-host / management fee terms for owner statements.
-- Rent has to be an allowed expense category so arbitrage rent can be saved.
-- The new check is validated before the old one is dropped. If a row uses a
-- category outside this list, the migration stops and the old check stays.

alter table public.expenses drop constraint if exists expenses_category_with_rent;
alter table public.expenses
  add constraint expenses_category_with_rent
  check (category in (
    'utility', 'cleaning', 'insurance', 'maintenance', 'mortgage', 'rent',
    'supplies', 'taxes', 'management', 'subscription', 'improvement', 'other'
  )) not valid;

alter table public.expenses validate constraint expenses_category_with_rent;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'expenses'
      and con.contype = 'c'
      and con.conname <> 'expenses_category_with_rent'
      and pg_get_constraintdef(con.oid) ilike '%category%'
      and pg_get_constraintdef(con.oid) ilike '%utility%'
  loop
    execute format('alter table public.expenses drop constraint %I', constraint_name);
  end loop;
end $$;

create table if not exists public.owner_statement_terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  fee_percent numeric(6,3) not null default 0 check (fee_percent >= 0 and fee_percent <= 100),
  fee_flat numeric(12,2) not null default 0 check (fee_flat >= 0),
  fee_basis text not null default 'gross' check (fee_basis in ('gross', 'after_platform_fees')),
  flat_per text not null default 'period' check (flat_per in ('period', 'booking')),
  updated_at timestamptz not null default now(),
  unique (user_id, property_id)
);

alter table public.owner_statement_terms enable row level security;

create or replace function public.owner_statement_owns_property(property uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.properties
    where id = property and user_id = auth.uid()
  );
$$;

revoke all on function public.owner_statement_owns_property(uuid) from public;
grant execute on function public.owner_statement_owns_property(uuid) to authenticated;

drop policy if exists "select_owner_statement_terms" on public.owner_statement_terms;
drop policy if exists "insert_owner_statement_terms" on public.owner_statement_terms;
drop policy if exists "update_owner_statement_terms" on public.owner_statement_terms;
drop policy if exists "delete_owner_statement_terms" on public.owner_statement_terms;

create policy "select_owner_statement_terms" on public.owner_statement_terms
  for select using (auth.uid() = user_id);
create policy "insert_owner_statement_terms" on public.owner_statement_terms
  for insert with check (auth.uid() = user_id and public.owner_statement_owns_property(property_id));
create policy "update_owner_statement_terms" on public.owner_statement_terms
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.owner_statement_owns_property(property_id));
create policy "delete_owner_statement_terms" on public.owner_statement_terms
  for delete using (auth.uid() = user_id);
