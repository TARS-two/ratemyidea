-- Paid extra evaluation credits
-- Uses share_tokens as a lightweight idempotency ledger keyed by Stripe checkout session.

create or replace function increment_extra_credit(target_user_id uuid, credit_token text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  marker_token text := coalesce(nullif(credit_token, ''), 'paid_extra_' || gen_random_uuid()::text);
  new_credits integer;
begin
  insert into share_tokens (token, sharer_user_id, evaluation_id, redeemed_by, redeemed_at)
  values (marker_token, target_user_id, null, target_user_id, now())
  on conflict (token) do nothing;

  if not found then
    select coalesce(extra_credits, 0)
      into new_credits
      from user_subscriptions
      where user_id = target_user_id;
    return coalesce(new_credits, 0);
  end if;

  insert into user_subscriptions (user_id, extra_credits, updated_at)
  values (target_user_id, 1, now())
  on conflict (user_id)
  do update set
    extra_credits = coalesce(user_subscriptions.extra_credits, 0) + 1,
    updated_at = now()
  returning extra_credits into new_credits;

  return new_credits;
end;
$$;
