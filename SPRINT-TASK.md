# Sprint Task: Auth + Monetization for ratemyidea.ai

## PRODUCT SPEC

**Free tier:**
- 2 evaluations/day tracked by IP hash + date in Supabase (no login required)
- Full analysis shown — no locked fields
- Badge/tag shown on result based on score

**Share mechanic:**
- After evaluation, user can share with a referral link (?ref=TOKEN)
- When someone signs up via that link, original evaluator gets +1 evaluation credit

**Market Study ($49 one-time):**
- Already exists at /api/checkout and /api/study — keep as-is, do NOT break

**Pro tier ($9/month):**
- Unlimited basic evaluations
- Evaluation history (saved to Supabase)
- 5 strategic plans/month (30-day roadmap for their idea)
- Benchmark chart: see percentile vs all evaluated ideas in same category

---

## BADGE SYSTEM

After evaluation, show a badge on the score card based on overall score:
- 8.5+ = Genius (green)
- 7–8.4 = Sharp (blue)
- 5.5–6.9 = Visionary (yellow/orange)
- 4–5.4 = Seedling (gray)
- below 4 = The Dreamer (muted red)

Badge should appear on the share card too.

---

## AUTH — Supabase Auth

Add env vars as placeholders in .env.local (with clear comments):
```
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL_HERE
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

Install: npm install @supabase/supabase-js @supabase/ssr

Create src/lib/supabase/client.ts (browser client) and src/lib/supabase/server.ts (server client using service role).

Auth UI: simple modal with email/password sign up + sign in tabs. No OAuth needed.
Show auth modal when:
- User hits the 2/day limit
- User tries to access history or strategic plan without auth

IMPORTANT: App must work gracefully when Supabase env vars are missing (skip DB calls, allow unlimited free evals).

---

## SUPABASE SCHEMA

Create supabase/migrations/001_init.sql with:

```sql
create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  ip_hash text,
  idea_text text not null,
  idea_name text,
  overall_score float,
  category text,
  lang text default 'en',
  result_json jsonb,
  created_at timestamptz default now()
);

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

create table if not exists share_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  sharer_user_id uuid references auth.users(id) on delete cascade,
  evaluation_id uuid references evaluations(id) on delete set null,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz default now()
);

alter table evaluations enable row level security;
alter table user_subscriptions enable row level security;
alter table share_tokens enable row level security;

create policy "Users see own evaluations" on evaluations for select using (auth.uid() = user_id);
create policy "Users see own subscription" on user_subscriptions for select using (auth.uid() = user_id);
```

---

## RATE LIMITING in /api/rate/route.ts

At the top of the handler, before calling Claude:

1. Hash the IP with SHA-256 using node:crypto createHash
2. If Supabase is configured (env vars present):
   a. Check evaluations count for this ip_hash today (since midnight UTC)
   b. Check if user is authenticated + has pro plan -> skip limit
   c. Check extra_credits > 0 -> allow + decrement
   d. If count >= 2 -> return 429 with JSON: { error: 'limit_reached', message: 'You have used your 2 free evaluations today. Sign in or upgrade to continue.' }
3. After successful evaluation -> save to evaluations table (non-blocking, wrapped in try/catch)

---

## STRIPE PRO SUBSCRIPTION

Add env var placeholders to .env.local:
```
STRIPE_PRO_PRICE_ID=YOUR_PRO_PRICE_ID_HERE
STRIPE_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_HERE
```

Create src/app/api/stripe/subscribe/route.ts:
- POST: create Stripe Checkout Session for subscription using STRIPE_PRO_PRICE_ID
- Use existing STRIPE_SECRET_KEY from env
- success_url: BASE_URL/account?subscribed=true
- cancel_url: BASE_URL/

Create src/app/api/stripe/webhook/route.ts:
- Handle customer.subscription.created -> upsert user_subscriptions with plan='pro', status='active'
- Handle customer.subscription.deleted -> set plan='free'
- Handle invoice.payment_failed -> set status='past_due'
- Verify webhook signature with STRIPE_WEBHOOK_SECRET

---

## HISTORY PAGE

Create src/app/history/page.tsx:
- Server component, check Supabase auth session
- If not logged in -> redirect to /?auth=required
- Query evaluations for current user, ordered by created_at desc
- Show cards: idea name, overall score, badge, category, date
- Link back to home

---

## STRATEGIC PLAN API

Create src/app/api/strategic-plan/route.ts:
- POST, body: { ideaText, ideaName }
- Requires auth + pro plan
- Check strategic_plans_used < 5 for current month; reset if new month
- Call Claude to generate 30-day action plan broken into 4 weeks with specific tasks
- Increment strategic_plans_used in DB
- Return { plan: string }

---

## BENCHMARK API + COMPONENT

Create src/app/api/benchmark/route.ts:
- GET with query params: score and category
- Query evaluations: get all scores for same category
- Return: { percentile, totalInCategory, distribution: [{range, count}] }

Create src/components/BenchmarkChart.tsx:
- Simple bar chart using plain SVG (no extra deps like recharts)
- Shows score distribution with user's score highlighted
- Shows: "Your idea is in the top X% of [category] ideas evaluated"

---

## SHARE TOKENS

Create src/app/api/share/generate/route.ts:
- POST, body: { evaluationId }
- Generate random token using crypto.randomBytes(16).toString('hex')
- Save to share_tokens table (with sharer_user_id if logged in)
- Return { token, shareUrl }

Create src/app/api/share/redeem/route.ts:
- POST, body: { token }
- Requires auth
- Mark token as redeemed (set redeemed_by + redeemed_at)
- Add +1 extra_credits to sharer's user_subscriptions row

---

## UI CHANGES in HomeClient.tsx

1. Add AuthModal component (sign in / sign up tabs, email + password with Supabase Auth)
2. Nav header: show user email if logged in + "Pro" badge if subscribed, or "Sign In" button
3. When 429 limit hit: show AuthModal with upgrade messaging instead of plain error
4. Badge displayed prominently on score card above the score number
5. BenchmarkChart shown below results (fetch from /api/benchmark)
6. "Upgrade to Pro" CTA card below results for free users
7. History link in nav for logged-in users
8. Share: use /api/share/generate if user is logged in; otherwise use existing share behavior

---

## CONSTRAINTS

- Keep /api/checkout (Market Study $49) working — do NOT break
- Keep /api/study working — do NOT break
- TypeScript throughout, no any types
- Graceful degradation: if Supabase env vars missing, app works normally
- No new UI libraries (plain SVG for charts is fine)
- Clean production-ready code

---

## WHEN DONE

Run this exact command:
openclaw system event --text "ratemyidea sprint done: auth modal, rate limiting, Stripe Pro webhooks, history page, strategic plans, benchmark chart, badges, share tokens implemented. Phil needs to: 1) create Supabase project and add env vars 2) create Stripe Pro price and add STRIPE_PRO_PRICE_ID" --mode now
