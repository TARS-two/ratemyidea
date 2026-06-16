-- AI provider usage/cost observability
-- Run this in Supabase SQL Editor, or apply with Supabase CLI when linked.

create table if not exists ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  model text not null,
  evaluation_id uuid references evaluations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12, 6),
  success boolean not null default true,
  status_code integer,
  latency_ms integer,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_logs_created_at on ai_usage_logs(created_at desc);
create index if not exists idx_ai_usage_logs_endpoint_created_at on ai_usage_logs(endpoint, created_at desc);
create index if not exists idx_ai_usage_logs_evaluation_id on ai_usage_logs(evaluation_id);
create index if not exists idx_ai_usage_logs_user_id on ai_usage_logs(user_id);

alter table ai_usage_logs enable row level security;

-- No public/client access policies: service-role inserts only. Query from Supabase dashboard or SQL editor.
