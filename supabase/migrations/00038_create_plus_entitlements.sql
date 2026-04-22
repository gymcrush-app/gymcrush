-- RevenueCat entitlements + event audit log
-- Consumed by supabase/functions/revenuecat-webhook/index.ts.

create table if not exists public.plus_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entitlement_id text not null default 'plus',
  product_id text,
  original_transaction_id text,
  period_type text,
  purchase_date timestamptz,
  expires_at timestamptz,
  will_renew boolean,
  unsubscribe_detected_at timestamptz,
  billing_issues_detected_at timestamptz,
  environment text check (environment in ('sandbox','production')),
  updated_at timestamptz not null default now()
);

create index if not exists plus_entitlements_expires_at_idx
  on public.plus_entitlements (expires_at);

create table if not exists public.revenuecat_events (
  id bigserial primary key,
  -- NOTE: deliberately no FK on user_id. Audit log must never reject events;
  -- RC TEST events use synthetic UUIDs, and real events may reference
  -- deleted users.
  user_id uuid,
  event_type text not null,
  event_id text unique,
  app_user_id text,
  environment text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index if not exists revenuecat_events_user_idx
  on public.revenuecat_events (user_id, received_at desc);

create index if not exists revenuecat_events_type_idx
  on public.revenuecat_events (event_type, received_at desc);

alter table public.plus_entitlements enable row level security;

drop policy if exists "own_entitlement_read" on public.plus_entitlements;
create policy "own_entitlement_read" on public.plus_entitlements
  for select using (auth.uid() = user_id);

alter table public.revenuecat_events enable row level security;
-- No select policy → service-role only; users never read the audit log.

-- Server-trusted gating helper. Client code calls useIsPlus() hook off
-- Zustand store, but any edge function or RPC that needs authoritative
-- state uses this instead of trusting a client claim.
create or replace function public.is_plus(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.plus_entitlements
    where user_id = uid
      and expires_at > now()
  );
$$;

grant execute on function public.is_plus(uuid) to authenticated, anon;
