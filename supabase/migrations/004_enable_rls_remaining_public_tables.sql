-- Enable RLS on legacy public tables flagged by Supabase Security Advisor.
-- These tables are not used by the current app flow, but they live in the public schema.
-- Keep access closed by default; service-role backend code can still access them when needed.

alter table if exists free_tier_templates enable row level security;
alter table if exists profiles enable row level security;

-- profiles.id is the auth user id in the legacy profile table shape.
-- Authenticated users may read/update only their own profile if this table is reused later.
do $$
begin
  if to_regclass('public.profiles') is not null then
    drop policy if exists "Users see own profile" on profiles;
    create policy "Users see own profile" on profiles
      for select using (auth.uid() = id);

    drop policy if exists "Users update own profile" on profiles;
    create policy "Users update own profile" on profiles
      for update using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end;
$$;

-- free_tier_templates intentionally has no anon/auth policy.
-- If templates are reintroduced later, add a narrow read-only policy instead of disabling RLS.
