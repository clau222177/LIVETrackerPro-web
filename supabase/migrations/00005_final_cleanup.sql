-- LIVETrackerPro web — Final cleanup: dedup subscriptions, unique user_id, riattiva RLS
-- Esegui in Supabase SQL Editor del progetto di PRODUZIONE

-- ============================================================
-- 1. Dedup subscriptions: tieni solo il rango più recente per user_id
-- ============================================================
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.subscriptions
)
delete from public.subscriptions
where id in (select id from ranked where rn > 1);

-- ============================================================
-- 2. Vincolo unico su subscriptions.user_id (se non esiste)
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_user_id_key' and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions add constraint subscriptions_user_id_key unique (user_id);
  end if;
end $$;

-- ============================================================
-- 3. Riattiva RLS in modo sicuro + policy complete
-- (policy insert/update servono anche a checkout e /api/plan,
--  che scrivono con sessione utente, non con service role)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own" on public.subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
