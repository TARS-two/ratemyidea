-- ratemyidea.ai schema
-- Run this in Supabase SQL Editor

-- Evaluations (anonymous + logged in)
create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  ip_hash text,
  idea_text text not null,
  idea_name text,
  overall_score float,
  category text,
  lang text default 'en',
  badge text,
  result_json jsonb,
  created_at timestamptz default now()
);

create index idx_evaluations_ip_hash_date on evaluations(ip_hash, created_at);
create index idx_evaluations_user_id on evaluations(user_id);
create index idx_evaluations_category on evaluations(category);

-- User subscriptions
create table if not exists user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text default 'free',
  status text default 'active',
  strategic_plans_used int default 0,
  strategic_plans_reset_at date default current_date,
  extra_credits int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Share referral tokens
create table if not exists share_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  sharer_user_id uuid references auth.users(id) on delete cascade,
  evaluation_id uuid references evaluations(id) on delete set null,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table evaluations enable row level security;
alter table user_subscriptions enable row level security;
alter table share_tokens enable row level security;

-- Policies: users see own data
create policy "Users see own evaluations" on evaluations
  for select using (auth.uid() = user_id);

create policy "Users see own subscription" on user_subscriptions
  for select using (auth.uid() = user_id);

create policy "Users see own share tokens" on share_tokens
  for select using (auth.uid() = sharer_user_id);
