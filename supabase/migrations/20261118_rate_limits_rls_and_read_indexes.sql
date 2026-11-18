-- rate_limits is written only with the service role. With RLS off, the anon
-- key can read and reset every limiter. Enabling RLS with no policies denies
-- anon and authenticated. The service role bypasses RLS.
alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;

-- Dashboard loads filter by the signed-in user and order by date.
-- Separate user_id and date indexes are already present. These match that query.
create index if not exists idx_expenses_user_date
  on public.expenses (user_id, date desc);
create index if not exists idx_revenue_user_date
  on public.revenue (user_id, date desc);
create index if not exists idx_anomaly_logs_user_created
  on public.anomaly_logs (user_id, created_at desc);
