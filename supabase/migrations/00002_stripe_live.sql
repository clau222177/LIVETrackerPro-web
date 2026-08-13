-- LIVETrackerPro web — Stripe LIVE: piani Base + Pro
-- Esegui questo file in Supabase SQL Editor (o via CLI: supabase db push)

-- ============================================================
-- PROFILES: coloane per lo stato abbonamento
-- ============================================================
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists is_premium boolean not null default false,
  add column if not exists plan_type text not null default 'free';

-- ============================================================
-- SUBSCRIPTIONS: piano "base" al posto di "agency"
-- ============================================================
alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table public.subscriptions
  add constraint subscriptions_plan_check
  check (plan in ('free', 'base', 'pro'));
