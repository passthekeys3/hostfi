-- Populate full_name from Google OAuth metadata on signup
-- Also backfills existing users who signed up via Google but have no full_name

-- 1. Update the trigger function to pull full_name from OAuth metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, billing_email)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    'expenses-' || substr(new.id::text, 1, 8) || '@hostfi.ai'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 2. Backfill existing users who have a name in metadata but not in profiles
update public.profiles p
set full_name = coalesce(
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'name'
)
from auth.users u
where p.id = u.id
  and p.full_name is null
  and (u.raw_user_meta_data->>'full_name' is not null
    or u.raw_user_meta_data->>'name' is not null);
