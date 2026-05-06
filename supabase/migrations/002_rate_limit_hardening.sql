-- ratemyidea.ai rate-limit hardening
-- Run this in Supabase SQL Editor before relying on extra-credit consumption in production.

create index if not exists idx_evaluations_user_created_at_desc
  on evaluations(user_id, created_at desc);

create index if not exists idx_evaluations_ip_hash_created_at
  on evaluations(ip_hash, created_at);

create unique index if not exists idx_user_subscriptions_user_id_unique
  on user_subscriptions(user_id);

create unique index if not exists idx_share_tokens_token_unique
  on share_tokens(token);

create or replace function consume_extra_credit(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int;
begin
  update user_subscriptions
  set
    extra_credits = extra_credits - 1,
    updated_at = now()
  where user_id = target_user_id
    and coalesce(extra_credits, 0) > 0;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;
